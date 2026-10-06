import { AppError } from '../../common/errors/app-error.js';
import { idOf } from '../../common/utilities/media.js';
import { prefixSearchFilter } from '../../common/utilities/text.js';
import { createNotification } from '../notifications/notifications.service.js';
import { loadViewableProject } from './access.js';
import { hydrateProjects, oppMini, personOf } from './projects.hydrate.js';
import { publishIssues } from './readiness.js';
import { removeCascade } from './projects.service.js';

// ---- reports (any signed-in user) ------------------------------------------------------

export async function report(db, userId, id, { reason, details }) {
  const { project } = await loadViewableProject(db, id, userId);
  if (String(project.authorUserId) === String(userId)) throw new AppError('BAD_REQUEST', 'You can’t report your own project.');
  try {
    await db.ProjectReport.create({ projectId: project._id, reporterUserId: userId, reason, details: details ?? null });
  } catch (err) {
    if (err?.code === 11000) throw new AppError('CONFLICT', 'You’ve already reported this project — our moderators will take a look.');
    throw err;
  }
  await db.Project.updateOne({ _id: project._id }, { $inc: { reportCount: 1 } });
  return { project, reported: true };
}

// ---- admin ------------------------------------------------------------------------------

function toAdmin(row, h) {
  return {
    id: String(row._id),
    slug: row.slug,
    title: row.title,
    tagline: row.tagline ?? null,
    category: row.category,
    projectType: row.projectType,
    tags: row.tags ?? [],
    technologies: row.technologies ?? [],
    upvoteCount: row.upvoteCount ?? 0,
    status: row.status,
    visibility: row.visibility,
    featured: row.featured,
    moderationStatus: row.moderationStatus,
    moderationReason: row.moderationReason ?? null,
    moderatedAt: row.moderatedAt ?? null,
    reportCount: row.reportCount ?? 0,
    authorUserId: idOf(row.authorUserId),
    owner: personOf(h, row.authorUserId),
    teamSize: (h.membersByProject.get(String(row._id)) ?? []).length,
    ready: publishIssues(row).length === 0,
    publishedAt: row.publishedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listAdmin(db, { q, status, visibility, moderationStatus, projectType, category, reported, page, pageSize }) {
  const filter = {};
  if (status) filter.status = status;
  if (visibility) filter.visibility = visibility;
  if (moderationStatus) filter.moderationStatus = moderationStatus;
  if (projectType) filter.projectType = projectType;
  if (category) filter.category = category;
  if (reported) filter.reportCount = { $gt: 0 };
  const search = prefixSearchFilter(q);
  if (search) Object.assign(filter, search);
  const sort = reported ? { reportCount: -1, updatedAt: -1, _id: -1 } : { createdAt: -1, _id: -1 };
  const [rows, total] = await Promise.all([
    db.Project.find(filter).sort(sort).skip((page - 1) * pageSize).limit(pageSize).lean(),
    db.Project.countDocuments(filter),
  ]);
  const h = await hydrateProjects(db, rows);
  return { items: rows.map((r) => toAdmin(r, h)), total };
}

export async function getAdmin(db, id) {
  const row = await db.Project.findById(id).lean();
  if (!row) throw AppError.notFound('Project');
  const h = await hydrateProjects(db, [row], { includeInvited: true, withSubmissions: true });
  const reports = await db.ProjectReport.find({ projectId: row._id }).sort({ createdAt: -1 }).lean();
  const reporters = await db.User.find({ _id: { $in: reports.map((r) => r.reporterUserId) } }).select({ name: 1, email: 1 }).lean();
  const reporterMap = new Map(reporters.map((u) => [String(u._id), u]));
  return {
    ...toAdmin(row, h),
    description: row.description ?? null,
    links: row.links ?? {},
    issues: publishIssues(row),
    team: (h.membersByProject.get(String(row._id)) ?? []).map((m) => ({
      id: String(m._id),
      role: m.role,
      status: m.status,
      user: personOf(h, m.userId),
    })),
    submissions: (h.submissionsByProject.get(String(row._id)) ?? []).map((s) => ({
      id: String(s._id),
      status: s.status,
      opportunity: oppMini(h.oppMap.get(idOf(s.opportunityId))),
      submittedAt: s.submittedAt ?? null,
    })),
    reports: reports.map((r) => ({
      id: String(r._id),
      reason: r.reason,
      details: r.details ?? null,
      status: r.status,
      reporter: { name: reporterMap.get(String(r.reporterUserId))?.name ?? null, email: reporterMap.get(String(r.reporterUserId))?.email ?? null },
      createdAt: r.createdAt,
    })),
  };
}

/**
 * Set the moderation outcome. APPROVED/PENDING keep the project visible; REJECTED/HIDDEN take it
 * out of discovery and public pages (the team and admins still see it). Open reports are
 * resolved, and the owner is told why when their project is taken down.
 */
export async function moderate(db, adminId, id, { moderationStatus, reason }) {
  const row = await db.Project.findById(id).lean();
  if (!row) throw AppError.notFound('Project');
  await db.Project.updateOne(
    { _id: row._id },
    { $set: { moderationStatus, moderationReason: reason ?? null, moderatedBy: adminId, moderatedAt: new Date() } },
  );
  await db.ProjectReport.updateMany(
    { projectId: row._id, status: 'OPEN' },
    { $set: { status: 'RESOLVED', resolvedBy: adminId, resolvedAt: new Date() } },
  );
  if (['REJECTED', 'HIDDEN'].includes(moderationStatus) && moderationStatus !== row.moderationStatus) {
    await createNotification(db, {
      userId: row.authorUserId,
      type: 'PROJECT_MODERATION',
      title: `“${row.title}” was ${moderationStatus === 'REJECTED' ? 'rejected' : 'hidden'} by moderators`,
      body: reason ?? null,
      data: { projectId: String(row._id), slug: row.slug, moderationStatus },
      dedupeKey: `MODERATION:${row._id}:${moderationStatus}:${Date.now()}`,
    });
  }
  return getAdmin(db, id);
}

/** Admin publish (legacy route) — still subject to the publish requirements. */
export async function adminPublish(db, id) {
  const row = await db.Project.findById(id).lean();
  if (!row) throw AppError.notFound('Project');
  const issues = publishIssues(row);
  if (issues.length) throw AppError.validation(issues, 'This project is not ready to be published.');
  await db.Project.updateOne(
    { _id: row._id },
    { $set: { status: 'PUBLISHED', visibility: 'PUBLIC', publishedAt: row.publishedAt ?? new Date(), archivedAt: null } },
  );
  return getAdmin(db, id);
}

export async function adminArchive(db, id) {
  const { matchedCount } = await db.Project.updateOne({ _id: id }, { $set: { status: 'ARCHIVED', archivedAt: new Date() } });
  if (!matchedCount) throw AppError.notFound('Project');
  return getAdmin(db, id);
}

export async function adminSetFeatured(db, id, featured) {
  const { matchedCount } = await db.Project.updateOne({ _id: id }, { $set: { featured } });
  if (!matchedCount) throw AppError.notFound('Project');
  return getAdmin(db, id);
}

export async function adminRemove(db, id) {
  const row = await db.Project.findById(id).lean();
  if (!row) throw AppError.notFound('Project');
  return removeCascade(db, row);
}

