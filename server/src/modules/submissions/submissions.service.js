import { AppError } from '../../common/errors/app-error.js';
import { idOf } from '../../common/utilities/media.js';
import { prefixSearchFilter } from '../../common/utilities/text.js';
import { notifyMany } from '../notifications/notifications.service.js';
import { issueToTeam } from '../achievements/achievements.service.js';
import { isActiveAdmin, isLinkViewable, loadProjectFor, loadViewableProject } from '../projects/access.js';
import { advanceProjectStatus } from '../projects/status.js';
import { publishIssues } from '../projects/readiness.js';
import { hydrateProjects, oppMini, personOf, toCard } from '../projects/projects.hydrate.js';
import { builderCanSee, evaluatorNames, toBuilderView } from '../evaluations/evaluations.views.js';


/** Builder-side: the team can withdraw anything not yet decided. */
const BUILDER_WITHDRAWABLE = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED'];
/** Organiser/admin review moves, keyed by the current status (mirrors Phase 2 applications). */
const ADMIN_TRANSITIONS = {
  SUBMITTED: ['UNDER_REVIEW', 'SHORTLISTED', 'SELECTED', 'REJECTED'],
  UNDER_REVIEW: ['SHORTLISTED', 'SELECTED', 'REJECTED'],
  SHORTLISTED: ['SELECTED', 'REJECTED'],
};
const ADMIN_STATUSES = ['UNDER_REVIEW', 'SHORTLISTED', 'SELECTED', 'REJECTED'];
const COMPETITIVE = ['HACKATHON', 'COMPETITION', 'CHALLENGE'];

export const submissionDeadline = (opp) =>
  opp?.submissionSettings?.deadline ?? opp?.applicationDeadline ?? opp?.endDate ?? null;

export function requirementsOf(opp) {
  const s = opp?.submissionSettings ?? {};
  return {
    acceptsProjects: !!s.acceptsProjects,
    deadline: submissionDeadline(opp),
    guidelines: s.guidelines ?? null,
    requireRepository: !!s.requireRepository,
    requireDemo: !!s.requireDemo,
    requireVideo: !!s.requireVideo,
    requirePublished: !!s.requirePublished,
    minTeamSize: s.minTeamSize ?? null,
    maxTeamSize: s.maxTeamSize ?? null,
  };
}

/** Everything that stops `project` from being entered into `opp` right now. Empty = eligible. */
export function eligibilityIssues(project, opp, teamSize, now = new Date()) {
  const issues = [];
  const req = requirementsOf(opp);
  if (!req.acceptsProjects) issues.push({ field: 'opportunityId', message: 'This opportunity doesn’t accept project submissions.' });
  if (req.deadline && new Date(req.deadline) < now) {
    issues.push({ field: 'opportunityId', message: 'Submissions for this opportunity have closed.' });
  }
  if (project.status === 'ARCHIVED') {
    issues.push({ field: 'project', message: 'Archived projects can’t be submitted — restore the project first.' });
  }
  if (['REJECTED', 'HIDDEN'].includes(project.moderationStatus)) {
    issues.push({ field: 'project', message: 'This project was hidden by moderators and can’t be submitted.' });
  }
  issues.push(...publishIssues(project, 'submitting'));
  const links = project.links ?? {};
  if (req.requireRepository && !links.repo) {
    issues.push({ field: 'links.repo', message: 'This opportunity requires a repository (GitHub) link.' });
  }
  if (req.requireDemo && !links.demo && !links.website) {
    issues.push({ field: 'links.demo', message: 'This opportunity requires a live demo link.' });
  }
  if (req.requireVideo && !links.video) issues.push({ field: 'links.video', message: 'This opportunity requires a demo video link.' });
  if (req.requirePublished && !isLinkViewable(project)) {
    issues.push({ field: 'visibility', message: 'This opportunity only accepts published projects — publish yours first.' });
  }
  if (req.minTeamSize && teamSize < req.minTeamSize) {
    issues.push({ field: 'team', message: `This opportunity needs a team of at least ${req.minTeamSize} (you have ${teamSize}).` });
  }
  if (req.maxTeamSize && teamSize > req.maxTeamSize) {
    issues.push({ field: 'team', message: `Teams can have at most ${req.maxTeamSize} members (you have ${teamSize}).` });
  }
  return issues;
}

