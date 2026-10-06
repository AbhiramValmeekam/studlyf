import { idOf, loadMedia, pick } from '../../common/utilities/media.js';
import { applicationStatus } from '../opportunities/opportunities.service.js';
import { isDiscoverable } from './access.js';
import { publishIssues } from './readiness.js';

const unique = (arr) => [...new Set(arr.map(idOf).filter(Boolean))];

/** Submission statuses that count as having taken part in an opportunity. */
export const PARTICIPATING = ['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'SELECTED', 'REJECTED'];

/** Public-safe outcome: never broadcast a rejection. */
const publicOutcome = (status) => (status === 'SELECTED' || status === 'SHORTLISTED' ? status : 'PARTICIPATED');

export function documentDownloadUrl(config, assetId) {
  return `${config.apiPublicUrl}/api/v1/project-media/${assetId}`;
}

/**
 * Batch-loads everything project cards/pages show — owners, team, photos, media, submission
 * summaries — in a fixed number of queries for the whole page of rows (no N+1).
 */
export async function hydrateProjects(db, rows, { includeInvited = false, withSubmissions = false } = {}) {
  const ids = rows.map((r) => r._id);
  const memberFilter = { projectId: { $in: ids } };
  if (!includeInvited) memberFilter.status = 'ACTIVE';
  const members = ids.length ? await db.ProjectMember.find(memberFilter).sort({ createdAt: 1, _id: 1 }).lean() : [];

  const userIds = unique([...rows.map((r) => r.authorUserId), ...members.map((m) => m.userId)]);
  const [users, profiles, submissions, docAssets] = await Promise.all([
    userIds.length ? db.User.find({ _id: { $in: userIds } }).select({ name: 1, profilePhotoId: 1 }).lean() : [],
    userIds.length
      ? db.BuilderProfile.find({ userId: { $in: userIds } }).select({ userId: 1, username: 1, headline: 1 }).lean()
      : [],
    withSubmissions && ids.length
      ? db.ProjectSubmission.find({ projectId: { $in: ids } }).sort({ updatedAt: -1, _id: -1 }).lean()
      : [],
    db.MediaAsset.find({
      _id: { $in: unique(rows.flatMap((r) => (r.media ?? []).filter((m) => m.kind === 'DOCUMENT').map((m) => m.assetId))) },
    })
      .select({ mimeType: 1, originalName: 1, sizeBytes: 1 })
      .lean(),
  ]);

  const media = await loadMedia(db, [
    ...rows.map((r) => r.coverImageId),
    ...rows.flatMap((r) => (r.media ?? []).filter((m) => m.kind === 'SCREENSHOT').map((m) => m.assetId)),
    ...users.map((u) => u.profilePhotoId),
  ]);

  const opportunities = submissions.length
    ? await db.Opportunity.find({ _id: { $in: unique(submissions.map((s) => s.opportunityId)) } })
        .select({ title: 1, slug: 1, type: 1, organizationName: 1, applicationDeadline: 1, endDate: 1 })
        .lean()
    : [];

  const userMap = new Map(users.map((u) => [String(u._id), u]));
  const profileByUser = new Map(profiles.map((p) => [String(p.userId), p]));
  const membersByProject = new Map();
  for (const m of members) {
    const key = String(m.projectId);
    membersByProject.set(key, [...(membersByProject.get(key) ?? []), m]);
  }
  const submissionsByProject = new Map();
  for (const s of submissions) {
    const key = String(s.projectId);
    submissionsByProject.set(key, [...(submissionsByProject.get(key) ?? []), s]);
  }

  return {
    media,
    userMap,
    profileByUser,
    membersByProject,
    submissionsByProject,
    docMap: new Map(docAssets.map((d) => [String(d._id), d])),
    oppMap: new Map(opportunities.map((o) => [String(o._id), o])),
  };
}

/** Public person summary — never an email, phone or internal id. */
export function personOf(h, userId) {
  const key = idOf(userId);
  const user = h.userMap.get(key);
  const profile = h.profileByUser.get(key);
  return {
    username: profile?.username ?? null,
    name: user?.name ?? null,
    headline: profile?.headline ?? null,
    photo: pick(h.media, user?.profilePhotoId),
  };
}

function teamOf(h, project, { includeInvited, withMemberIds }) {
  return (h.membersByProject.get(String(project._id)) ?? [])
    .filter((m) => includeInvited || m.status === 'ACTIVE')
    .map((m) => ({
      ...(withMemberIds ? { id: String(m._id), canEdit: m.canEdit, status: m.status } : {}),
      role: m.role,
      joinedAt: m.joinedAt ?? null,
      user: personOf(h, m.userId),
    }));
}

export const oppMini = (o) =>
  o
    ? {
        id: String(o._id),
        slug: o.slug,
        title: o.title,
        type: o.type,
        organizationName: o.organizationName,
        applicationStatus: applicationStatus(o),
      }
    : null;

const linksOut = (l) => ({ repo: l?.repo ?? null, demo: l?.demo ?? null, video: l?.video ?? null, website: l?.website ?? null });

function mediaOut(config, h, project) {
  return (project.media ?? []).map((m) => {
    const base = { id: String(m._id), kind: m.kind, caption: m.caption ?? null };
    if (m.kind === 'DOCUMENT') {
      const doc = h.docMap.get(idOf(m.assetId));
      return {
        ...base,
        asset: {
          id: idOf(m.assetId),
          mimeType: doc?.mimeType ?? 'application/pdf',
          name: doc?.originalName ?? 'Document',
          sizeBytes: doc?.sizeBytes ?? null,
          downloadUrl: documentDownloadUrl(config, idOf(m.assetId)),
        },
      };
    }
    return { ...base, asset: pick(h.media, m.assetId) };
  });
}

/** Card shape for lists (discovery, my projects, profile). `own` adds status/visibility/submissions. */
export function toCard(project, h, { own = false } = {}) {
  const team = teamOf(h, project, { includeInvited: false, withMemberIds: false });
  const card = {
    id: String(project._id),
    slug: project.slug,
    title: project.title,
    tagline: project.tagline ?? null,
    category: project.category,
    projectType: project.projectType,
    status: project.status,
    technologies: project.technologies ?? [],
    skills: (project.skills ?? []).map((s) => ({ slug: s.slug, name: s.name })),
    coverImage: pick(h.media, project.coverImageId),
    owner: personOf(h, project.authorUserId),
    teamSize: team.length,
    team: team.slice(0, 5).map((m) => ({ role: m.role, user: m.user })),
    upvoteCount: project.upvoteCount ?? 0,
    completed: !!project.completedAt,
    publishedAt: project.publishedAt ?? null,
    updatedAt: project.updatedAt,
  };
  if (!own) return card;
  const subs = h.submissionsByProject.get(String(project._id)) ?? [];
  const latest = subs[0];
  return {
    ...card,
    visibility: project.visibility,
    moderationStatus: project.moderationStatus,
    discoverable: isDiscoverable(project),
    ready: publishIssues(project).length === 0,
    submissions: {
      count: subs.filter((s) => s.status !== 'DRAFT' && s.status !== 'WITHDRAWN').length,
      latest: latest
        ? { id: String(latest._id), status: latest.status, opportunity: oppMini(h.oppMap.get(idOf(latest.opportunityId))) }
        : null,
    },
  };
}

/**
 * Full project page. Public viewers get the project, active team and public-safe participation.
 * Team members/admins (`access.seesPrivate`) also get status, visibility, moderation, the publish
 * checklist, pending invitations and every submission with its exact status.
 */
export function toDetail(config, project, h, access, { upvoted = false } = {}) {
  const participation = (h.submissionsByProject.get(String(project._id)) ?? [])
    .filter((s) => PARTICIPATING.includes(s.status))
    .map((s) => ({
      opportunity: oppMini(h.oppMap.get(idOf(s.opportunityId))),
      outcome: publicOutcome(s.status),
      submittedAt: s.submittedAt ?? null,
    }));

  const detail = {
    id: String(project._id),
    slug: project.slug,
    title: project.title,
    tagline: project.tagline ?? null,
    description: project.description ?? null,
    problemStatement: project.problemStatement ?? null,
    solution: project.solution ?? null,
    impact: project.impact ?? null,
    category: project.category,
    projectType: project.projectType,
    status: project.status,
    technologies: project.technologies ?? [],
    skills: (project.skills ?? []).map((s) => ({ slug: s.slug, name: s.name })),
    coverImage: pick(h.media, project.coverImageId),
    media: mediaOut(config, h, project),
    links: linksOut(project.links),
    teamName: project.teamName ?? null,
    startDate: project.startDate ?? null,
    endDate: project.endDate ?? null,
    completed: !!project.completedAt,
    completedAt: project.completedAt ?? null,
    publishedAt: project.publishedAt ?? null,
    archived: project.status === 'ARCHIVED',
    updatedAt: project.updatedAt,
    owner: personOf(h, project.authorUserId),
    team: teamOf(h, project, { includeInvited: access.seesPrivate, withMemberIds: access.seesPrivate }),
    upvoteCount: project.upvoteCount ?? 0,
    upvoted,
    participation,
    viewer: {
      isOwner: access.isOwner,
      isMember: access.isMember,
      isInvited: access.isInvited,
      role: access.memberRole,
      canEdit: access.canEdit,
      canManage: access.canManage,
      isAdmin: access.isAdmin,
    },
  };
  if (!access.seesPrivate) return detail;

  const issues = publishIssues(project);
  return {
    ...detail,
    visibility: project.visibility,
    discoverable: isDiscoverable(project),
    moderationStatus: project.moderationStatus,
    moderationReason: project.moderationReason ?? null,
    readiness: { ready: issues.length === 0, issues },
    submissions: (h.submissionsByProject.get(String(project._id)) ?? []).map((s) => ({
      id: String(s._id),
      status: s.status,
      opportunity: oppMini(h.oppMap.get(idOf(s.opportunityId))),
      submittedAt: s.submittedAt ?? null,
      updatedAt: s.updatedAt,
    })),
  };
}
