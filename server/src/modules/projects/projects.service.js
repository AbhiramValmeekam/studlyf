import mongoose from 'mongoose';
import { AppError } from '../../common/errors/app-error.js';
import { idOf } from '../../common/utilities/media.js';
import { pagedList } from '../../common/utilities/listing.js';
import { resolveSlug } from '../../common/utilities/slug.js';
import { escapeRegex, prefixSearchFilter, sanitizeRichText, searchTokens, termsOf } from '../../common/utilities/text.js';
import * as skillsRepo from '../skills/skills.repository.js';
import { forProject as achievementsForProject, issueProjectCompleted } from '../achievements/achievements.service.js';
import { evaluationsForProject } from '../evaluations/evaluations.views.js';
import { discoverableFilter, isDiscoverable, loadProjectFor, loadViewableProject } from './access.js';
import { PARTICIPATING, hydrateProjects, toCard, toDetail } from './projects.hydrate.js';
import { publishIssues } from './readiness.js';
import { builderStatusChange, publishStatus, unpublishStatus } from './status.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));

// ---- helpers --------------------------------------------------------------------

/** Community tag facets derived from technology names ("Node.js" → "node.js", "React Native" → "react-native"). */
export function tagsFromTechnologies(technologies) {
  const out = [];
  for (const t of technologies ?? []) {
    const slug = String(t)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9+#.-]/g, '')
      .replace(/^[^a-z0-9]+/, '')
      .slice(0, 24);
    if (slug && !out.includes(slug)) out.push(slug);
  }
  return out.slice(0, 20);
}

/** Indexed words: everything a visitor might search for, including the builder behind it. */
export function projectSearchFields(p, owner) {
  return {
    searchTerms: termsOf(
      p.title,
      p.tagline,
      p.description,
      p.problemStatement,
      p.solution,
      p.impact,
      p.category,
      p.projectType,
      p.teamName,
      ...(p.technologies ?? []),
      ...(p.skills ?? []).map((s) => s.name),
      owner?.username,
      owner?.name,
    ),
    titleTerms: termsOf(p.title, p.tagline),
  };
}

async function ownerInfo(db, userId) {
  const [user, profile] = await Promise.all([
    db.User.findById(userId).select({ name: 1 }).lean(),
    db.BuilderProfile.findOne({ userId }).select({ username: 1 }).lean(),
  ]);
  return { name: user?.name ?? null, username: profile?.username ?? null, profileId: profile?._id ?? null };
}

async function requireBuilderProfile(db, userId) {
  const profile = await db.BuilderProfile.findOne({ userId }).select({ _id: 1, username: 1 }).lean();
  if (!profile) throw new AppError('BAD_REQUEST', 'Create your builder profile before adding projects.');
  return profile;
}

/** Validate skill slugs against the active Skill vocabulary and embed copies. */
export async function resolveSkills(db, slugs) {
  if (!slugs?.length) return [];
  const found = await skillsRepo.findActiveBySlugs(db, slugs);
  const bySlug = new Map(found.map((s) => [s.slug, s]));
  const unknown = slugs.filter((s) => !bySlug.has(s));
  if (unknown.length) {
    throw AppError.validation(unknown.map((s) => ({ field: 'skills', message: `Unknown skill: ${s}` })));
  }
  return slugs.map((s) => ({ skillId: bySlug.get(s)._id, slug: s, name: bySlug.get(s).name }));
}

/**
 * Files attached to a project must be files the caller uploaded (or ones already on this
 * project, e.g. a teammate editing around the owner's thumbnail), of the right type.
 */
