import { titleRankExpression } from './text.js';

/**
 * Paged listing via one aggregation (for computed sort keys) plus a parallel count.
 * Search helper arrays and computed keys are always projected out.
 * `match` must contain already-cast values (ObjectIds, Dates) — aggregation skips
 * Mongoose casting.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function pagedList(model, opts) {
  const computed = [];
  if (opts.rankQuery) computed.push({ $addFields: { _rank: titleRankExpression(opts.rankQuery) } });
  if (opts.nullsLast) {
    computed.push({ $addFields: { _nullsLast: { $cond: [{ $eq: [{ $ifNull: [`$${opts.nullsLast}`, null] }, null] }, 1, 0] } } });
  }
  const pipeline = [
    { $match: opts.match },
    ...computed,
    { $sort: { ...opts.sort, _id: -1 } }, // _id tiebreak keeps pagination stable
    { $skip: (opts.page - 1) * opts.pageSize },
    { $limit: opts.pageSize },
    { $project: { searchTerms: 0, titleTerms: 0, _rank: 0, _nullsLast: 0, __v: 0 } },
  ];
  const [rows, total] = await Promise.all([model.aggregate(pipeline), model.countDocuments(opts.match)]);
  return { rows, total };
}