async function loadOpenOpportunity(db, opportunityId) {
  const opp = await db.Opportunity.findById(opportunityId).lean();
  if (!opp || opp.status !== 'PUBLISHED' || !opp.publishedAt || new Date(opp.publishedAt) > new Date()) {
    throw AppError.notFound('Opportunity');
  }
  return opp;
}

const activeTeamSize = (db, projectId) => db.ProjectMember.countDocuments({ projectId, status: 'ACTIVE' });

async function activeTeamIds(db, projectId) {
  const rows = await db.ProjectMember.find({ projectId, status: 'ACTIVE' }).select({ userId: 1 }).lean();
  return rows.map((r) => r.userId);
}

/** Freeze the project as submitted — evaluators always score what was actually entered. */
export async function buildSnapshot(db, project) {
  const members = await db.ProjectMember.find({ projectId: project._id, status: 'ACTIVE' }).sort({ createdAt: 1, _id: 1 }).lean();
  const ids = members.map((m) => m.userId);
  const [users, profiles] = await Promise.all([
    db.User.find({ _id: { $in: ids } }).select({ name: 1 }).lean(),
    db.BuilderProfile.find({ userId: { $in: ids } }).select({ userId: 1, username: 1 }).lean(),
  ]);
  const nameOf = new Map(users.map((u) => [String(u._id), u.name]));
  const unameOf = new Map(profiles.map((p) => [String(p.userId), p.username]));
  return {
    title: project.title,
    tagline: project.tagline ?? null,
    description: project.description ?? null,
    problemStatement: project.problemStatement ?? null,
    solution: project.solution ?? null,
    impact: project.impact ?? null,
    category: project.category,
    projectType: project.projectType,
    technologies: project.technologies ?? [],
    skills: (project.skills ?? []).map((s) => ({ slug: s.slug, name: s.name })),
    links: project.links ?? {},
    coverImageId: project.coverImageId ?? null,
    media: (project.media ?? []).map(({ assetId, kind, caption }) => ({ assetId, kind, caption: caption ?? null })),
    teamName: project.teamName ?? null,
    team: members.map((m) => ({
      userId: m.userId,
      name: nameOf.get(String(m.userId)) ?? null,
      username: unameOf.get(String(m.userId)) ?? null,
      role: m.role,
    })),
    capturedAt: new Date(),
  };
}

// ---- side effects -------------------------------------------------------------------------

async function onSubmitted(db, submission, project, opp) {
  await advanceProjectStatus(db, project._id, 'SUBMITTED');
  await notifyMany(db, await activeTeamIds(db, project._id), {
    type: 'PROJECT_SUBMITTED',
    title: `“${project.title}” was submitted to ${opp.title}`,
    body: 'Track its review from My submissions.',
    data: { submissionId: String(submission._id), projectId: String(project._id), opportunityId: String(opp._id) },
    dedupeKey: `SUBMITTED:${submission._id}:${(submission.statusHistory ?? []).length}`,
  });
  if (COMPETITIVE.includes(opp.type)) {
    // Achievement text names the opportunity only — never a (possibly private) project title.
    await issueToTeam(db, project._id, {
      type: opp.type === 'HACKATHON' ? 'HACKATHON_PARTICIPATION' : 'COMPETITION',
      title: `${opp.type === 'HACKATHON' ? 'Participated in' : 'Competed in'} ${opp.title}`,
      description: `Entered a project into ${opp.title}.`,
      issuer: opp.organizationName,
      opportunityId: opp._id,
      submissionId: submission._id,
      date: submission.submittedAt ?? new Date(),
      sourceKey: `PARTICIPATION:${submission._id}`,
    });
  }
}

