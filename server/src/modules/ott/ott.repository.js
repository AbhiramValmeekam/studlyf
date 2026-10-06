import { pagedList } from '../../common/utilities/listing.js';
import { isPublished } from '../../common/utilities/publishing.js';
import { prefixSearchFilter, searchTokens } from '../../common/utilities/text.js';
import { categoryIdBySlug } from '../taxonomy/taxonomy.service.js';

export async function publicMatch(db, f) {
  const and = [isPublished()];
  const text = prefixSearchFilter(f.q);
  if (text) and.push(text);
  if (f.kind) and.push({ kind: f.kind });
  if (f.featured !== undefined) and.push({ featured: f.featured });
  if (f.skill) and.push({ 'skills.slug': f.skill.toLowerCase() });
  // A category slug nobody holds matches nothing — the empty `$in` is how that reads as a filter
  // rather than as "no filter at all".
  if (f.category) {
    const categoryId = await categoryIdBySlug(db, 'OTT', f.category);
    and.push(categoryId ? { categoryId } : { _id: null });
  }
  return { $and: and };
}

function sortFor(sort, q) {
  const hasQuery = searchTokens(q).length > 0;
  if ((sort ?? (hasQuery ? 'relevance' : undefined)) === 'relevance' && hasQuery) {
    return { rankQuery: q, sort: { _rank: -1, publishedAt: -1 } };
  }
  if (sort === 'newest') return { sort: { publishedAt: -1 } };
  return { sort: { featured: -1, publishedAt: -1 } };
}

export async function listPublic(db, query) {
  const { page, pageSize, sort, ...filters } = query;
  return pagedList(db.Ott, { match: await publicMatch(db, filters), page, pageSize, ...sortFor(sort, filters.q) });
}

export async function findPublicBySlug(db, slug) {
  return db.Ott.findOne({ slug, ...isPublished() }).lean();
}

export async function findById(db, id) {
  return db.Ott.findById(id).lean();
}

/** Only the fields the viewer shelf needs — the shelf is a strip of cards, not a catalog page. */
export async function findManyPublished(db, ids) {
  return db.Ott.find({ _id: { $in: ids }, ...isPublished() })
    .select({ title: 1, slug: 1, kind: 1, summary: 1, thumbnailId: 1, durationMinutes: 1, episodes: 1, byline: 1 })
    .lean();
}

export async function listAdmin(db, f) {
  const and = [];
  const text = prefixSearchFilter(f.q);
  if (text) and.push(text);
  if (f.status) and.push({ status: f.status });
  if (f.kind) and.push({ kind: f.kind });
  if (f.featured !== undefined) and.push({ featured: f.featured });
  return pagedList(db.Ott, {
    match: and.length ? { $and: and } : {},
    sort: { updatedAt: -1 },
    page: f.page,
    pageSize: f.pageSize,
  });
}

// ---- per-viewer progress ---------------------------------------------------------------

export async function listProgress(db, userId, limit = 60) {
  return db.OttProgress.find({ userId }).sort({ lastWatchedAt: -1 }).limit(limit).lean();
}

export async function findProgress(db, userId, contentId, episodeKey) {
  return db.OttProgress.findOne({ userId, contentId, episodeKey: episodeKey ?? null }).lean();
}

/** True when the title exists *and* a viewer is allowed to have it on their shelf. */
export async function findViewable(db, id) {
  return db.Ott.findOne({ _id: id, ...isPublished() }).select({ episodes: 1, kind: 1 }).lean();
}

export async function upsertProgress(db, doc) {
  await db.OttProgress.updateOne(
    { userId: doc.userId, contentId: doc.contentId, episodeKey: doc.episodeKey ?? null },
    { $set: doc },
    { upsert: true },
  );
}

export async function removeProgress(db, userId, contentId, episodeKey) {
  const match = { userId, contentId };
  // No key means "the whole title" — both the single-subject row and every episode's.
  if (episodeKey) match.episodeKey = episodeKey;
  const res = await db.OttProgress.deleteMany(match);
  return res.deletedCount ?? 0;
}
