import { pagedList } from '../../common/utilities/listing.js';
import mongoose from 'mongoose';
import { isPublished } from '../../common/utilities/publishing.js';
import { escapeRegex, prefixSearchFilter, searchTokens } from '../../common/utilities/text.js';
import { categoryIdBySlug } from '../taxonomy/taxonomy.service.js';

const NOTHING = { _id: null }; // matches no document

/**
 * `pagedList` aggregates, and an aggregation `$match` skips Mongoose casting — a string id would
 * silently match nothing (the count, which does cast, would disagree with the rows). Every id that
 * reaches a pipeline goes through here first.
 */
const oid = (v) => new mongoose.Types.ObjectId(String(v));

/** Jobs share the opportunity taxonomy rather than opening a second one (spec §96). */
const CATEGORY_SCOPE = 'OPPORTUNITY';

export async function publicMatch(db, f) {
  const and = [isPublished()];
  const text = prefixSearchFilter(f.q);
  if (text) and.push(text);
  if (f.employmentType) and.push({ employmentType: f.employmentType });
  if (f.workMode) and.push({ workMode: f.workMode });
  if (f.experienceLevel) and.push({ experienceLevel: f.experienceLevel });
  if (f.location) and.push({ location: { $regex: escapeRegex(f.location), $options: 'i' } });
  if (f.featured !== undefined) and.push({ featured: f.featured });
  if (f.skill) and.push({ 'skills.slug': f.skill.toLowerCase() });
  if (f.category) {
    const categoryId = await categoryIdBySlug(db, CATEGORY_SCOPE, f.category);
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
  return pagedList(db.Job, {
    match: await publicMatch(db, filters),
    page,
    pageSize,
    ...sortFor(sort, filters.q),
  });
}

export async function findPublicBySlug(db, slug) {
  return db.Job.findOne({ slug, ...isPublished() }).lean();
}

export async function findById(db, id) {
  return db.Job.findById(id).lean();
}

/** HR-scoped reads are always filtered by owner, so one HR user can never see another's drafts. */
export async function findForHr(db, id, hrUserId) {
  return db.Job.findOne({ _id: id, hrUserId }).lean();
}

export async function listForHr(db, hrUserId, f) {
  const and = [{ hrUserId: oid(hrUserId) }];
  const text = prefixSearchFilter(f.q);
  if (text) and.push(text);
  if (f.status) and.push({ status: f.status });
  return pagedList(db.Job, {
    match: { $and: and },
    sort: { updatedAt: -1 },
    page: f.page,
    pageSize: f.pageSize,
  });
}

/**
 * How many candidates each job has in the private pipeline. One aggregate for a whole page, so the
 * job list does not issue a query per row.
 */
export async function pipelineCounts(db, hrUserId, jobIds) {
  if (!jobIds.length) return new Map();
  const rows = await db.HrCandidate.aggregate([
    { $match: { hrUserId: oid(hrUserId), jobId: { $in: jobIds.map(oid) } } },
    { $group: { _id: '$jobId', n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.n]));
}