const STATUS_WORDS = {
  UNDER_REVIEW: 'is now under review',
  SHORTLISTED: 'was shortlisted',
  SELECTED: 'was selected',
  REJECTED: 'was not selected',
};

async function onReviewed(db, submission, project, opp, status, reviewerNote) {
  await advanceProjectStatus(db, project._id, 'UNDER_REVIEW');
  await notifyMany(db, await activeTeamIds(db, project._id), {
    type: 'SUBMISSION_STATUS',
    title: `“${project.title}” ${STATUS_WORDS[status]} for ${opp.title}`,
    body: reviewerNote ?? null,
    data: { submissionId: String(submission._id), projectId: String(project._id), opportunityId: String(opp._id), status },
    dedupeKey: `SUBMISSION_STATUS:${submission._id}:${status}`,
  });
  const base = {
    issuer: opp.organizationName,
    opportunityId: opp._id,
    submissionId: submission._id,
    date: new Date(),
  };
  if (status === 'SHORTLISTED') {
    await issueToTeam(db, project._id, {
      ...base,
      type: 'SHORTLISTED',
      title: `Shortlisted — ${opp.title}`,
      description: `Shortlisted by ${opp.organizationName}.`,
      sourceKey: `SHORTLISTED:${submission._id}`,
    });
  }
  if (status === 'SELECTED') {
    const winner = COMPETITIVE.includes(opp.type);
    await issueToTeam(db, project._id, {
      ...base,
      type: winner ? 'WINNER' : 'OTHER',
      title: `${winner ? 'Winner' : 'Selected'} — ${opp.title}`,
      description: `Selected by ${opp.organizationName}.`,
      sourceKey: `SELECTED:${submission._id}`,
    });
  }
}

/** Assigning the first evaluator starts the review: SUBMITTED → UNDER_REVIEW (with history + notifications). */
export async function startReview(db, submission, actorId) {
  if (submission.status !== 'SUBMITTED') return;
  const now = new Date();
  const { modifiedCount } = await db.ProjectSubmission.updateOne(
    { _id: submission._id, status: 'SUBMITTED' },
    {
      $set: { status: 'UNDER_REVIEW' },
      $push: { statusHistory: { status: 'UNDER_REVIEW', at: now, byUserId: actorId, note: null } },
    },
  );
  if (!modifiedCount) return;
  const [project, opp] = await Promise.all([
    db.Project.findById(submission.projectId).lean(),
    db.Opportunity.findById(submission.opportunityId).lean(),
  ]);
  if (project && opp) await onReviewed(db, submission, project, opp, 'UNDER_REVIEW', null);
}

// ---- builder actions ---------------------------------------------------------------------------

/** The pre-submission review screen: opportunity requirements, the project, the team, blockers. */
export async function checkEligibility(db, userId, projectId, opportunityId) {
  const { project } = await loadProjectFor(db, projectId, userId, 'canEdit');
  const opp = await loadOpenOpportunity(db, opportunityId);
  const [teamSize, existing, h] = await Promise.all([
    activeTeamSize(db, project._id),
    db.ProjectSubmission.findOne({ projectId: project._id, opportunityId: opp._id }).lean(),
    hydrateProjects(db, [project]),
  ]);
  const issues = eligibilityIssues(project, opp, teamSize);
  if (existing && !['DRAFT', 'WITHDRAWN'].includes(existing.status)) {
    issues.unshift({ field: 'opportunityId', message: 'This project has already been submitted to this opportunity.' });
  }
  return {
    eligible: issues.length === 0,
    issues,
    opportunity: { ...oppMini(opp), eligibility: opp.eligibility ?? null, requirements: requirementsOf(opp) },
    project: toCard(project, h),
    team: (h.membersByProject.get(String(project._id)) ?? []).map((m) => ({ role: m.role, user: personOf(h, m.userId) })),
    existingSubmission: existing ? { id: String(existing._id), status: existing.status } : null,
  };
}

