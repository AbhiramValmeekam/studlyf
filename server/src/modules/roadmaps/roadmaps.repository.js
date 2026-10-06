import { pagedList } from '../../common/utilities/listing.js';
import { isPublished } from '../../common/utilities/publishing.js';
import { prefixSearchFilter, searchTokens } from '../../common/utilities/text.js';

export function publicMatch(f) {
  const and = [isPublished()];
  const text = prefixSearchFilter(f.q);
  if (text) and.push(text);
  if (f.roleFamily) and.push({ roleFamily: f.roleFamily });
  if (f.featured !== undefined) and.push({ featured: f.featured });
  return { $and: and };
}

function sortFor(sort, q) {
  const hasQuery = searchTokens(q).length > 0;
  if ((sort ?? (hasQuery ? 'relevance' : undefined)) === 'relevance' && hasQuery) {
    return { rankQuery: q, sort: { _rank: -1, publishedAt: -1 } };
  }
  return { sort: { featured: -1, role: 1 } };
}

export async function listPublic(db, query) {
  const { page, pageSize, sort, ...filters } = query;
  return pagedList(db.RoadmapTemplate, { match: publicMatch(filters), page, pageSize, ...sortFor(sort, filters.q) });
}

export async function findPublicBySlug(db, slug) {
  return db.RoadmapTemplate.findOne({ slug, ...isPublished() }).lean();
}

/** Templates are matched by slug even when unpublished, so an existing goal keeps resolving. */
export async function findBySlug(db, slug) {
  return db.RoadmapTemplate.findOne({ slug }).lean();
}

export async function findById(db, id) {
  return db.RoadmapTemplate.findById(id).lean();
}

export async function listRoleFamilies(db) {
  return db.RoadmapTemplate.distinct('roleFamily', isPublished());
}

export async function findMine(db, userId) {
  return db.UserRoadmap.findOne({ userId }).lean();
}

export async function listAdmin(db, f) {
  const and = [];
  const text = prefixSearchFilter(f.q);
  if (text) and.push(text);
  if (f.status) and.push({ status: f.status });
  if (f.roleFamily) and.push({ roleFamily: f.roleFamily });
  if (f.featured !== undefined) and.push({ featured: f.featured });
  return pagedList(db.RoadmapTemplate, {
    match: and.length ? { $and: and } : {},
    sort: { updatedAt: -1 },
    page: f.page,
    pageSize: f.pageSize,
  });
}
