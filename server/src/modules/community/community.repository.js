import { prefixSearchFilter } from '../../common/utilities/text.js';
import { discoverableFilter, isLinkViewable } from '../projects/access.js';

// Phase 3: the feed shows exactly what public discovery shows (PUBLIC + published + not archived
// + not moderated away) — one visibility rule for the whole platform (see projects/access.js).
function feedMatch({ category, tag, q }) {
  const match = discoverableFilter();
  if (category) match.category = category;
  if (tag) match.tags = tag;
  const search = prefixSearchFilter(q);
  if (search) Object.assign(match, search);
  return match;
}

/**
 * Community feed. TOP sorts by upvotes, NEW by publish time, TRENDING by a time-decayed
 * upvote score (Hacker-News style) computed in the pipeline. Search helper arrays are projected out.
 */
export async function feed(db, { sort, category, tag, q, page, pageSize }) {
  const match = feedMatch({ category, tag, q });
  const pipeline = [{ $match: match }];
  let sortStage;
  if (sort === 'TOP') {
    sortStage = { upvoteCount: -1, publishedAt: -1, _id: -1 };
  } else if (sort === 'NEW') {
    sortStage = { publishedAt: -1, _id: -1 };
  } else {
    pipeline.push({
      $addFields: {
        _trend: {
          $divide: [
            { $add: ['$upvoteCount', 1] },
            {
              $pow: [
                { $add: [{ $divide: [{ $subtract: ['$$NOW', '$publishedAt'] }, 3_600_000] }, 2] },
                1.5,
              ],
            },
          ],
        },
      },
    });
    sortStage = { _trend: -1, _id: -1 };
  }
  pipeline.push(
    { $sort: sortStage },
    { $skip: (page - 1) * pageSize },
    { $limit: pageSize },
    { $project: { searchTerms: 0, titleTerms: 0, _trend: 0, __v: 0 } },
  );
  const [rows, total] = await Promise.all([db.Project.aggregate(pipeline), db.Project.countDocuments(match)]);
  return { rows, total };
}

/** A project page by slug — public or unlisted links work; private/moderated ones don't. */
export async function findPublishedBySlug(db, slug) {
  const row = await db.Project.findOne({ slug }).lean();
  return row && isLinkViewable(row) ? row : null;
}

export async function findById(db, id) {
  return db.Project.findById(id).lean();
}

export async function listByAuthor(db, userId) {
  return db.Project.find({ authorUserId: userId }).sort({ updatedAt: -1 }).lean();
}

/** Published projects authored by a builder profile — powers the public portfolio view. */
export async function listPublishedByProfile(db, profileId) {
  return db.Project.find({ authorProfileId: profileId, ...discoverableFilter() }).sort({ upvoteCount: -1, publishedAt: -1 }).lean();
}

export async function popularTags(db, limit) {
  return db.Project.aggregate([
    { $match: discoverableFilter() },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: limit },
    { $project: { _id: 0, tag: '$_id', count: 1 } },
  ]);
}

/** Top builders by total upvotes across their published projects (then project count). */
export async function leaderboard(db, limit) {
  return db.Project.aggregate([
    { $match: discoverableFilter() },
    { $group: { _id: '$authorProfileId', upvotes: { $sum: '$upvoteCount' }, projects: { $sum: 1 } } },
    { $sort: { upvotes: -1, projects: -1, _id: 1 } },
    { $limit: limit },
    { $lookup: { from: 'builder_profiles', localField: '_id', foreignField: '_id', as: 'profile' } },
    { $unwind: '$profile' },
    {
      $project: {
        _id: 0,
        profileId: '$_id',
        upvotes: 1,
        projects: 1,
        username: '$profile.username',
        headline: '$profile.headline',
        userId: '$profile.userId',
      },
    },
  ]);
}

export async function categoryCounts(db) {
  return db.Project.aggregate([
    { $match: discoverableFilter() },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $project: { _id: 0, category: '$_id', count: 1 } },
  ]);
}

/** Which of these project ids the given user has upvoted (for the `upvoted` flag on cards). */
export async function upvotedProjectIds(db, userId, projectIds) {
  if (!projectIds.length) return new Set();
  const rows = await db.ProjectUpvote.find({ userId, projectId: { $in: projectIds } }).select({ projectId: 1 }).lean();
  return new Set(rows.map((r) => String(r.projectId)));
}