/** Opportunities currently accepting project submissions (for the "Submit to opportunity" picker). */
export async function openOpportunities(db) {
  const now = new Date();
  const rows = await db.Opportunity.find({
    status: 'PUBLISHED',
    publishedAt: { $ne: null, $lte: now },
    'submissionSettings.acceptsProjects': true,
  })
    .select({ title: 1, slug: 1, type: 1, organizationName: 1, applicationDeadline: 1, endDate: 1, submissionSettings: 1, shortDescription: 1 })
    .sort({ applicationDeadline: 1, _id: 1 })
    .lean();
  return rows
    .filter((o) => {
      const deadline = submissionDeadline(o);
      return !deadline || new Date(deadline) >= now;
    })
    .map((o) => ({ ...oppMini(o), shortDescription: o.shortDescription, requirements: requirementsOf(o) }));
}

export async function create(db, userId, projectId, { opportunityId, note, submit }) {
  const { project } = await loadProjectFor(db, projectId, userId, 'canEdit');
  const opp = await loadOpenOpportunity(db, opportunityId);
  const existing = await db.ProjectSubmission.findOne({ projectId: project._id, opportunityId: opp._id }).lean();
  if (existing && existing.status !== 'WITHDRAWN') {
    throw new AppError(
      'CONFLICT',
      existing.status === 'DRAFT'
        ? 'You already have a draft submission for this opportunity — finish that one instead.'
        : 'This project has already been submitted to this opportunity.',
    );
  }
  const issues = eligibilityIssues(project, opp, await activeTeamSize(db, project._id));
  // Drafts only need the opportunity to be open for projects; submitting needs everything.
  const blocking = submit ? issues : issues.filter((i) => i.field === 'opportunityId');
  if (blocking.length) {
    throw AppError.validation(blocking, submit ? 'This project doesn’t meet the opportunity’s requirements yet.' : blocking[0].message);
  }

  const now = new Date();
  const status = submit ? 'SUBMITTED' : 'DRAFT';
  const event = { status, at: now, byUserId: userId, note: null };
  const snapshot = submit ? await buildSnapshot(db, project) : null;
  let id;
  if (existing) {
    await db.ProjectSubmission.updateOne(
      { _id: existing._id },
      {
        $set: {
          status,
          note: note ?? existing.note ?? null,
          submittedBy: userId,
          withdrawnAt: null,
          ...(submit ? { submittedAt: now, projectSnapshot: snapshot } : {}),
        },
        $push: { statusHistory: event },
      },
    );
    id = existing._id;
  } else {
    try {
      const doc = await db.ProjectSubmission.create({
        projectId: project._id,
        opportunityId: opp._id,
        submittedBy: userId,
        status,
        note: note ?? null,
        statusHistory: [event],
        projectSnapshot: snapshot,
        submittedAt: submit ? now : null,
      });
      id = doc._id;
    } catch (err) {
      if (err?.code === 11000) throw new AppError('CONFLICT', 'This project has already been submitted to this opportunity.');
      throw err;
    }
  }
  const submission = await db.ProjectSubmission.findById(id).lean();
  if (submit) await onSubmitted(db, submission, project, opp);
  return { submission, project, opportunity: opp };
}

async function loadForCaller(db, userId, id) {
  const submission = await db.ProjectSubmission.findById(id).lean();
  if (!submission) throw AppError.notFound('Submission');
  const [project, isAdmin, membership] = await Promise.all([
    db.Project.findById(submission.projectId).lean(),
    isActiveAdmin(db, userId),
    db.ProjectMember.findOne({ projectId: submission.projectId, userId, status: 'ACTIVE' }).lean(),
  ]);
  const isTeam = !!membership;
  if (!isAdmin && !isTeam) throw AppError.notFound('Submission');
  return { submission, project, isAdmin, isTeam, teamCanEdit: !!membership?.canEdit || membership?.role === 'OWNER' };
}