export async function assertAssetsUsable(db, userId, project, { coverImageId, media }) {
  const already = new Set(
    [idOf(project?.coverImageId), ...(project?.media ?? []).map((m) => idOf(m.assetId))].filter(Boolean),
  );
  const wanted = [];
  if (coverImageId) wanted.push({ id: coverImageId, kind: 'COVER', field: 'coverImageId' });
  (media ?? []).forEach((m, i) => wanted.push({ id: m.assetId, kind: m.kind, field: `media.${i}.assetId` }));
  if (!wanted.length) return;

  const assets = await db.MediaAsset.find({ _id: { $in: wanted.map((w) => w.id) } })
    .select({ uploadedBy: 1, mimeType: 1 })
    .lean();
  const byId = new Map(assets.map((a) => [String(a._id), a]));
  const errors = [];
  for (const w of wanted) {
    const a = byId.get(String(w.id));
    if (!a) {
      errors.push({ field: w.field, message: 'Unknown file' });
      continue;
    }
    if (!already.has(String(w.id)) && String(a.uploadedBy) !== String(userId)) {
      errors.push({ field: w.field, message: 'You can only attach files you uploaded' });
      continue;
    }
    const isImage = a.mimeType?.startsWith('image/');
    if ((w.kind === 'COVER' || w.kind === 'SCREENSHOT') && !isImage) errors.push({ field: w.field, message: 'Must be an image' });
    if (w.kind === 'DOCUMENT' && a.mimeType !== 'application/pdf') errors.push({ field: w.field, message: 'Must be a PDF document' });
  }
  if (errors.length) throw AppError.validation(errors);
}

const linksOut = (l) => ({ repo: l?.repo ?? null, demo: l?.demo ?? null, video: l?.video ?? null, website: l?.website ?? null });

// ---- reads ------------------------------------------------------------------------

/** Full project page for whoever is asking (404 when they may not see it). */
export async function getProject(deps, idOrSlug, viewerUserId) {
  const { db, config } = deps;
  const { project, access } = await loadViewableProject(db, idOrSlug, viewerUserId);
  const [h, upvoted, achievements, evaluations] = await Promise.all([
    hydrateProjects(db, [project], { includeInvited: access.seesPrivate, withSubmissions: true }),
    viewerUserId ? db.ProjectUpvote.exists({ projectId: project._id, userId: viewerUserId }) : null,
    achievementsForProject(db, project._id),
    evaluationsForProject(db, project._id, { team: access.isMember || access.isAdmin }),
  ]);
  return { ...toDetail(config, project, h, access, { upvoted: !!upvoted }), achievements, evaluations };
}

async function cards(db, rows, { own = false } = {}) {
  const h = await hydrateProjects(db, rows, { withSubmissions: own });
  return rows.map((r) => toCard(r, h, { own }));
}

/** "My projects": everything the caller owns or is an active team member of. */
export async function listMine(db, userId, query) {
  const { q, status, visibility, role, page, pageSize } = query;
  const memberships = await db.ProjectMember.find({ userId, status: 'ACTIVE' }).select({ projectId: 1, role: 1 }).lean();
  const ids = memberships
    .filter((m) => (role === 'OWNER' ? m.role === 'OWNER' : role === 'MEMBER' ? m.role !== 'OWNER' : true))
    .map((m) => oid(m.projectId));
  const match = { _id: { $in: ids } };
  if (status) match.status = status;
  if (visibility) match.visibility = visibility;
  const search = prefixSearchFilter(q);
  if (search) Object.assign(match, search);
  const { rows, total } = await pagedList(db.Project, { match, sort: { updatedAt: -1 }, page, pageSize });
  return { items: await cards(db, rows, { own: true }), total };
}

/** Pending team invitations for the caller. */
export async function listInvitations(db, userId) {
  const invites = await db.ProjectMember.find({ userId, status: 'INVITED' }).sort({ createdAt: -1 }).lean();
  if (!invites.length) return [];
  const projects = await db.Project.find({ _id: { $in: invites.map((i) => i.projectId) } }).lean();
  const h = await hydrateProjects(db, projects);
  const byId = new Map(projects.map((p) => [String(p._id), p]));
  const inviters = await db.User.find({ _id: { $in: invites.map((i) => i.invitedBy).filter(Boolean) } }).select({ name: 1 }).lean();
  const inviterMap = new Map(inviters.map((u) => [String(u._id), u.name]));
  return invites
    .filter((i) => byId.has(String(i.projectId)))
    .map((i) => ({
      memberId: String(i._id),
      role: i.role,
      canEdit: i.canEdit,
      invitedAt: i.createdAt,
      invitedBy: inviterMap.get(idOf(i.invitedBy)) ?? null,
      project: toCard(byId.get(String(i.projectId)), h),
    }));
}

/**
 * Public discovery. Only PUBLIC, published, non-archived, non-moderated projects — ever.
 * Deterministic relevance: title/tagline word matches first, then newest.
 */
