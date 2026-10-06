import mongoose from 'mongoose';
import { AppError } from '../../common/errors/app-error.js';
import { idOf, loadMedia, pick } from '../../common/utilities/media.js';
import { isPublished } from '../../common/utilities/publishing.js';
import { resolveSlug } from '../../common/utilities/slug.js';
import { termsOf } from '../../common/utilities/text.js';
import { resubmission } from '../ecosystems/access.service.js';
import { membershipsOf, syncRole } from '../ecosystems/ecosystems.service.js';
import { createNotification } from '../notifications/notifications.service.js';
import * as evaluations from '../evaluations/evaluations.service.js';
import * as opportunities from '../opportunities/opportunities.service.js';
import * as applications from '../applications/applications.service.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));

/** Indexed search words for an organization, maintained on every write that changes them. */
const orgSearchFields = (o) => ({
  searchTerms: termsOf(o.name, o.description, o.city, o.type),
  titleTerms: termsOf(o.name),
});

// ---- the organization itself ----------------------------------------------------

function orgView(o, membership) {
  return {
    id: String(o._id),
    name: o.name,
    slug: o.slug,
    type: o.type,
    website: o.website ?? null,
    description: o.description ?? null,
    city: o.city ?? null,
    contactEmail: o.contactEmail,
    status: o.status,
    statusNote: o.statusNote ?? null,
    submittedAt: o.submittedAt,
    reviewedAt: o.reviewedAt ?? null,
    membership: membership ? { role: membership.role } : null,
  };
}

export async function getMine(db, userId) {
  const [first] = await membershipsOf(db, userId);
  return first ? orgView(first.organization, first.membership) : null;
}

/** Organization onboarding: creates it PENDING verification, with the creator as OWNER. */
export async function create(db, userId, input) {
  if (await db.OrganizationMember.exists({ userId })) {
    throw new AppError('CONFLICT', 'You already belong to an organization on STUDLYF.');
  }
  const org = await db.Organization.create({
    ...input,
    slug: await resolveSlug(db.Organization, { from: input.name }),
    ...orgSearchFields(input),
    createdBy: userId,
    status: 'PENDING',
    submittedAt: new Date(),
  });
  await db.OrganizationMember.create({ organizationId: org._id, userId, role: 'OWNER' });
  return getMine(db, userId);
}

/** Owners/admins edit details. A rejected organization goes back to PENDING when resubmitted. */
export async function update(db, userId, patch) {
  const [first] = await membershipsOf(db, userId);
  if (!first) throw AppError.notFound('Organization');
  if (!ORG_PERMISSIONS.manageMembers.includes(first.membership.role)) throw AppError.forbidden('Only organization owners and admins can edit it.');
  const statusFields = resubmission(first.organization);
  const merged = { ...first.organization, ...patch };
  await db.Organization.updateOne(
    { _id: first.organization._id },
    { $set: { ...patch, ...statusFields, ...orgSearchFields(merged) } },
    { runValidators: true },
  );
  return getMine(db, userId);
}

/**
 * The public face of a verified organization (spec §82) plus the programs it has published.
 * Only ACTIVE organizations resolve — one that is pending, rejected or suspended must never be
 * publicly discoverable, so a caller sees the same 404 as for a slug that never existed.
 * The contact email is deliberately withheld: it is STUDLYF's verification channel, not a
 * public inbox, and publishing it would turn every verified org page into a spam target.
 */
export async function publicProfile(db, slug) {
  const org = await db.Organization.findOne({ slug, status: 'ACTIVE' }).lean();
  if (!org) throw AppError.notFound('Organization');
  const programs = { organizationId: org._id, ...isPublished() };
  const [rows, programCount, media] = await Promise.all([
    db.Opportunity.find(programs).sort({ publishedAt: -1, _id: -1 }).limit(12).lean(),
    db.Opportunity.countDocuments(programs),
    loadMedia(db, [org.logoId]),
  ]);
  return {
    id: String(org._id),
    name: org.name,
    slug: org.slug,
    type: org.type,
    website: org.website ?? null,
    description: org.description ?? null,
    city: org.city ?? null,
    logo: pick(media, org.logoId),
    verifiedAt: org.reviewedAt ?? null,
    joinedAt: org.createdAt,
    programCount,
    programs: await opportunities.toPublicList(db, rows),
  };
}

// ---- opportunities owned by the organization ------------------------------------------