/**
 * One PATCH, role-aware:
 *   team (canEdit) — submit a draft / re-submit a withdrawn one, withdraw, edit a draft's note
 *   admin          — review moves (UNDER_REVIEW → SHORTLISTED → SELECTED | REJECTED) + reviewer note
 */
export async function update(db, userId, id, patch) {
  const { submission, project, isAdmin, isTeam, teamCanEdit } = await loadForCaller(db, userId, id);
  const opp = await db.Opportunity.findById(submission.opportunityId).lean();
  const { status, note, reviewerNote } = patch;
  const now = new Date();

  if (status && ADMIN_STATUSES.includes(status)) {
    if (!isAdmin) throw AppError.forbidden('Only organisers can change a submission’s review status.');
    const allowed = ADMIN_TRANSITIONS[submission.status] ?? [];
    if (!allowed.includes(status)) {
      throw new AppError('CONFLICT', `A submission can’t move from ${submission.status} to ${status}.`);
    }
    await db.ProjectSubmission.updateOne(
      { _id: submission._id },
      {
        $set: { status, ...(reviewerNote !== undefined ? { reviewerNote } : {}) },
        $push: { statusHistory: { status, at: now, byUserId: userId, note: reviewerNote ?? null } },
      },
    );
    await onReviewed(db, submission, project, opp, status, reviewerNote);
    return { submission: await db.ProjectSubmission.findById(id).lean(), action: 'review', from: submission.status, to: status };
  }

  if (status === 'SUBMITTED' || status === 'WITHDRAWN' || note !== undefined) {
    if (!isTeam || !teamCanEdit) throw AppError.forbidden('You don’t have permission to change this submission.');
  }

  if (status === 'SUBMITTED') {
    if (!['DRAFT', 'WITHDRAWN'].includes(submission.status)) {
      throw new AppError('CONFLICT', 'This project has already been submitted to this opportunity.');
    }
    const issues = eligibilityIssues(project, opp, await activeTeamSize(db, project._id));
    if (issues.length) throw AppError.validation(issues, 'This project doesn’t meet the opportunity’s requirements yet.');
    await db.ProjectSubmission.updateOne(
      { _id: submission._id },
      {
        $set: {
          status: 'SUBMITTED',
          submittedAt: now,
          withdrawnAt: null,
          submittedBy: userId,
          projectSnapshot: await buildSnapshot(db, project),
          ...(note !== undefined ? { note } : {}),
        },
        $push: { statusHistory: { status: 'SUBMITTED', at: now, byUserId: userId, note: null } },
      },
    );
    const fresh = await db.ProjectSubmission.findById(id).lean();
    await onSubmitted(db, fresh, project, opp);
    return { submission: fresh, action: 'submit', from: submission.status, to: 'SUBMITTED' };
  }

  if (status === 'WITHDRAWN') {
    if (!BUILDER_WITHDRAWABLE.includes(submission.status)) {
      throw new AppError('CONFLICT', `A ${submission.status.toLowerCase().replace('_', ' ')} submission can’t be withdrawn.`);
    }
    await db.ProjectSubmission.updateOne(
      { _id: submission._id },
      {
        $set: { status: 'WITHDRAWN', withdrawnAt: now },
        $push: { statusHistory: { status: 'WITHDRAWN', at: now, byUserId: userId, note: null } },
      },
    );
    // Evaluators shouldn't keep reviewing withdrawn work; completed evaluations are history and stay.
    await db.Evaluation.deleteMany({ submissionId: submission._id, status: { $ne: 'COMPLETED' } });
    return { submission: await db.ProjectSubmission.findById(id).lean(), action: 'withdraw', from: submission.status, to: 'WITHDRAWN' };
  }

  if (status) throw new AppError('BAD_REQUEST', `You can’t set a submission to ${status}.`);

  const set = {};
  if (note !== undefined) {
    if (submission.status !== 'DRAFT') throw new AppError('CONFLICT', 'The note can only be edited while the submission is a draft.');
    set.note = note;
  }
  if (reviewerNote !== undefined) {
    if (!isAdmin) throw AppError.forbidden('Only organisers can write a reviewer note.');
    set.reviewerNote = reviewerNote;
  }
  if (Object.keys(set).length) await db.ProjectSubmission.updateOne({ _id: submission._id }, { $set: set });
  return { submission: await db.ProjectSubmission.findById(id).lean(), action: 'edit' };
}