export async function discover(db, query) {
  const { q, category, projectType, status, skill, technology, opportunity, builder, location, sort, page, pageSize } = query;
  const and = [discoverableFilter()];
  const search = prefixSearchFilter(q);
  if (search) and.push(search);
  if (category) and.push({ category });
  if (projectType) and.push({ projectType });
  if (status) and.push({ status });
  if (skill) and.push({ $or: [{ 'skills.slug': skill }, { tags: skill }] });
  if (technology) and.push({ tags: tagsFromTechnologies([technology])[0] ?? technology });

  if (opportunity) {
    const opp = /^[a-f0-9]{24}$/i.test(opportunity)
      ? await db.Opportunity.findById(opportunity).select({ _id: 1 }).lean()
      : await db.Opportunity.findOne({ slug: opportunity }).select({ _id: 1 }).lean();
    const subs = opp
      ? await db.ProjectSubmission.find({ opportunityId: opp._id, status: { $in: PARTICIPATING } }).select({ projectId: 1 }).lean()
      : [];
    and.push({ _id: { $in: subs.map((s) => oid(s.projectId)) } });
  }
  if (builder) {
    const profile = await db.BuilderProfile.findOne({ username: builder }).select({ userId: 1 }).lean();
    const memberOf = profile
      ? await db.ProjectMember.find({ userId: profile.userId, status: 'ACTIVE' }).select({ projectId: 1 }).lean()
      : [];
    and.push({ _id: { $in: memberOf.map((m) => oid(m.projectId)) } });
  }
  if (location) {
    const users = await db.User.find({ 'profile.city': { $regex: `^${escapeRegex(location)}`, $options: 'i' } })
      .select({ _id: 1 })
      .limit(2000)
      .lean();
    and.push({ authorUserId: { $in: users.map((u) => u._id) } });
  }

  const hasQuery = searchTokens(q).length > 0;
  const effective = sort ?? (hasQuery ? 'relevance' : 'newest');
  const sortSpec =
    effective === 'relevance' && hasQuery
      ? { rankQuery: q, sort: { _rank: -1, publishedAt: -1 } }
      : effective === 'updated'
        ? { sort: { updatedAt: -1 } }
        : { sort: { publishedAt: -1 } };

  const { rows, total } = await pagedList(db.Project, { match: { $and: and }, page, pageSize, ...sortSpec });
  return { items: await cards(db, rows), total };
}

/**
 * A builder's public portfolio: their featured projects (in their chosen order) plus every
 * discoverable project they own or built as a team member.
 */
export async function publicPortfolio(db, username) {
  const profile = await db.BuilderProfile.findOne({ username, visibility: 'PUBLIC' })
    .select({ userId: 1, featuredProjectIds: 1 })
    .lean();
  if (!profile) throw AppError.notFound('Builder profile');
  const memberships = await db.ProjectMember.find({ userId: profile.userId, status: 'ACTIVE' }).select({ projectId: 1 }).lean();
  const rows = await db.Project.find({ _id: { $in: memberships.map((m) => m.projectId) }, ...discoverableFilter() })
    .sort({ publishedAt: -1 })
    .limit(60)
    .lean();
  const all = await cards(db, rows);
  const byId = new Map(all.map((c) => [c.id, c]));
  const featured = (profile.featuredProjectIds ?? []).map((id) => byId.get(String(id))).filter(Boolean);
  return { featured, projects: all };
}

// ---- writes -----------------------------------------------------------------------------

/** Create = save a draft. The creator becomes OWNER automatically. */
export async function create(deps, userId, input) {
  const { db } = deps;
  const profile = await requireBuilderProfile(db, userId);
  const owner = await ownerInfo(db, userId);
  const { skills, technologies, media, coverImageId, description, status, links, ...rest } = input;
  await assertAssetsUsable(db, userId, null, { coverImageId, media });
  const now = new Date();
  const base = {
    ...rest,
    description: description ? sanitizeRichText(description) : null,
    technologies: technologies ?? [],
    tags: tagsFromTechnologies(technologies ?? []),
    skills: await resolveSkills(db, skills),
    coverImageId: coverImageId ?? null,
    media: media ?? [],
    links: { ...linksOut(null), ...(links ?? {}) },
    authorUserId: userId,
    authorProfileId: profile._id,
    status: status ?? 'DRAFT',
    completedAt: status === 'COMPLETED' ? now : null,
    visibility: 'PRIVATE',
  };
  const doc = await db.Project.create({
    ...base,
    slug: await resolveSlug(db.Project, { from: input.title }),
    ...projectSearchFields(base, owner),
  });
  await db.ProjectMember.create({ projectId: doc._id, userId, role: 'OWNER', status: 'ACTIVE', canEdit: true, joinedAt: now });
  return { project: doc.toObject(), detail: await getProject(deps, String(doc._id), userId) };
}

