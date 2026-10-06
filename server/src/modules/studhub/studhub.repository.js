import { pagedList } from '../../common/utilities/listing.js';
import { isPublished } from '../../common/utilities/publishing.js';
import { prefixSearchFilter, searchTokens } from '../../common/utilities/text.js';

export function publicMatch(f) {
  const and = [isPublished()];
  const text = prefixSearchFilter(f.q);
  if (text) and.push(text);
  if (f.type) and.push({ type: f.type });
  if (f.featured !== undefined) and.push({ featured: f.featured });
  if (f.tag) and.push({ 'tags.slug': f.tag.toLowerCase() });
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
  return pagedList(db.StudhubBenefit, { match: publicMatch(filters), page, pageSize, ...sortFor(sort, filters.q) });
}

export async function findPublicBySlug(db, slug) {
  return db.StudhubBenefit.findOne({ slug, ...isPublished() }).lean();
}

export async function findById(db, id) {
  return db.StudhubBenefit.findById(id).lean();
}

export async function listAdmin(db, f) {
  const and = [];
  const text = prefixSearchFilter(f.q);
  if (text) and.push(text);
  if (f.status) and.push({ status: f.status });
  if (f.type) and.push({ type: f.type });
  if (f.featured !== undefined) and.push({ featured: f.featured });
  return pagedList(db.StudhubBenefit, {
    match: and.length ? { $and: and } : {},
    sort: { updatedAt: -1 },
    page: f.page,
    pageSize: f.pageSize,
  });
}