// ---- reads -----------------------------------------------------------------------------------

/**
 * Evaluation progress per submission. `audience: 'builder'` averages only scores the team is
 * allowed to see; admins see every completed score.
 */
async function evaluationSummaries(db, submissionIds, audience) {
  if (!submissionIds.length) return new Map();
  const rows = await db.Evaluation.find({ submissionId: { $in: submissionIds } })
    .select({ submissionId: 1, status: 1, overallScore: 1, scoreVisibility: 1 })
    .lean();
  const out = new Map();
  for (const ev of rows) {
    const key = String(ev.submissionId);
    const s = out.get(key) ?? { assigned: 0, inProgress: 0, completed: 0, scores: [] };
    if (ev.status === 'ASSIGNED') s.assigned += 1;
    if (ev.status === 'IN_PROGRESS') s.inProgress += 1;
    if (ev.status === 'COMPLETED') {
      s.completed += 1;
      if (audience === 'admin' || ev.scoreVisibility !== 'INTERNAL') s.scores.push(ev.overallScore);
    }
    out.set(key, s);
  }
  for (const [key, s] of out) {
    const total = s.assigned + s.inProgress + s.completed;
    out.set(key, {
      total,
      completed: s.completed,
      status: total === 0 ? 'NOT_STARTED' : s.completed === total ? 'COMPLETED' : s.completed || s.inProgress ? 'IN_PROGRESS' : 'ASSIGNED',
      averageScore: s.scores.length ? Math.round((s.scores.reduce((a, b) => a + b, 0) / s.scores.length) * 100) / 100 : null,
    });
  }
  return out;
}

const NO_EVALUATION = { total: 0, completed: 0, status: 'NOT_STARTED', averageScore: null };

async function listItems(db, rows, audience) {
  const projects = await db.Project.find({ _id: { $in: rows.map((r) => r.projectId) } }).lean();
  const h = await hydrateProjects(db, projects);
  const opps = await db.Opportunity.find({ _id: { $in: rows.map((r) => r.opportunityId) } })
    .select({ title: 1, slug: 1, type: 1, organizationName: 1, applicationDeadline: 1, endDate: 1, submissionSettings: 1 })
    .lean();
  const projectMap = new Map(projects.map((p) => [String(p._id), p]));
  const oppMap = new Map(opps.map((o) => [String(o._id), o]));
  const evals = await evaluationSummaries(db, rows.map((r) => r._id), audience);
  return rows.map((s) => {
    const project = projectMap.get(idOf(s.projectId));
    return {
      id: String(s._id),
      status: s.status,
      opportunity: oppMini(oppMap.get(idOf(s.opportunityId))),
      project: project ? toCard(project, h) : null,
      submittedAt: s.submittedAt ?? null,
      updatedAt: s.updatedAt,
      evaluation: evals.get(String(s._id)) ?? NO_EVALUATION,
    };
  });
}

