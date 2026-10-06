import { AppError } from '../../common/errors/app-error.js';
import { createNotification } from '../notifications/notifications.service.js';
import { loadProjectFor, loadViewableProject } from './access.js';
import { hydrateProjects, personOf } from './projects.hydrate.js';

const MAX_TEAM_SIZE = 20;
/** Sensible defaults: co-builders can edit + submit; contributors and mentors can't. */
const DEFAULT_CAN_EDIT = { CO_BUILDER: true, CONTRIBUTOR: false, MENTOR: false };

function memberView(h, m, { detailed }) {
  return {
    id: String(m._id),
    role: m.role,
    joinedAt: m.joinedAt ?? null,
    user: personOf(h, m.userId),
    ...(detailed ? { status: m.status, canEdit: m.canEdit, invitedAt: m.createdAt } : {}),
  };
}

/** Team list. Outsiders see active members only; the team and admins also see pending invites. */
export async function listTeam(db, id, viewerUserId) {
  const { project, access } = await loadViewableProject(db, id, viewerUserId);
  const h = await hydrateProjects(db, [project], { includeInvited: access.seesPrivate });
  const members = h.membersByProject.get(String(project._id)) ?? [];
  return {
    teamName: project.teamName ?? null,
    members: members.map((m) => memberView(h, m, { detailed: access.seesPrivate })),
    viewer: { canManage: access.canManage, isInvited: access.isInvited },
  };
}

async function resolveInvitee(db, { username, email }) {
  if (username) {
    const profile = await db.BuilderProfile.findOne({ username }).select({ userId: 1 }).lean();
    if (profile) {
      const user = await db.User.findOne({ _id: profile.userId, status: 'ACTIVE' }).select({ name: 1 }).lean();
      if (user) return user;
    }
  } else if (email) {
    const user = await db.User.findOne({ email, status: 'ACTIVE' }).select({ name: 1 }).lean();
    if (user) return user;
  }
  throw AppError.validation(
    [{ field: username ? 'username' : 'email', message: 'No active STUDLYF member found with that ' + (username ? 'username' : 'email') }],
    'We couldn’t find that member.',
  );
}

/** Owner invites someone. They join the public team only after accepting. */
export async function invite(db, userId, id, { username, email, role, canEdit }) {
  const { project } = await loadProjectFor(db, id, userId, 'canManage');
  const invitee = await resolveInvitee(db, { username, email });
  if (String(invitee._id) === String(userId)) throw new AppError('BAD_REQUEST', 'You’re already on this team.');
  const size = await db.ProjectMember.countDocuments({ projectId: project._id });
  if (size >= MAX_TEAM_SIZE) throw new AppError('BAD_REQUEST', `A team can have at most ${MAX_TEAM_SIZE} members.`);

  let member;
  try {
    member = await db.ProjectMember.create({
      projectId: project._id,
      userId: invitee._id,
      role,
      status: 'INVITED',
      canEdit: canEdit ?? DEFAULT_CAN_EDIT[role] ?? false,
      invitedBy: userId,
    });
  } catch (err) {
    if (err?.code === 11000) throw new AppError('CONFLICT', 'This person is already on the team or has a pending invite.');
    throw err;
  }
  const inviter = await db.User.findById(userId).select({ name: 1 }).lean();
  await createNotification(db, {
    userId: invitee._id,
    type: 'PROJECT_TEAM',
    title: `${inviter?.name ?? 'A builder'} invited you to “${project.title}”`,
    body: `Join as ${role.replace('_', '-').toLowerCase()} to appear on the project and share its achievements.`,
    data: { projectId: String(project._id), slug: project.slug, memberId: String(member._id), role },
    dedupeKey: `TEAM_INVITE:${member._id}`,
  });
  return { project, member: member.toObject() };
}

async function memberOf(db, project, memberId) {
  const member = await db.ProjectMember.findOne({ _id: memberId, projectId: project._id }).lean();
  if (!member) throw AppError.notFound('Team member');
  return member;
}

/**
 * The invitee accepts ({ status: 'ACTIVE' }); the owner changes role/canEdit. Nobody can change
 * the OWNER row, and nobody can accept an invite on someone else's behalf.
 */
export async function updateMember(db, userId, id, memberId, patch) {
  const { project, access } = await loadViewableProject(db, id, userId);
  const member = await memberOf(db, project, memberId);
  const isSelf = String(member.userId) === String(userId);

  if (patch.status === 'ACTIVE') {
    if (!isSelf) throw AppError.forbidden('Only the invited person can accept an invitation.');
    if (member.status !== 'INVITED') throw new AppError('CONFLICT', 'You’re already an active member of this team.');
    await db.ProjectMember.updateOne({ _id: member._id }, { $set: { status: 'ACTIVE', joinedAt: new Date() } });
    const joiner = await db.User.findById(userId).select({ name: 1 }).lean();
    await createNotification(db, {
      userId: project.authorUserId,
      type: 'PROJECT_TEAM',
      title: `${joiner?.name ?? 'A builder'} joined “${project.title}”`,
      data: { projectId: String(project._id), slug: project.slug, memberId: String(member._id) },
      dedupeKey: `TEAM_JOINED:${member._id}`,
    });
    return { project, member: { ...member, status: 'ACTIVE' }, action: 'accept' };
  }

  if (!access.canManage) throw AppError.forbidden('Only the project owner can change the team.');
  if (member.role === 'OWNER') throw new AppError('BAD_REQUEST', 'The owner’s membership can’t be changed.');
  const set = {};
  if (patch.role !== undefined) set.role = patch.role;
  if (patch.canEdit !== undefined) set.canEdit = patch.canEdit;
  if (Object.keys(set).length) await db.ProjectMember.updateOne({ _id: member._id }, { $set: set });
  return { project, member: { ...member, ...set }, action: 'update' };
}

/** The owner removes someone, or a member leaves / declines their own invite. */
export async function removeMember(db, userId, id, memberId) {
  const { project, access } = await loadViewableProject(db, id, userId);
  const member = await memberOf(db, project, memberId);
  const isSelf = String(member.userId) === String(userId);
  if (member.role === 'OWNER') throw new AppError('BAD_REQUEST', 'The owner can’t leave their own project — archive or delete it instead.');
  if (!isSelf && !access.canManage) throw AppError.forbidden('Only the project owner can remove team members.');
  await db.ProjectMember.deleteOne({ _id: member._id });
  await db.BuilderProfile.updateOne({ userId: member.userId }, { $pull: { featuredProjectIds: project._id } });
  return { project, member, action: isSelf ? 'leave' : 'remove' };
}
