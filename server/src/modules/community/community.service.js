import { AppError } from '../../common/errors/app-error.js';
import { idOf, loadMedia, pick } from '../../common/utilities/media.js';
import { resolveSlug } from '../../common/utilities/slug.js';
import { sanitizeRichText } from '../../common/utilities/text.js';
import { createNotification } from '../notifications/notifications.service.js';
import * as builderRepo from '../builder-profiles/builder-profiles.repository.js';
import { isLinkViewable, loadProjectFor } from '../projects/access.js';
import { publishIssues } from '../projects/readiness.js';
import { assertAssetsUsable, projectSearchFields, removeCascade } from '../projects/projects.service.js';
import * as repo from './community.repository.js';

const linksOut = (l) => ({
  repo: l?.repo ?? null,
  demo: l?.demo ?? null,
  video: l?.video ?? null,
  website: l?.website ?? null,
});

// Batch-hydrate the author summary (username, headline, photo) for a page of projects.
async function authorsFor(db, rows) {
  const profileIds = [...new Set(rows.map((r) => idOf(r.authorProfileId)).filter(Boolean))];
  if (!profileIds.length) return new Map();
  const profiles = await db.BuilderProfile.find({ _id: { $in: profileIds } })
    .select({ username: 1, headline: 1, userId: 1 })
    .lean();
  const users = await db.User.find({ _id: { $in: profiles.map((p) => p.userId) } })
    .select({ profilePhotoId: 1 })
    .lean();
  const media = await loadMedia(db, users.map((u) => u.profilePhotoId));
  const photoByUser = new Map(users.map((u) => [String(u._id), pick(media, u.profilePhotoId)]));
  return new Map(
    profiles.map((p) => [
      String(p._id),
      { username: p.username, headline: p.headline ?? null, photo: photoByUser.get(String(p.userId)) ?? null },
    ]),
  );
}

function toCard(row, { author, cover, upvoted }) {
  return {
    id: String(row._id),
    slug: row.slug,
    title: row.title,
    tagline: row.tagline,
    category: row.category,
    tags: row.tags ?? [],
    coverImage: cover,
    upvoteCount: row.upvoteCount ?? 0,
    upvoted: !!upvoted,
    author: author ?? null,
    createdAt: row.createdAt,
    publishedAt: row.publishedAt ?? null,
  };
}

/**
 * The public showcase detail. The community feed reads the same `Project` collection as the
 * builder-owned project page, but this serializer is the *public* contract: it deliberately
 * omits moderation state, submissions, pending invitations and the session-keyed `viewer` object
 * that `/projects/:id` returns. Extending this allow-list (rather than repointing the page at the
 * builder endpoint) keeps one public shape and cannot leak builder-only fields.
 *
 * Every field is read with a `??` fallback: `.lean()` does not materialise schema defaults, and a
 * project created before Phase 3 simply has no `problemStatement`.
 */
function toDetail(row, ctx) {
  return {
    ...toCard(row, ctx),
    description: row.description ?? null,
    problemStatement: row.problemStatement ?? null,
    solution: row.solution ?? null,
    impact: row.impact ?? null,
    technologies: row.technologies ?? [],
    projectType: row.projectType ?? null,
    skills: (row.skills ?? []).map((s) => ({ name: s.name, slug: s.slug })),
    teamName: row.teamName ?? null,
    startDate: row.startDate ?? null,
    endDate: row.endDate ?? null,
    completedAt: row.completedAt ?? null,
    media: ctx.media ?? [],
    links: linksOut(row.links),
  };
}