async function ownedOpportunity(db, org, id) {
  const row = await db.Opportunity.findOne({ _id: id, organizationId: org._id }).select({ _id: 1 }).lean();
  if (!row) throw AppError.notFound('Opportunity'); // someone else's opportunity is simply not found
  return row;
}

async function orgOpportunityIds(db, org, opportunityId) {
  if (opportunityId) {
    await ownedOpportunity(db, org, opportunityId);
    return [oid(opportunityId)];
  }
  const rows = await db.Opportunity.find({ organizationId: org._id }).select({ _id: 1 }).lean();
  return rows.map((r) => r._id);
}

export async function listOpportunities(db, org, { type, page, pageSize }) {
  const filter = { organizationId: org._id };
  if (type) filter.type = type;
  const [rows, total] = await Promise.all([
    db.Opportunity.find(filter).sort({ updatedAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    db.Opportunity.countDocuments(filter),
  ]);
  const ids = rows.map((r) => r._id);
  const [apps, subs] = await Promise.all([
    db.Application.aggregate([{ $match: { opportunityId: { $in: ids }, status: { $ne: 'DRAFT' } } }, { $group: { _id: '$opportunityId', n: { $sum: 1 } } }]),
    db.ProjectSubmission.aggregate([{ $match: { opportunityId: { $in: ids }, status: { $nin: ['DRAFT', 'WITHDRAWN'] } } }, { $group: { _id: '$opportunityId', n: { $sum: 1 } } }]),
  ]);
  const appCount = new Map(apps.map((a) => [String(a._id), a.n]));
  const subCount = new Map(subs.map((a) => [String(a._id), a.n]));
  const items = await opportunities.toAdminList(db, rows);
  return {
    items: items.map((o) => ({ ...o, applications: appCount.get(o.id) ?? 0, submissions: subCount.get(o.id) ?? 0 })),
    total,
  };
}

export async function getOpportunity(db, org, id) {
  await ownedOpportunity(db, org, id);
  return opportunities.getAdmin(db, id);
}

export async function createOpportunity(db, org, userId, input) {
  const created = await opportunities.create(db, { ...input, organizationName: org.name, status: 'DRAFT' }, userId);
  await db.Opportunity.updateOne({ _id: created.id }, { $set: { organizationId: org._id, organizationLogoId: org.logoId ?? null } });
  return opportunities.getAdmin(db, created.id);
}

export async function updateOpportunity(db, org, userId, id, patch) {
  await ownedOpportunity(db, org, id);
  return opportunities.update(db, id, patch, userId);
}

export async function setPublished(db, org, userId, id, published) {
  await ownedOpportunity(db, org, id);
  return opportunities.setPublished(db, id, published, userId);
}

// ---- participants (applications) ------------------------------------------------------

async function oppTitles(db, ids) {
  const rows = await db.Opportunity.find({ _id: { $in: ids } }).select({ title: 1, slug: 1, type: 1 }).lean();
  return new Map(rows.map((o) => [String(o._id), { id: String(o._id), title: o.title, slug: o.slug, type: o.type }]));
}

export async function listParticipants(db, org, { opportunityId, status, page, pageSize }) {
  const ids = await orgOpportunityIds(db, org, opportunityId);
  const filter = { opportunityId: { $in: ids }, status: status ?? { $ne: 'DRAFT' } };
  const [rows, total] = await Promise.all([
    db.Application.find(filter).sort({ submittedAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    db.Application.countDocuments(filter),
  ]);
  const [users, profiles, opps] = await Promise.all([
    db.User.find({ _id: { $in: rows.map((r) => r.builderUserId) } }).select({ name: 1, email: 1 }).lean(),
    db.BuilderProfile.find({ _id: { $in: rows.map((r) => r.builderProfileId) } }).select({ username: 1, headline: 1, visibility: 1 }).lean(),
    oppTitles(db, [...new Set(rows.map((r) => String(r.opportunityId)))]),
  ]);
  const userMap = new Map(users.map((u) => [String(u._id), u]));
  const profileMap = new Map(profiles.map((p) => [String(p._id), p]));
  return {
    items: rows.map((a) => {
      const u = userMap.get(String(a.builderUserId));
      const p = profileMap.get(String(a.builderProfileId));
      return {
        id: String(a._id),
        status: a.status,
        submittedAt: a.submittedAt ?? null,
        reviewerNote: a.reviewerNote ?? null,
        opportunity: opps.get(String(a.opportunityId)) ?? null,
        builder: {
          name: u?.name ?? null,
          email: u?.email ?? null,
          username: p?.visibility === 'PUBLIC' ? p.username : null,
          headline: p?.headline ?? null,
        },
      };
    }),
    total,
  };
}

/** Organizers review applications to their own opportunities (same transitions + notifications as admins). */
export async function reviewParticipant(db, org, userId, id, body) {
  const app = await db.Application.findById(id).select({ opportunityId: 1 }).lean();
  if (!app) throw AppError.notFound('Application');
  await ownedOpportunity(db, org, app.opportunityId);
  const { application } = await applications.review(db, id, userId, body);
  return application;
}

// ---- project submissions, evaluations, rankings, certificates ------------------------------

export async function listSubmissions(db, org, { opportunityId, status, page, pageSize }) {
  const ids = await orgOpportunityIds(db, org, opportunityId);
  const filter = { opportunityId: { $in: ids }, status: status ?? { $nin: ['DRAFT'] } };
  const [rows, total] = await Promise.all([
    db.ProjectSubmission.find(filter).sort({ submittedAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    db.ProjectSubmission.countDocuments(filter),
  ]);
  const [opps, evals] = await Promise.all([
    oppTitles(db, [...new Set(rows.map((r) => String(r.opportunityId)))]),
    db.Evaluation.aggregate([
      { $match: { submissionId: { $in: rows.map((r) => r._id) } } },
      { $group: { _id: '$submissionId', assigned: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } } } },
    ]),
  ]);
  const evalMap = new Map(evals.map((e) => [String(e._id), e]));
  return {
    items: rows.map((s) => ({
      id: String(s._id),
      status: s.status,
      submittedAt: s.submittedAt ?? null,
      opportunity: opps.get(String(s.opportunityId)) ?? null,
      project: {
        id: idOf(s.projectId),
        title: s.projectSnapshot?.title ?? null,
        tagline: s.projectSnapshot?.tagline ?? null,
        technologies: s.projectSnapshot?.technologies ?? [],
        links: s.projectSnapshot?.links ?? {},
        teamName: s.projectSnapshot?.teamName ?? null,
        team: (s.projectSnapshot?.team ?? []).map((m) => ({ name: m.name, username: m.username, role: m.role })),
      },
      evaluations: { assigned: evalMap.get(String(s._id))?.assigned ?? 0, completed: evalMap.get(String(s._id))?.completed ?? 0 },
    })),
    total,
  };
}

export async function listEvaluations(db, org, { opportunityId, status, page, pageSize }) {
  const ids = await orgOpportunityIds(db, org, opportunityId);
  const filter = { opportunityId: { $in: ids } };
  if (status) filter.status = status;
  const [rows, total] = await Promise.all([
    db.Evaluation.find(filter).sort({ updatedAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    db.Evaluation.countDocuments(filter),
  ]);
  const [opps, evaluators, subs] = await Promise.all([
    oppTitles(db, [...new Set(rows.map((r) => String(r.opportunityId)))]),
    db.User.find({ _id: { $in: rows.map((r) => r.evaluatorId) } }).select({ name: 1 }).lean(),
    db.ProjectSubmission.find({ _id: { $in: rows.map((r) => r.submissionId) } }).select({ 'projectSnapshot.title': 1 }).lean(),
  ]);
  const evaluatorName = new Map(evaluators.map((u) => [String(u._id), u.name]));
  const titleOf = new Map(subs.map((s) => [String(s._id), s.projectSnapshot?.title ?? null]));
  return {
    // Organizers see status and totals; evaluators' private notes never leave the evaluation.
    items: rows.map((e) => ({
      id: String(e._id),
      status: e.status,
      template: e.templateName,
      evaluator: evaluatorName.get(String(e.evaluatorId)) ?? null,
      opportunity: opps.get(String(e.opportunityId)) ?? null,
      project: titleOf.get(String(e.submissionId)) ?? null,
      overallScore: e.status === 'COMPLETED' ? e.overallScore : null,
      assignedAt: e.assignedAt,
      completedAt: e.completedAt ?? null,
    })),
    total,
  };
}

/** Rank each opportunity's submissions by their average completed evaluation score. */
export async function rankings(db, org, { opportunityId }) {
  const ids = await orgOpportunityIds(db, org, opportunityId);
  const rows = await db.Evaluation.aggregate([
    { $match: { opportunityId: { $in: ids }, status: 'COMPLETED' } },
    { $group: { _id: { submissionId: '$submissionId', opportunityId: '$opportunityId' }, average: { $avg: '$overallScore' }, evaluations: { $sum: 1 } } },
    { $sort: { '_id.opportunityId': 1, average: -1 } },
  ]);
  const [opps, subs] = await Promise.all([
    oppTitles(db, [...new Set(rows.map((r) => String(r._id.opportunityId)))]),
    db.ProjectSubmission.find({ _id: { $in: rows.map((r) => r._id.submissionId) } }).select({ status: 1, projectSnapshot: 1 }).lean(),
  ]);
  const subMap = new Map(subs.map((s) => [String(s._id), s]));
  const groups = new Map();
  for (const r of rows) {
    const key = String(r._id.opportunityId);
    const list = groups.get(key) ?? [];
    const s = subMap.get(String(r._id.submissionId));
    list.push({
      rank: list.length + 1,
      submissionId: String(r._id.submissionId),
      status: s?.status ?? null,
      project: s?.projectSnapshot?.title ?? null,
      teamName: s?.projectSnapshot?.teamName ?? null,
      team: (s?.projectSnapshot?.team ?? []).map((m) => m.name).filter(Boolean),
      averageScore: Math.round(r.average * 100) / 100,
      evaluations: r.evaluations,
    });
    groups.set(key, list);
  }
  return [...groups.entries()].map(([id, entries]) => ({ opportunity: opps.get(id) ?? null, entries }));
}

export async function dashboard(db, org) {
  const ids = await orgOpportunityIds(db, org);
  const [published, drafts, hackathons, participants, submissions, evaluationsDone, certificatesIssued, recent] = await Promise.all([
    db.Opportunity.countDocuments({ organizationId: org._id, status: 'PUBLISHED' }),
    db.Opportunity.countDocuments({ organizationId: org._id, status: 'DRAFT' }),
    db.Opportunity.countDocuments({ organizationId: org._id, type: 'HACKATHON' }),
    db.Application.countDocuments({ opportunityId: { $in: ids }, status: { $ne: 'DRAFT' } }),
    db.ProjectSubmission.countDocuments({ opportunityId: { $in: ids }, status: { $nin: ['DRAFT', 'WITHDRAWN'] } }),
    db.Evaluation.countDocuments({ opportunityId: { $in: ids }, status: 'COMPLETED' }),
    // The certificates this organization actually issued — not the achievements minted from them.
    db.Certificate.countDocuments({ organizationId: org._id, status: 'ACTIVE' }),
    listOpportunities(db, org, { page: 1, pageSize: 4 }),
  ]);
  return {
    organization: orgView(org),
    counts: { published, drafts, hackathons, participants, submissions, evaluationsCompleted: evaluationsDone, certificates: certificatesIssued },
    recentOpportunities: recent.items,
  };
}

// ---- members & roles -----------------------------------------------------------------

/** What each organization role may do. VIEWER and EVALUATOR are read-only for org operations. */
export const ORG_PERMISSIONS = {
  manageMembers: ['OWNER', 'ADMIN'],
  managePrograms: ['OWNER', 'ADMIN', 'ORGANIZER'],
};

export function assertOrgRole(membership, permission) {
  if (!ORG_PERMISSIONS[permission].includes(membership.role)) {
    const what = permission === 'manageMembers' ? 'manage members' : 'manage programs';
    throw AppError.forbidden(`Your organization role (${membership.role.toLowerCase()}) can’t ${what}.`);
  }
}

function memberView(m, user) {
  return {
    id: String(m._id),
    role: m.role,
    addedAt: m.createdAt,
    user: user ? { id: String(user._id), name: user.name, email: user.email } : null,
  };
}

export async function listMembers(db, org) {
  const members = await db.OrganizationMember.find({ organizationId: org._id }).sort({ createdAt: 1 }).lean();
  const users = await db.User.find({ _id: { $in: members.map((m) => m.userId) } }).select({ name: 1, email: 1 }).lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));
  return members.map((m) => memberView(m, byId.get(String(m.userId))));
}

async function grantMemberRoles(db, userId, role, active, actorId) {
  if (active) await syncRole(db, userId, 'ORGANIZER', true, actorId);
  // Organization evaluators score submissions in the STUDLYF evaluator workspace.
  if (role === 'EVALUATOR') await syncRole(db, userId, 'EVALUATOR', true, actorId);
}

export async function addMember(db, org, actorId, { email, role }) {
  if (role === 'OWNER') throw AppError.validation([{ field: 'role', message: 'An organization has exactly one owner.' }]);
  const user = await db.User.findOne({ email, status: 'ACTIVE' }).select({ name: 1, email: 1 }).lean();
  if (!user) throw AppError.validation([{ field: 'email', message: 'No active STUDLYF account uses that email — ask them to sign up first.' }]);
  if (await db.OrganizationMember.exists({ userId: user._id })) {
    throw new AppError('CONFLICT', 'That person already belongs to an organization on STUDLYF.');
  }
  const m = await db.OrganizationMember.create({ organizationId: org._id, userId: user._id, role, addedBy: actorId });
  await grantMemberRoles(db, user._id, role, org.status === 'ACTIVE', actorId);
  await createNotification(db, {
    userId: user._id,
    type: 'ORGANIZATION_MEMBER',
    title: `You were added to ${org.name} as ${role.toLowerCase()}`,
    body: 'Open the organization dashboard from the ecosystem switcher.',
    data: { organizationId: String(org._id), role, path: '/organizations/dashboard' },
  });
  return memberView(m.toObject(), user);
}

export async function updateMember(db, org, actorId, id, { role }) {
  const m = await db.OrganizationMember.findOne({ _id: id, organizationId: org._id }).lean();
  if (!m) throw AppError.notFound('Member');
  if (m.role === 'OWNER' || role === 'OWNER') throw new AppError('CONFLICT', 'Ownership can’t be changed here.');
  await db.OrganizationMember.updateOne({ _id: id }, { $set: { role } });
  await grantMemberRoles(db, m.userId, role, org.status === 'ACTIVE', actorId);
  const user = await db.User.findById(m.userId).select({ name: 1, email: 1 }).lean();
  return memberView({ ...m, role }, user);
}

/** Owners/admins remove members; any member may leave. The owner can't be removed. */
export async function removeMember(db, org, membership, actorId, id) {
  const m = await db.OrganizationMember.findOne({ _id: id, organizationId: org._id }).lean();
  if (!m) throw AppError.notFound('Member');
  const self = String(m.userId) === String(actorId);
  if (!self) assertOrgRole(membership, 'manageMembers');
  if (m.role === 'OWNER') throw new AppError('CONFLICT', 'The owner can’t leave or be removed.');
  await db.OrganizationMember.deleteOne({ _id: id });
  await syncRole(db, m.userId, 'ORGANIZER', false, actorId);
  return { id };
}

// ---- teams, winners, evaluators, analytics ------------------------------------------

export async function listTeams(db, org, { opportunityId, page, pageSize }) {
  const ids = await orgOpportunityIds(db, org, opportunityId);
  const filter = { opportunityId: { $in: ids }, status: { $nin: ['DRAFT', 'WITHDRAWN'] } };
  const [rows, total] = await Promise.all([
    db.ProjectSubmission.find(filter).sort({ submittedAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    db.ProjectSubmission.countDocuments(filter),
  ]);
  const opps = await oppTitles(db, [...new Set(rows.map((r) => String(r.opportunityId)))]);
  return {
    items: rows.map((s) => ({
      submissionId: String(s._id),
      status: s.status,
      teamName: s.projectSnapshot?.teamName ?? s.projectSnapshot?.title ?? null,
      project: s.projectSnapshot?.title ?? null,
      opportunity: opps.get(String(s.opportunityId)) ?? null,
      members: (s.projectSnapshot?.team ?? []).map((m) => ({ name: m.name, username: m.username, role: m.role })),
    })),
    total,
  };
}

/** Finalists (shortlisted) and winners (selected) per opportunity — projects and direct applicants. */
export async function winners(db, org) {
  const ids = await orgOpportunityIds(db, org);
  const [subs, apps] = await Promise.all([
    db.ProjectSubmission.find({ opportunityId: { $in: ids }, status: { $in: ['SHORTLISTED', 'SELECTED'] } }).lean(),
    db.Application.find({ opportunityId: { $in: ids }, status: { $in: ['SHORTLISTED', 'SELECTED'] } }).lean(),
  ]);
  const users = await db.User.find({ _id: { $in: apps.map((a) => a.builderUserId) } }).select({ name: 1 }).lean();
  const nameOf = new Map(users.map((u) => [String(u._id), u.name]));
  const opps = await oppTitles(db, [...new Set([...subs, ...apps].map((r) => String(r.opportunityId)))]);
  const groups = new Map();
  const bucket = (oppId) => {
    if (!groups.has(oppId)) groups.set(oppId, { opportunity: opps.get(oppId) ?? null, winners: [], finalists: [] });
    return groups.get(oppId);
  };
  for (const s of subs) {
    bucket(String(s.opportunityId))[s.status === 'SELECTED' ? 'winners' : 'finalists'].push({
      kind: 'PROJECT',
      name: s.projectSnapshot?.title ?? null,
      team: (s.projectSnapshot?.team ?? []).map((m) => m.name).filter(Boolean),
    });
  }
  for (const a of apps) {
    bucket(String(a.opportunityId))[a.status === 'SELECTED' ? 'winners' : 'finalists'].push({
      kind: 'PARTICIPANT',
      name: nameOf.get(String(a.builderUserId)) ?? null,
      team: [],
    });
  }
  return [...groups.values()];
}

export async function listEvaluators(db, org) {
  const members = await db.OrganizationMember.find({ organizationId: org._id, role: 'EVALUATOR' }).lean();
  const ids = await orgOpportunityIds(db, org);
  const [users, load] = await Promise.all([
    db.User.find({ _id: { $in: members.map((m) => m.userId) } }).select({ name: 1, email: 1 }).lean(),
    db.Evaluation.aggregate([
      { $match: { opportunityId: { $in: ids }, evaluatorId: { $in: members.map((m) => m.userId) } } },
      { $group: { _id: '$evaluatorId', assigned: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } } } },
    ]),
  ]);
  const loadOf = new Map(load.map((l) => [String(l._id), l]));
  return users.map((u) => ({
    userId: String(u._id),
    name: u.name,
    email: u.email,
    assigned: loadOf.get(String(u._id))?.assigned ?? 0,
    completed: loadOf.get(String(u._id))?.completed ?? 0,
  }));
}

/** Assign one of the organization's own evaluators to a submission on one of its opportunities. */
export async function assignEvaluator(deps, org, actorId, submissionId, { evaluatorUserId, templateId }) {
  const { db } = deps;
  const submission = await db.ProjectSubmission.findById(submissionId).select({ opportunityId: 1 }).lean();
  if (!submission) throw AppError.notFound('Submission');
  await ownedOpportunity(db, org, submission.opportunityId);
  const member = await db.OrganizationMember.exists({ organizationId: org._id, userId: evaluatorUserId, role: 'EVALUATOR' });
  if (!member) throw AppError.validation([{ field: 'evaluatorUserId', message: 'Pick one of your organization’s evaluators.' }]);
  return evaluations.assign(deps, actorId, submissionId, { evaluatorUserId, templateId });
}

export async function analytics(db, org) {
  const rows = await db.Opportunity.find({ organizationId: org._id }).select({ title: 1, slug: 1, type: 1, status: 1 }).sort({ createdAt: -1 }).lean();
  const ids = rows.map((r) => r._id);
  const count = (model, match) =>
    model.aggregate([{ $match: { opportunityId: { $in: ids }, ...match } }, { $group: { _id: '$opportunityId', n: { $sum: 1 } } }]);
  const [apps, subs, evals, selected] = await Promise.all([
    count(db.Application, { status: { $ne: 'DRAFT' } }),
    count(db.ProjectSubmission, { status: { $nin: ['DRAFT', 'WITHDRAWN'] } }),
    count(db.Evaluation, { status: 'COMPLETED' }),
    count(db.ProjectSubmission, { status: 'SELECTED' }),
  ]);
  const toMap = (r) => new Map(r.map((x) => [String(x._id), x.n]));
  const [a, s, e, w] = [apps, subs, evals, selected].map(toMap);
  return rows.map((o) => {
    const k = String(o._id);
    return {
      opportunity: { id: k, title: o.title, slug: o.slug, type: o.type, status: o.status },
      participants: a.get(k) ?? 0,
      submissions: s.get(k) ?? 0,
      evaluationsCompleted: e.get(k) ?? 0,
      winners: w.get(k) ?? 0,
    };
  });
}