export async function update(deps, userId, id, patch) {
  const { db } = deps;
  const { project, access } = await loadProjectFor(db, id, userId, 'canEdit');
  const { skills, technologies, media, coverImageId, description, status, visibility, links, ...rest } = patch;

  if (visibility !== undefined && visibility !== project.visibility) {
    if (!access.canManage) throw AppError.forbidden('Only the project owner can change who sees it.');
    if (visibility !== 'PRIVATE') {
      throw new AppError('BAD_REQUEST', 'Use the publish action to make a project public or unlisted.');
    }
  }
  await assertAssetsUsable(db, userId, project, { coverImageId, media });

  const set = { ...rest };
  if (description !== undefined) set.description = description ? sanitizeRichText(description) : null;
  if (technologies !== undefined) {
    set.technologies = technologies;
    set.tags = tagsFromTechnologies(technologies);
  }
  if (skills !== undefined) set.skills = await resolveSkills(db, skills);
  if (media !== undefined) set.media = media;
  if (coverImageId !== undefined) set.coverImageId = coverImageId ?? null;
  if (links !== undefined) set.links = { ...linksOut(project.links), ...links };
  if (status !== undefined) Object.assign(set, builderStatusChange(project, status));
  if (visibility === 'PRIVATE' && project.visibility !== 'PRIVATE') {
    set.visibility = 'PRIVATE';
    set.status = unpublishStatus({ ...project, ...set });
  }

  const merged = { ...project, ...set };
  if (merged.startDate && merged.endDate && new Date(merged.endDate) < new Date(merged.startDate)) {
    throw AppError.validation([{ field: 'endDate', message: 'End date must be on or after the start date' }]);
  }
  // A project that is out in the world must stay publishable (spec: no incomplete public projects).
  if (merged.visibility !== 'PRIVATE' && merged.publishedAt) {
    const issues = publishIssues(merged);
    if (issues.length) {
      throw AppError.validation(issues, 'Published projects must keep their required information — make the project private first.');
    }
  }

  Object.assign(set, projectSearchFields(merged, await ownerInfo(db, project.authorUserId)));
  await db.Project.updateOne({ _id: project._id }, { $set: set }, { runValidators: true });
  if (set.completedAt) await issueProjectCompleted(db, merged);
  return { project: merged, changes: Object.keys(patch), detail: await getProject(deps, String(project._id), userId) };
}

/** Validated publish: PUBLIC (listed) or UNLISTED (link only). Owner only. */
export async function publish(deps, userId, id, { visibility }) {
  const { db } = deps;
  const { project } = await loadProjectFor(db, id, userId, 'canManage');
  if (['REJECTED', 'HIDDEN'].includes(project.moderationStatus)) {
    throw new AppError(
      'CONFLICT',
      `This project was hidden by moderators and can’t be published${project.moderationReason ? `: ${project.moderationReason}` : '.'}`,
    );
  }
  const issues = publishIssues(project);
  if (issues.length) throw AppError.validation(issues, 'This project is not ready to be published.');

  const set = {
    visibility,
    publishedAt: project.publishedAt ?? new Date(),
    status: publishStatus(project),
    archivedAt: null,
  };
  await db.Project.updateOne({ _id: project._id }, { $set: set });
  await issueProjectCompleted(db, { ...project, ...set });
  return { project: { ...project, ...set }, detail: await getProject(deps, String(project._id), userId) };
}

export async function archive(deps, userId, id) {
  const { db } = deps;
  const { project } = await loadProjectFor(db, id, userId, 'canManage');
  if (project.status !== 'ARCHIVED') {
    await db.Project.updateOne({ _id: project._id }, { $set: { status: 'ARCHIVED', archivedAt: new Date() } });
  }
  return { project, detail: await getProject(deps, String(project._id), userId) };
}

