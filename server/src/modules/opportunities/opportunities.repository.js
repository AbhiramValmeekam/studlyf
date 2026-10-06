import { pagedList } from '../../common/utilities/listing.js';
import { idOf } from '../../common/utilities/media.js';
import { isPublished } from '../../common/utilities/publishing.js';
import { prefixSearchFilter, searchTokens, escapeRegex } from '../../common/utilities/text.js';
import { categoryIdBySlug } from '../taxonomy/taxonomy.service.js';

const NOTHING = { _id: null }; // matches no document

export function lifecycleFilter(state, now = new Date()) {
  const open = {
    $and: [
      { $or: [{ applicationDeadline: null }, { applicationDeadline: { $gt: now } }] },
      { $or: [{ endDate: null }, { endDate: { $gt: now } }] },
    ],
  };
  if (state === 'open') return open;
  if (state === 'closed') return { $nor: [open] };
  return { startDate: { $gt: now } };
}

export async function publicMatch(db, f) {
  const and = [isPublished()];
  const text = prefixSearchFilter(f.q);
  if (text) and.push(text);
  if (f.type) and.push({ type: f.type });
  if (f.mode) and.push({ mode: f.mode });
  if (f.location) and.push({ location: { $regex: escapeRegex(f.location), $options: 'i' } });
  if (f.featured !== undefined) and.push({ featured: f.featured });
  if (f.status) and.push(lifecycleFilter(f.status));
  if (f.skill) and.push({ 'skills.slug': f.skill.toLowerCase() });
  if (f.category) {
    const categoryId = await categoryIdBySlug(db, 'OPPORTUNITY', f.category);
    and.push(categoryId ? { categoryId } : NOTHING);
  }
  return { $and: and };
}

function sortFor(sort, q) {
  const hasQuery = searchTokens(q).length > 0;
  const effective = sort ?? (hasQuery ? 'relevance' : undefined);
  if (effective === 'relevance' && hasQuery) return { rankQuery: q, sort: { _rank: -1, publishedAt: -1 } };
  if (effective === 'deadline') return { nullsLast: 'applicationDeadline', sort: { _nullsLast: 1, applicationDeadline: 1, publishedAt: -1 } };
  if (effective === 'newest') return { sort: { publishedAt: -1 } };
  return { sort: { featured: -1, publishedAt: -1 } };
}

export async function listPublic(db, query) {
  const { page, pageSize, sort, ...filters } = query;
  return pagedList(db.Opportunity, {
    match: await publicMatch(db, filters),
    page,
    pageSize,
    ...sortFor(sort, filters.q),
  });
}

export async function listFeatured(db, limit) {
  const { rows } = await pagedList(db.Opportunity, {
    match: { $and: [isPublished(), { featured: true }, lifecycleFilter('open')] },
    nullsLast: 'applicationDeadline',
    sort: { _nullsLast: 1, applicationDeadline: 1, publishedAt: -1 },
    page: 1,
    pageSize: limit,
  });
  return rows;
}

export async function findPublicBySlug(db, slug) {
  return db.Opportunity.findOne({ slug, ...isPublished() }).lean();
}

export async function findById(db, id) {
  return db.Opportunity.findById(id).lean();
}

export async function listAdmin(
  db,
  f,
) {
  const and = [];
  const text = prefixSearchFilter(f.q);
  if (text) and.push(text);
  if (f.status) and.push({ status: f.status });
  if (f.type) and.push({ type: f.type });
  if (f.featured !== undefined) and.push({ featured: f.featured });
  return pagedList(db.Opportunity, {
    match: and.length ? { $and: and } : {},
    sort: { updatedAt: -1 },
    page: f.page,
    pageSize: f.pageSize,
  });
}

/** Only active partners are shown publicly next to an opportunity. */
export async function partnersFor(db, ids) {
  const unique = [...new Set(ids.map(idOf).filter((v) => !!v))];
  if (!unique.length) return new Map();
  const rows = await db.Partner.find({ _id: { $in: unique }, active: true }).select({ name: 1, slug: 1 }).lean();
  return new Map(rows.map((r) => [String(r._id), { id: String(r._id), name: r.name, slug: r.slug }]));
}

/**
 * The public organizer page is addressed by slug, so a card links there with the slug alone —
 * no internal id needs to leave the server. Only ACTIVE organizations are exposed; a suspended
 * organization's page 404s, and linking to it would be a dead end.
 */
export async function organizationsFor(db, ids) {
  const unique = [...new Set(ids.map(idOf).filter((v) => !!v))];
  if (!unique.length) return new Map();
  const rows = await db.Organization.find({ _id: { $in: unique }, status: 'ACTIVE' })
    .select({ name: 1, slug: 1, type: 1 })
    .lean();
  return new Map(rows.map((r) => [String(r._id), { name: r.name, slug: r.slug, type: r.type ?? null }]));
}