/** "My submissions": every submission of a project the caller is an active team member of. */
export async function listMine(db, userId, { status, page, pageSize }) {
  const memberships = await db.ProjectMember.find({ userId, status: 'ACTIVE' }).select({ projectId: 1 }).lean();
  const filter = { projectId: { $in: memberships.map((m) => m.projectId) } };
  if (status) filter.status = status;
  const [rows, total] = await Promise.all([
    db.ProjectSubmission.find(filter).sort({ updatedAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    db.ProjectSubmission.countDocuments(filter),
  ]);
  return { items: await listItems(db, rows, 'builder'), total };
}

export async function listForProject(db, userId, projectId) {
  const { project, access } = await loadViewableProject(db, projectId, userId);
  if (!access.seesPrivate) throw AppError.notFound('Project');
  const rows = await db.ProjectSubmission.find({ projectId: project._id }).sort({ updatedAt: -1 }).lean();
  return listItems(db, rows, access.isAdmin && !access.isMember ? 'admin' : 'builder');
}

/** Submission tracking page (team) — or the admin's view of it. */
export async function get(db, userId, id) {
  const { submission, project, isAdmin, isTeam, teamCanEdit } = await loadForCaller(db, userId, id);
  const [item] = await listItems(db, [submission], isTeam ? 'builder' : 'admin');
  const opp = await db.Opportunity.findById(submission.opportunityId).lean();
  const evaluations = await db.Evaluation.find({ submissionId: submission._id, status: 'COMPLETED' }).sort({ completedAt: -1 }).lean();
  const visible = isTeam ? evaluations.filter(builderCanSee) : evaluations;
  const names = await evaluatorNames(db, visible);
  return {
    ...item,
    note: submission.note ?? null,
    reviewerNote: submission.reviewerNote ?? null,
    withdrawnAt: submission.withdrawnAt ?? null,
    createdAt: submission.createdAt,
    opportunity: { ...item.opportunity, requirements: requirementsOf(opp) },
    // Only stages that actually happened, in order.
    timeline: (submission.statusHistory ?? []).map((e) => ({ status: e.status, at: e.at, note: e.note ?? null })),
    evaluations: visible.map((ev) =>
      toBuilderView(ev, { opportunity: item.opportunity, evaluatorName: names.get(idOf(ev.evaluatorId)) }),
    ),
    permissions: {
      canSubmit: isTeam && teamCanEdit && ['DRAFT', 'WITHDRAWN'].includes(submission.status),
      canWithdraw: isTeam && teamCanEdit && BUILDER_WITHDRAWABLE.includes(submission.status),
      canEditNote: isTeam && teamCanEdit && submission.status === 'DRAFT',
      canReview: isAdmin,
      nextStatuses: isAdmin ? (ADMIN_TRANSITIONS[submission.status] ?? []) : [],
    },
    projectArchived: project?.status === 'ARCHIVED',
  };
}

// ---- admin ------------------------------------------------------------------------------------

export async function adminList(db, { opportunityId, status, q, unassigned, page, pageSize }) {
  const filter = {};
  if (opportunityId) filter.opportunityId = opportunityId;
  if (status) filter.status = status;
  const search = prefixSearchFilter(q);
  if (search) {
    const matches = await db.Project.find(search).select({ _id: 1 }).limit(2000).lean();
    filter.projectId = { $in: matches.map((p) => p._id) };
  }
  if (unassigned) {
    const assigned = await db.Evaluation.distinct('submissionId');
    filter._id = { $nin: assigned };
  }
  const [rows, total] = await Promise.all([
    db.ProjectSubmission.find(filter).sort({ updatedAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    db.ProjectSubmission.countDocuments(filter),
  ]);
  const items = await listItems(db, rows, 'admin');
  return {
    items: items.map((it, i) => ({ ...it, nextStatuses: ADMIN_TRANSITIONS[rows[i].status] ?? [] })),
    total,
  };
}

export async function listForOpportunity(db, opportunityId, query) {
  const opp = await db.Opportunity.exists({ _id: opportunityId });
  if (!opp) throw AppError.notFound('Opportunity');
  return adminList(db, { ...query, opportunityId });
}