function toOwn(row, cover) {
  return {
    id: String(row._id),
    slug: row.slug,
    title: row.title,
    tagline: row.tagline,
    description: row.description ?? null,
    problemStatement: row.problemStatement ?? null,
    solution: row.solution ?? null,
    impact: row.impact ?? null,
    category: row.category,
    projectType: row.projectType ?? null,
    technologies: row.technologies ?? [],
    teamName: row.teamName ?? null,
    startDate: row.startDate ?? null,
    endDate: row.endDate ?? null,
    media: (row.media ?? []).map((m) => ({ assetId: idOf(m.assetId), kind: m.kind, caption: m.caption ?? null })),
    tags: row.tags ?? [],
    coverImageId: idOf(row.coverImageId),
    coverImage: cover,
    links: linksOut(row.links),
    upvoteCount: row.upvoteCount ?? 0,
    status: row.status,
    featured: row.featured,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function coversFor(db, rows) {
  return loadMedia(db, rows.map((r) => r.coverImageId));
}

/**
 * Cards for a known set of project rows (the saved list, unified search, …). Shares the feed's
 * serialization, so a project looks the same wherever a viewer meets it.
 */
export async function toCards(db, rows, viewerUserId = null) {
  const [authors, covers, upvoted] = await Promise.all([
    authorsFor(db, rows),
    coversFor(db, rows),
    viewerUserId ? repo.upvotedProjectIds(db, viewerUserId, rows.map((r) => r._id)) : new Set(),
  ]);
  return rows.map((r) =>
    toCard(r, { author: authors.get(idOf(r.authorProfileId)), cover: pick(covers, r.coverImageId), upvoted: upvoted.has(String(r._id)) }),
  );
}

export async function listFeed(db, viewerUserId, query) {
  const { rows, total } = await repo.feed(db, query);
  return { items: await toCards(db, rows, viewerUserId), total };
}

export async function getBySlug(db, viewerUserId, slug) {
  const row = await repo.findPublishedBySlug(db, slug);
  if (!row) throw AppError.notFound('Project');
  const [authors, media, upvoted] = await Promise.all([
    authorsFor(db, [row]),
    loadMedia(db, [row.coverImageId, ...(row.media ?? []).map((m) => m.assetId)]),
    viewerUserId ? repo.upvotedProjectIds(db, viewerUserId, [row._id]) : new Set(),
  ]);
  return toDetail(row, {
    author: authors.get(idOf(row.authorProfileId)),
    cover: pick(media, row.coverImageId),
    upvoted: upvoted.has(String(row._id)),
    // Only images reach the public gallery — a supporting PDF keeps its private download route.
    media: (row.media ?? [])
      .filter((m) => m.kind === 'SCREENSHOT')
      .map((m) => {
        const asset = pick(media, m.assetId);
        return asset ? { ...asset, caption: m.caption ?? null } : null;
      })
      .filter(Boolean),
  });
}

export async function popularTags(db, limit = 20) {
  return repo.popularTags(db, limit);
}

export async function categoryCounts(db) {
  const rows = await repo.categoryCounts(db);
  return rows;
}

export async function leaderboard(db, limit = 10) {
  const rows = await repo.leaderboard(db, limit);
  const users = await db.User.find({ _id: { $in: rows.map((r) => r.userId) } }).select({ profilePhotoId: 1 }).lean();
  const media = await loadMedia(db, users.map((u) => u.profilePhotoId));
  const photoByUser = new Map(users.map((u) => [String(u._id), pick(media, u.profilePhotoId)]));
  return rows.map((r, i) => ({
    rank: i + 1,
    username: r.username,
    headline: r.headline ?? null,
    upvotes: r.upvotes,
    projects: r.projects,
    photo: photoByUser.get(String(r.userId)) ?? null,
  }));
}

/** Published projects by a builder username — powers the portfolio view. */
export async function listByUsername(db, username) {
  const profile = await db.BuilderProfile.findOne({ username }).select({ _id: 1 }).lean();
  if (!profile) throw AppError.notFound('Builder profile');
  const rows = await repo.listPublishedByProfile(db, profile._id);
  const covers = await coversFor(db, rows);
  return rows.map((r) => toOwn(r, pick(covers, r.coverImageId)));
}

export async function listOwn(db, userId) {
  const rows = await repo.listByAuthor(db, userId);
  const covers = await coversFor(db, rows);
  return rows.map((r) => toOwn(r, pick(covers, r.coverImageId)));
}

// The author's builder profile is required — a project is always attributed to a builder.
async function requireProfile(db, userId) {
  const profile = await builderRepo.findByUserId(db, userId);
  if (!profile) throw new AppError('BAD_REQUEST', 'Create your builder profile before submitting a project');
  return profile;
}

async function ownerInfo(db, userId, profile) {
  const user = await db.User.findById(userId).select({ name: 1 }).lean();
  return { username: profile?.username ?? null, name: user?.name ?? null };
}

/** "Node.js" → "node.js", "React Native" → "react-native" — the lower-case facet list from display names. */
const tagify = (names) =>
  [...new Set((names ?? []).map((n) => String(n).trim().toLowerCase().replace(/\s+/g, '-')).filter((s) => /^[a-z0-9][a-z0-9+#.-]*$/.test(s)))];

/**
 * Community "share a project" — publishes immediately, as it always has. Since Phase 3 it
 * writes the same project record as the full project flow (OWNER team row, technologies,
 * visibility) and must meet the same publish requirements, because it goes straight to PUBLIC.
 */
export async function create(db, userId, input) {
  const profile = await requireProfile(db, userId);
  const {
    slug,
    description,
    problemStatement,
    solution,
    impact,
    links,
    coverImageId,
    tags,
    technologies,
    media,
    ...rest
  } = input;
  await assertAssetsUsable(db, userId, null, { coverImageId, media });
  const now = new Date();
  // `technologies` is the author's display list; `tags` is the derived facet list (or the
  // caller's explicit tags when no stack was given).
  const stack = technologies ?? null;
  const facets = stack ? tagify(stack) : (tags ?? []);
  const base = {
    ...rest,
    description: description ? sanitizeRichText(description) : null,
    problemStatement: problemStatement ? sanitizeRichText(problemStatement) : null,
    solution: solution ? sanitizeRichText(solution) : null,
    impact: impact ? sanitizeRichText(impact) : null,
    projectType: rest.projectType ?? 'PERSONAL',
    technologies: stack ?? facets,
    tags: facets,
    skills: [],
    media: media ?? [],
    coverImageId: coverImageId ?? null,
    links: links ?? {},
    authorUserId: userId,
    authorProfileId: profile._id,
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    publishedAt: now,
  };
  const issues = publishIssues(base);
  if (issues.length) throw AppError.validation(issues, 'This project is not ready to be published.');
  const doc = await db.Project.create({
    ...base,
    slug: await resolveSlug(db.Project, { explicit: slug, from: input.title }),
    ...projectSearchFields(base, await ownerInfo(db, userId, profile)),
  });
  await db.ProjectMember.create({ projectId: doc._id, userId, role: 'OWNER', status: 'ACTIVE', canEdit: true, joinedAt: now });
  const covers = await loadMedia(db, [doc.coverImageId]);
  return toOwn(doc.toObject(), pick(covers, doc.coverImageId));
}

export async function update(db, userId, id, patch) {
  const { project: existing } = await loadProjectFor(db, id, userId, 'canEdit');
  const { slug, description, problemStatement, solution, impact, links, coverImageId, tags, technologies, media, ...rest } =
    patch;
  if (coverImageId !== undefined || media !== undefined) {
    await assertAssetsUsable(db, userId, existing, { coverImageId, media });
  }

  const set = { ...rest };
  if (description !== undefined) set.description = description ? sanitizeRichText(description) : null;
  if (problemStatement !== undefined) set.problemStatement = problemStatement ? sanitizeRichText(problemStatement) : null;
  if (solution !== undefined) set.solution = solution ? sanitizeRichText(solution) : null;
  if (impact !== undefined) set.impact = impact ? sanitizeRichText(impact) : null;
  if (media !== undefined) set.media = media ?? [];
  if (links !== undefined) set.links = { ...(existing.links ?? {}), ...(links ?? {}) };
  if (coverImageId !== undefined) set.coverImageId = coverImageId ?? null;
  if (technologies !== undefined) {
    set.technologies = technologies;
    set.tags = tagify(technologies);
  } else if (tags !== undefined) {
    set.tags = tags;
    set.technologies = tags;
  }
  if (slug !== undefined) set.slug = await resolveSlug(db.Project, { explicit: slug, from: patch.title ?? existing.title, excludeId: id });

  const merged = { ...existing, ...set };
  if (merged.visibility !== 'PRIVATE' && merged.publishedAt) {
    const issues = publishIssues(merged);
    if (issues.length) throw AppError.validation(issues, 'Published projects must keep their required information.');
  }
  const profile = await builderRepo.findByUserId(db, existing.authorUserId);
  Object.assign(set, projectSearchFields(merged, await ownerInfo(db, existing.authorUserId, profile)));
  await db.Project.updateOne({ _id: id }, { $set: set }, { runValidators: true });

  const row = await repo.findById(db, id);
  const covers = await loadMedia(db, [row.coverImageId]);
  return toOwn(row, pick(covers, row.coverImageId));
}

export async function remove(db, userId, id) {
  const { project } = await loadProjectFor(db, id, userId, 'canManage');
  return removeCascade(db, project);
}

/**
 * Toggle the caller's upvote on a project. The unique (projectId,userId) index is the guard
 * against double-voting; the denormalised `upvoteCount` is adjusted to match, and the author
 * gets an in-app notification the first time each viewer upvotes.
 */
export async function toggleUpvote(db, userId, id) {
  const project = await repo.findById(db, id);
  if (!project || !isLinkViewable(project)) throw AppError.notFound('Project');
  if (String(project.authorUserId) === String(userId)) {
    throw new AppError('BAD_REQUEST', 'You cannot upvote your own project');
  }

  try {
    await db.ProjectUpvote.create({ projectId: id, userId });
  } catch (err) {
    if (err?.code === 11000) {
      await db.ProjectUpvote.deleteOne({ projectId: id, userId });
      const { upvoteCount } = await db.Project.findByIdAndUpdate(id, { $inc: { upvoteCount: -1 } }, { new: true }).select({ upvoteCount: 1 }).lean();
      return { upvoted: false, upvoteCount: Math.max(0, upvoteCount ?? 0) };
    }
    throw err;
  }
  const { upvoteCount } = await db.Project.findByIdAndUpdate(id, { $inc: { upvoteCount: 1 } }, { new: true }).select({ upvoteCount: 1 }).lean();
  await createNotification(db, {
    userId: project.authorUserId,
    type: 'PROJECT_UPVOTE',
    title: 'Your project got an upvote',
    body: `"${project.title}" was upvoted.`,
    data: { projectId: String(id), slug: project.slug },
  }).catch(() => {});
  return { upvoted: true, upvoteCount: upvoteCount ?? 1 };
}