/** Copy a project into a new private draft owned by the caller (no team, submissions or votes). */
export async function duplicate(deps, userId, id) {
  const { db } = deps;
  const { project } = await loadProjectFor(db, id, userId, 'canEdit');
  const profile = await requireBuilderProfile(db, userId);
  const owner = await ownerInfo(db, userId);
  const copy = {
    title: `${project.title} (copy)`.slice(0, 120),
    tagline: project.tagline,
    description: project.description,
    problemStatement: project.problemStatement,
    solution: project.solution,
    impact: project.impact,
    category: project.category,
    projectType: project.projectType,
    technologies: project.technologies ?? [],
    tags: project.tags ?? [],
    skills: project.skills ?? [],
    coverImageId: project.coverImageId,
    media: (project.media ?? []).map(({ assetId, kind, caption }) => ({ assetId, kind, caption })),
    links: linksOut(project.links),
    teamName: null,
    startDate: project.startDate,
    endDate: project.endDate,
    authorUserId: userId,
    authorProfileId: profile._id,
    status: 'DRAFT',
    visibility: 'PRIVATE',
  };
  const doc = await db.Project.create({ ...copy, slug: await resolveSlug(db.Project, { from: copy.title }), ...projectSearchFields(copy, owner) });
  await db.ProjectMember.create({ projectId: doc._id, userId, role: 'OWNER', status: 'ACTIVE', canEdit: true, joinedAt: new Date() });
  return { project: doc.toObject(), source: project, detail: await getProject(deps, String(doc._id), userId) };
}

/**
 * Delete (owner only). A project that has been entered into an opportunity keeps its record —
 * those must be archived instead, so submissions and evaluations stay intact.
 */
export async function remove(deps, userId, id) {
  const { db } = deps;
  const { project } = await loadProjectFor(db, id, userId, 'canManage');
  return removeCascade(db, project);
}

export async function removeCascade(db, project) {
  const live = await db.ProjectSubmission.exists({ projectId: project._id, status: { $nin: ['DRAFT', 'WITHDRAWN'] } });
  if (live) {
    throw new AppError(
      'CONFLICT',
      'This project has been submitted to an opportunity — archive it instead so the submission record stays intact.',
    );
  }
  await Promise.all([
    db.Project.deleteOne({ _id: project._id }),
    db.ProjectMember.deleteMany({ projectId: project._id }),
    db.ProjectUpvote.deleteMany({ projectId: project._id }),
    db.ProjectReport.deleteMany({ projectId: project._id }),
    db.ProjectSubmission.deleteMany({ projectId: project._id }),
    db.Achievement.deleteMany({ projectId: project._id, type: 'PROJECT_COMPLETED', source: 'SYSTEM' }),
    db.BuilderProfile.updateMany({ featuredProjectIds: project._id }, { $pull: { featuredProjectIds: project._id } }),
  ]);
  return { id: String(project._id), slug: project.slug, title: project.title };
}

// ---- featured projects on the builder profile ----------------------------------------------

/** Replace the ordered featured list (feature / unfeature / reorder in one call). */
export async function setFeatured(deps, userId, projectIds) {
  const { db, config } = deps;
  const profile = await db.BuilderProfile.findOne({ userId }).select({ _id: 1 }).lean();
  if (!profile) throw AppError.notFound('Builder profile');
  const ids = [...new Set(projectIds)];
  const limit = config.projects.featuredLimit;
  if (ids.length > limit) {
    throw AppError.validation([{ field: 'projectIds', message: `You can feature up to ${limit} projects` }]);
  }
  const [projects, memberships] = await Promise.all([
    db.Project.find({ _id: { $in: ids } }).lean(),
    db.ProjectMember.find({ userId, projectId: { $in: ids }, status: 'ACTIVE' }).select({ projectId: 1 }).lean(),
  ]);
  const byId = new Map(projects.map((p) => [String(p._id), p]));
  const mine = new Set(memberships.map((m) => String(m.projectId)));
  const errors = [];
  ids.forEach((pid, i) => {
    const p = byId.get(pid);
    if (!p || !mine.has(pid)) errors.push({ field: `projectIds.${i}`, message: 'You can only feature your own or your team’s projects' });
    else if (!isDiscoverable(p)) errors.push({ field: `projectIds.${i}`, message: `“${p.title}” must be public before it can be featured` });
  });
  if (errors.length) throw AppError.validation(errors);
  await db.BuilderProfile.updateOne({ _id: profile._id }, { $set: { featuredProjectIds: ids.map(oid) } });
  return { featuredProjectIds: ids, limit };
}
