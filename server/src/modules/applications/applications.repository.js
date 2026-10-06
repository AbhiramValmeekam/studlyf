import mongoose from 'mongoose';

const oid = (v) => new mongoose.Types.ObjectId(v);

export async function findOpportunity(db, id) {
  return db.Opportunity.findById(id).lean();
}

export async function insert(db, doc) {
  return db.Application.create(doc);
}

export async function findOwned(db, userId, id) {
  return db.Application.findOne({ _id: id, builderUserId: userId }).lean();
}

export async function findById(db, id) {
  return db.Application.findById(id).lean();
}

export async function listOwned(db, userId, { status, page, pageSize }) {
  const filter = { builderUserId: userId };
  if (status) filter.status = status;
  const [rows, total] = await Promise.all([
    db.Application.find(filter)
      .sort({ updatedAt: -1, _id: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    db.Application.countDocuments(filter),
  ]);
  return { rows, total };
}

export async function listByOpportunity(db, opportunityId, { status, page, pageSize }) {
  const filter = { opportunityId };
  if (status) filter.status = status;
  const [rows, total] = await Promise.all([
    db.Application.find(filter)
      .sort({ submittedAt: -1, updatedAt: -1, _id: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    db.Application.countDocuments(filter),
  ]);
  return { rows, total };
}

/** Returns a { STATUS: count } map for a builder's applications (used by the dashboard). */
export async function countsByStatus(db, userId) {
  const rows = await db.Application.aggregate([
    { $match: { builderUserId: oid(userId) } },
    { $group: { _id: '$status', n: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id, r.n]));
}

// The application-journey stages, in the order a builder advances through them. REJECTED and
// WITHDRAWN are terminal side-exits, not rungs on the ladder, so they carry no rank of their
// own — where they sit on the journey is read from the history that led there.
const FUNNEL_STAGES = ['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'SELECTED'];
const STAGE_RANK = { DRAFT: 0, SUBMITTED: 1, UNDER_REVIEW: 2, SHORTLISTED: 3, SELECTED: 4 };

/**
 * How many applications have *reached* each stage — cumulative, so the journey reads as a
 * funnel: someone shortlisted has, by definition, applied. Current status alone can't answer
 * this, because an application that has moved on is no longer SUBMITTED, so the furthest rank
 * in statusHistory is used, falling back to the current status for rows with no audit trail.
 * A DRAFT never reached SUBMITTED and is therefore not counted as an application made.
 */
export async function funnelByStage(db, userId) {
  const rows = await db.Application
    .find({ builderUserId: oid(userId) })
    .select({ status: 1, statusHistory: 1 })
    .lean();

  const funnel = Object.fromEntries(FUNNEL_STAGES.map((s) => [s, 0]));
  for (const row of rows) {
    let rank = STAGE_RANK[row.status] ?? 0;
    for (const event of row.statusHistory ?? []) {
      rank = Math.max(rank, STAGE_RANK[event.status] ?? 0);
    }
    FUNNEL_STAGES.forEach((stage, i) => {
      if (rank >= i + 1) funnel[stage] += 1;
    });
  }
  return funnel;
}

export async function updateAnswers(db, id, answers) {
  return db.Application.updateOne({ _id: id }, { $set: { answers } });
}

/** Sets the new status and appends an immutable audit event to statusHistory. */
export async function applyStatus(db, id, { status, note = null, byUserId = null, extraSet = {} }) {
  const event = { status, at: new Date(), byUserId, note };
  return db.Application.updateOne({ _id: id }, { $set: { status, ...extraSet }, $push: { statusHistory: event } });
}
