import { AppError } from '../../common/errors/app-error.js';
import { idOf, loadMedia, pick } from '../../common/utilities/media.js';
import { resolvePublishFields } from '../../common/utilities/publishing.js';
import { resolveSlug } from '../../common/utilities/slug.js';
import { sanitizeRichText, termsOf } from '../../common/utilities/text.js';
import { assertCategory, categoryOf, ensureTags, loadCategories } from '../taxonomy/taxonomy.service.js';
import * as repo from './ott.repository.js';

const EMPTY_SHELF = { continueWatching: [], completed: [], stats: { inProgress: 0, completed: 0 } };

async function hydrate(db, rows) {
  const [media, categories] = await Promise.all([
    loadMedia(db, rows.map((r) => r.thumbnailId)),
    loadCategories(db, rows.map((r) => r.categoryId)),
  ]);
  return { media, categories };
}

const episodeOut = (e) => ({
  key: e.key,
  title: e.title,
  summary: e.summary ?? null,
  durationMinutes: e.durationMinutes ?? null,
  sourceUrl: e.sourceUrl ?? null,
});

function toPublic(row, h, detail) {
  const episodes = (row.episodes ?? []).map(episodeOut);
  return {
    id: String(row._id),
    title: row.title,
    slug: row.slug,
    kind: row.kind,
    summary: row.summary,
    byline: row.byline ?? null,
    level: row.level ?? null,
    category: categoryOf(h.categories, row.categoryId),
    thumbnail: pick(h.media, row.thumbnailId),
    durationMinutes: row.durationMinutes ?? null,
    episodeCount: episodes.length,
    skills: (row.skills ?? []).map(({ name, slug }) => ({ name, slug })),
    featured: row.featured,
    publishedAt: row.publishedAt,
    ...(detail ? { description: row.description ?? null, sourceUrl: row.sourceUrl ?? null, episodes } : {}),
  };
}

