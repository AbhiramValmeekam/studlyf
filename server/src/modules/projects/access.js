import { AppError } from '../../common/errors/app-error.js';

const HIDDEN_MODERATION = ['REJECTED', 'HIDDEN'];

/**
 * Visibility rules — the single place that decides who may see a project.
 *
 *   PRIVATE   → team members (active or invited), admins, and evaluators assigned to one of its
 *               submissions. Never anyone else, not even by URL.
 *   UNLISTED  → anyone with the URL once published; never listed in discovery.
 *   PUBLIC    → anyone with the URL + discovery, once published.
 * Moderation REJECTED/HIDDEN removes a project from everyone except its team and admins.
 * ARCHIVED projects stay reachable by URL (portfolio links keep working) but leave discovery.
 */
export function discoverableFilter(now = new Date()) {
  return {
    visibility: 'PUBLIC',
    publishedAt: { $ne: null, $lte: now },
    status: { $ne: 'ARCHIVED' },
    moderationStatus: { $nin: HIDDEN_MODERATION },
  };
}

export function isDiscoverable(p, now = new Date()) {
  return (
    p.visibility === 'PUBLIC' &&
    !!p.publishedAt &&
    new Date(p.publishedAt) <= now &&
    p.status !== 'ARCHIVED' &&
    !HIDDEN_MODERATION.includes(p.moderationStatus)
  );
}

/** Viewable by anyone holding the link (public or unlisted, published, not moderated away). */
export function isLinkViewable(p, now = new Date()) {
  return (
    (p.visibility === 'PUBLIC' || p.visibility === 'UNLISTED') &&
    !!p.publishedAt &&
    new Date(p.publishedAt) <= now &&
    !HIDDEN_MODERATION.includes(p.moderationStatus)
  );
}

export async function isActiveAdmin(db, userId) {
  if (!userId) return false;
  return !!(await db.AdminUser.exists({ userId, active: true }));
}

/**
 * Everything the caller may do with a project. Never trusts client-supplied ids — the viewer is
 * always the authenticated user.
 */
export async function projectAccess(db, project, viewerUserId) {
  const ownerId = String(project.authorUserId);
  const isOwner = !!viewerUserId && ownerId === String(viewerUserId);
  const [member, isAdmin, assignedEvaluator] = viewerUserId
    ? await Promise.all([
        isOwner ? null : db.ProjectMember.findOne({ projectId: project._id, userId: viewerUserId }).lean(),
        isActiveAdmin(db, viewerUserId),
        db.Evaluation.exists({ projectId: project._id, evaluatorId: viewerUserId }),
      ])
    : [null, false, null];

  const activeMember = isOwner || member?.status === 'ACTIVE';
  const canEdit = isOwner || (member?.status === 'ACTIVE' && member.canEdit);
  const teamSees = isOwner || !!member; // invited members may preview what they're joining
  const canView = teamSees || isAdmin || !!assignedEvaluator || isLinkViewable(project);

  return {
    isOwner,
    isMember: activeMember,
    isInvited: member?.status === 'INVITED',
    memberRole: isOwner ? 'OWNER' : (member?.role ?? null),
    canView,
    canEdit, // edit content + submit to opportunities
    canManage: isOwner, // publish, archive, delete, team, duplicate-as-owner
    isAdmin,
    isAssignedEvaluator: !!assignedEvaluator,
    seesPrivate: teamSees || isAdmin, // status, visibility, moderation, readiness, all submissions
  };
}

/** Load a project by id or slug, or 404. */
export async function findProjectByIdOrSlug(db, idOrSlug) {
  const isId = /^[a-f0-9]{24}$/i.test(idOrSlug);
  const project = isId
    ? await db.Project.findById(idOrSlug).lean()
    : await db.Project.findOne({ slug: String(idOrSlug).toLowerCase() }).lean();
  return project ?? null;
}

/**
 * Load a project the caller is allowed to see, or 404 (never 403 — a private project's
 * existence is not revealed to outsiders).
 */
export async function loadViewableProject(db, idOrSlug, viewerUserId) {
  const project = await findProjectByIdOrSlug(db, idOrSlug);
  if (!project) throw AppError.notFound('Project');
  const access = await projectAccess(db, project, viewerUserId);
  if (!access.canView) throw AppError.notFound('Project');
  return { project, access };
}

/** For mutations: 404 when invisible, 403 when visible but not permitted. */
export async function loadProjectFor(db, id, viewerUserId, permission) {
  const { project, access } = await loadViewableProject(db, id, viewerUserId);
  if (!access[permission]) {
    const message =
      permission === 'canManage'
        ? 'Only the project owner can do that.'
        : "You don't have permission to edit this project.";
    throw AppError.forbidden(message);
  }
  return { project, access };
}