function toAdmin(row, h) {
  return {
    ...toPublic(row, h, true),
    thumbnailId: idOf(row.thumbnailId),
    categoryId: idOf(row.categoryId),
    status: row.status,
    createdBy: idOf(row.createdBy),
    updatedBy: idOf(row.updatedBy),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function toPublicList(db, rows) {
  const h = await hydrate(db, rows);
  return rows.map((r) => toPublic(r, h, false));
}

export async function getPublicBySlug(db, slug) {
  const row = await repo.findPublicBySlug(db, slug);
  if (!row) throw AppError.notFound('Title');
  return toPublic(row, await hydrate(db, [row]), true);
}

export async function toAdminList(db, rows) {
  const h = await hydrate(db, rows);
  return rows.map((r) => toAdmin(r, h));
}

export async function getAdmin(db, id) {
  const row = await repo.findById(db, id);
  if (!row) throw AppError.notFound('Title');
  return toAdmin(row, await hydrate(db, [row]));
}

const searchFields = (d) => ({
  searchTerms: termsOf(d.title, d.summary, d.byline, ...(d.skills ?? []).map((s) => s.name), ...(d.episodes ?? []).map((e) => e.title), d.description),
  titleTerms: termsOf(d.title),
});

export async function create(db, input, actorId) {
  const { skills, slug, description, status, publishedAt, categoryId, ...rest } = input;
  const embeddedSkills = skills?.length ? await ensureTags(db, skills) : [];
  const cleanDescription = description ? sanitizeRichText(description) : null;
  if (categoryId) await assertCategory(db, categoryId, 'OTT');
  const doc = await db.Ott.create({
    ...rest,
    categoryId: categoryId ?? null,
    slug: await resolveSlug(db.Ott, { explicit: slug, from: rest.title }),
    description: cleanDescription,
    skills: embeddedSkills,
    ...resolvePublishFields({ status: status ?? 'DRAFT', publishedAt }),
    ...searchFields({ ...rest, description: cleanDescription, skills: embeddedSkills }),
    createdBy: actorId,
    updatedBy: actorId,
  });
  return getAdmin(db, String(doc._id));
}

export async function update(db, id, patch, actorId) {
  const existing = await repo.findById(db, id);
  if (!existing) throw AppError.notFound('Title');

  const { skills, slug, description, status, publishedAt, categoryId, ...rest } = patch;
  const set = { ...rest, updatedBy: actorId, ...resolvePublishFields({ status, publishedAt }, existing) };
  if (slug !== undefined) set.slug = await resolveSlug(db.Ott, { explicit: slug, from: '', excludeId: id });
  if (description !== undefined) set.description = description ? sanitizeRichText(description) : null;
  if (skills) set.skills = await ensureTags(db, skills);
  if (categoryId !== undefined) {
    if (categoryId) await assertCategory(db, categoryId, 'OTT');
    set.categoryId = categoryId ?? null;
  }

  Object.assign(set, searchFields({ ...existing, ...set }));
  await db.Ott.updateOne({ _id: id }, { $set: set }, { runValidators: true });
  return getAdmin(db, id);
}

export async function setPublished(db, id, published, actorId, publishedAt) {
  const existing = await repo.findById(db, id);
  if (!existing) throw AppError.notFound('Title');
  await db.Ott.updateOne(
    { _id: id },
    {
      $set: published
        ? { status: 'PUBLISHED', publishedAt: publishedAt ?? existing.publishedAt ?? new Date(), updatedBy: actorId }
        : { status: 'DRAFT', updatedBy: actorId },
    },
  );
  return getAdmin(db, id);
}

export async function remove(db, id) {
  const row = await db.Ott.findByIdAndDelete(id).select({ title: 1, slug: 1 }).lean();
  if (!row) throw AppError.notFound('Title');
  // Progress on a title nobody can open any more is noise, not history worth keeping.
  await db.OttProgress.deleteMany({ contentId: id });
  return { id, title: row.title, slug: row.slug };
}

// ---- the viewer's shelf ----------------------------------------------------------------

/** One card for a title, collapsed from every progress row the viewer has on it. */
function shelfEntry(content, rows, media) {
  const episodes = content.episodes ?? [];
  const latest = rows.reduce((a, b) => (new Date(a.lastWatchedAt) >= new Date(b.lastWatchedAt) ? a : b));
  const base = {
    id: String(content._id),
    title: content.title,
    slug: content.slug,
    kind: content.kind,
    summary: content.summary,
    byline: content.byline ?? null,
    thumbnail: pick(media, content.thumbnailId),
    durationMinutes: content.durationMinutes ?? null,
    lastWatchedAt: latest.lastWatchedAt,
  };

  if (!episodes.length) {
    return { ...base, percent: latest.percent, completed: latest.completed, episodeKey: null, episodeTitle: null };
  }

  // A series or course is finished when every instalment is — not when the last one opened.
  const done = new Set(rows.filter((r) => r.completed).map((r) => r.episodeKey));
  const remaining = episodes.filter((e) => !done.has(e.key));
  const next = remaining[0] ?? null;
  return {
    ...base,
    percent: Math.round(((episodes.length - remaining.length) / episodes.length) * 100),
    completed: remaining.length === 0,
    episodeKey: next?.key ?? null,
    episodeTitle: next?.title ?? null,
    episodesDone: episodes.length - remaining.length,
    episodeCount: episodes.length,
    // The keys, not just the count, so a title page can tick the right instalments.
    completedEpisodeKeys: episodes.filter((e) => done.has(e.key)).map((e) => e.key),
  };
}

/**
 * Continue-watching, in one query's worth of rows. Anything the viewer cannot open any more —
 * unpublished, archived, deleted — is left off the shelf rather than rendered as a dead link.
 */
export async function getShelf(db, userId) {
  const rows = await repo.listProgress(db, userId);
  if (!rows.length) return EMPTY_SHELF;

  const ids = [...new Set(rows.map((r) => String(r.contentId)))];
  const contents = await repo.findManyPublished(db, ids);
  if (!contents.length) return EMPTY_SHELF;
  const media = await loadMedia(db, contents.map((c) => c.thumbnailId));

  const byId = new Map(contents.map((c) => [String(c._id), c]));
  const grouped = new Map();
  for (const r of rows) {
    const content = byId.get(String(r.contentId));
    if (!content) continue;
    const key = String(r.contentId);
    if (!grouped.has(key)) grouped.set(key, { content, rows: [] });
    grouped.get(key).rows.push(r);
  }

  const continueWatching = [];
  const completed = [];
  for (const { content, rows: contentRows } of grouped.values()) {
    const entry = shelfEntry(content, contentRows, media);
    (entry.completed ? completed : continueWatching).push(entry);
  }
  const byRecency = (a, b) => new Date(b.lastWatchedAt) - new Date(a.lastWatchedAt);
  continueWatching.sort(byRecency);
  completed.sort(byRecency);
  return { continueWatching, completed, stats: { inProgress: continueWatching.length, completed: completed.length } };
}

const clamp = (n) => Math.min(100, Math.max(0, n));

/**
 * Records where a viewer got to. Only the fields sent are applied, so a heartbeat that reports a
 * position does not wipe a percentage the player had already computed.
 */
export async function setProgress(db, userId, contentId, body) {
  const content = await repo.findViewable(db, contentId);
  if (!content) throw AppError.notFound('Title');

  const hasEpisodes = (content.episodes ?? []).length > 0;
  const episodeKey = body.episodeKey ?? null;
  if (body.episodeKey !== undefined) {
    if (!hasEpisodes || !content.episodes.some((e) => e.key === episodeKey)) {
      throw AppError.validation([{ field: 'episodeKey', message: 'That episode is not part of this title' }]);
    }
  } else if (hasEpisodes && (content.kind === 'SERIES' || content.kind === 'COURSE')) {
    throw AppError.validation([{ field: 'episodeKey', message: `Choose an episode of this ${content.kind.toLowerCase()}` }]);
  }

  const existing = await repo.findProgress(db, userId, contentId, episodeKey);
  const percent = clamp(body.percent ?? existing?.percent ?? 0);
  const doc = {
    userId,
    contentId,
    episodeKey,
    positionSeconds: body.positionSeconds ?? existing?.positionSeconds ?? 0,
    percent,
    // A position alone says nothing about finishing, so an explicit flag wins; otherwise 95% of
    // the way through is treated as watched.
    completed: body.completed ?? (body.percent !== undefined ? percent >= 95 : (existing?.completed ?? false)),
    lastWatchedAt: new Date(),
  };
  await repo.upsertProgress(db, doc);
  return {
    id: String(contentId),
    episodeKey,
    positionSeconds: doc.positionSeconds,
    percent: doc.percent,
    completed: doc.completed,
    lastWatchedAt: doc.lastWatchedAt,
  };
}

/** Clears the whole title when no episode is named, or just that episode. */
export async function clearProgress(db, userId, contentId, episodeKey) {
  const cleared = await repo.removeProgress(db, userId, contentId, episodeKey ?? null);
  if (!cleared) throw AppError.notFound('Progress');
  return { id: String(contentId), episodeKey: episodeKey ?? null, cleared };
}
