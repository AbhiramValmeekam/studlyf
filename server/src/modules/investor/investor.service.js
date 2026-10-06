import mongoose from 'mongoose';
import { AppError } from '../../common/errors/app-error.js';
import { escapeRegex, prefixSearchFilter } from '../../common/utilities/text.js';
import { createNotification } from '../notifications/notifications.service.js';
import { resubmission } from '../ecosystems/access.service.js';
import { foundersUsers, toInvestorView } from '../founder/founder.views.js';
import * as saved from '../saved/saved.service.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));

// ---- access request ------------------------------------------------------------

const requestView = (p) =>
  p
    ? {
        id: String(p._id),
        status: p.status,
        statusNote: p.statusNote ?? null,
        submittedAt: p.submittedAt,
        reviewedAt: p.reviewedAt ?? null,
        firmName: p.firmName,
        title: p.title ?? null,
        investorType: p.investorType,
        website: p.website ?? null,
        linkedin: p.linkedin ?? null,
        stages: p.stages ?? [],
        sectors: p.sectors ?? [],
        geographies: p.geographies ?? [],
        startupTypes: p.startupTypes ?? [],
        checkSize: p.checkSize ?? null,
        thesis: p.thesis ?? null,
      }
    : null;

export async function getRequest(db, userId) {
  return requestView(await db.InvestorProfile.findOne({ userId }).lean());
}

/** Create or update the investor access request. Access itself is only ever granted by an admin. */
export async function submitRequest(db, userId, input) {
  const existing = await db.InvestorProfile.findOne({ userId }).lean();
  const statusFields = resubmission(existing);
  if (existing) {
    await db.InvestorProfile.updateOne({ _id: existing._id }, { $set: { ...input, ...statusFields } }, { runValidators: true });
  } else {
    try {
      await db.InvestorProfile.create({ userId, ...input, ...statusFields });
    } catch (err) {
      if (err?.code === 11000) throw new AppError('CONFLICT', 'You already have an investor access request.');
      throw err;
    }
  }
  return { request: await getRequest(db, userId), resubmitted: !!statusFields.status && !!existing, created: !existing };
}

// ---- founder & startup discovery ---------------------------------------------------

/** Discoverable = founder opted in, finished onboarding, and the account is active. */
async function discoverableMatch(db, { q, industry, stage, fundingStage, startupType, location, savedIds }) {
  const match = { discoverable: true, onboardingCompletedAt: { $ne: null } };
  if (savedIds) match._id = { $in: savedIds };
  if (startupType) match['startup.type'] = startupType;
  if (industry) match['startup.industry'] = new RegExp(`^${escapeRegex(industry)}$`, 'i');
  if (stage) match['startup.stage'] = stage;
  if (fundingStage) match['startup.fundingStage'] = fundingStage;
  if (location) {
    const re = new RegExp(escapeRegex(location), 'i');
    match.$or = [{ location: re }, { 'startup.location': re }];
  }
  Object.assign(match, prefixSearchFilter(q) ?? {});
  const inactive = await db.User.find({ status: { $ne: 'ACTIVE' } }).select({ _id: 1 }).lean();
  if (inactive.length) match.userId = { $nin: inactive.map((u) => u._id) };
  return match;
}

async function connectionsFor(db, investorUserId, founderProfileIds) {
  const rows = await db.InvestorConnection.find({ investorUserId, founderProfileId: { $in: founderProfileIds } }).lean();
  return new Map(rows.map((c) => [String(c.founderProfileId), c]));
}

/**
 * The investor's shortlist lives in the platform-wide `saved_items` table (spec §57), not in a
 * field of their own profile — so "saved" means one thing everywhere. The legacy
 * `investorProfile.savedFounderProfileIds` array is still read as a fallback for rows the
 * migration has not yet copied, and is never written to again.
 */
async function savedIdsOf(db, investorUserId) {
  const rows = await saved.idsOfType(db, investorUserId, 'FOUNDER');
  if (rows.length) return rows.map((r) => r.entityId);
  const p = await db.InvestorProfile.findOne({ userId: investorUserId }).select({ savedFounderProfileIds: 1 }).lean();
  return p?.savedFounderProfileIds ?? [];
}

export async function discover(db, investorUserId, query) {
  const saved = await savedIdsOf(db, investorUserId);
  const match = await discoverableMatch(db, { ...query, savedIds: query.saved ? saved : undefined });
  const savedSet = new Set(saved.map(String));
  const sort = query.sort === 'newest' ? { createdAt: -1 } : { updatedAt: -1 };
  const [rows, total] = await Promise.all([
    db.FounderProfile.find(match).sort({ ...sort, _id: -1 }).skip((query.page - 1) * query.pageSize).limit(query.pageSize).lean(),
    db.FounderProfile.countDocuments(match),
  ]);
  const [users, connections] = await Promise.all([foundersUsers(db, rows), connectionsFor(db, investorUserId, rows.map((r) => r._id))]);
  return {
    items: rows.map((p) => ({ ...toInvestorView(p, users.get(String(p.userId)), connections.get(String(p._id))), saved: savedSet.has(String(p._id)) })),
    total,
  };
}

/** Facet values for the discovery filters (industries and locations actually in use). */
export async function facets(db) {
  const base = { discoverable: true, onboardingCompletedAt: { $ne: null } };
  const [industries, stages, total] = await Promise.all([
    db.FounderProfile.distinct('startup.industry', base),
    db.FounderProfile.aggregate([{ $match: base }, { $group: { _id: '$startup.stage', n: { $sum: 1 } } }]),
    db.FounderProfile.countDocuments(base),
  ]);
  return {
    total,
    industries: industries.filter(Boolean).sort(),
    stages: Object.fromEntries(stages.filter((s) => s._id).map((s) => [s._id, s.n])),
  };
}

export async function getFounder(db, investorUserId, id) {
  const p = await db.FounderProfile.findOne({ _id: id, discoverable: true, onboardingCompletedAt: { $ne: null } }).lean();
  if (!p) throw AppError.notFound('Founder');
  const users = await foundersUsers(db, [p]);
  const user = users.get(String(p.userId));
  if (user?.status !== 'ACTIVE') throw AppError.notFound('Founder');
  const [connection, saved] = await Promise.all([
    db.InvestorConnection.findOne({ investorUserId, founderProfileId: p._id }).lean(),
    savedIdsOf(db, investorUserId),
  ]);
  return { ...toInvestorView(p, user, connection, { detail: true }), saved: saved.some((x) => String(x) === String(p._id)) };
}

// ---- connections -------------------------------------------------------------------

export async function requestConnection(db, investorUserId, { founderProfileId, message }) {
  const p = await db.FounderProfile.findOne({ _id: founderProfileId, discoverable: true, onboardingCompletedAt: { $ne: null } }).lean();
  if (!p) throw AppError.notFound('Founder');
  if (String(p.userId) === String(investorUserId)) throw new AppError('BAD_REQUEST', 'You can’t connect with your own startup.');

  const existing = await db.InvestorConnection.findOne({ investorUserId, founderProfileId }).lean();
  if (existing && ['PENDING', 'ACCEPTED'].includes(existing.status)) {
    throw new AppError('CONFLICT', existing.status === 'PENDING' ? 'Your request is already waiting for the founder.' : 'You’re already connected.');
  }
  if (existing?.status === 'DECLINED') throw new AppError('CONFLICT', 'The founder declined an earlier request from you.');

  let id;
  if (existing) {
    await db.InvestorConnection.updateOne({ _id: existing._id }, { $set: { status: 'PENDING', message: message ?? null, respondedAt: null } });
    id = existing._id;
  } else {
    try {
      id = (await db.InvestorConnection.create({ investorUserId, founderProfileId, founderUserId: p.userId, message: message ?? null }))._id;
    } catch (err) {
      if (err?.code === 11000) throw new AppError('CONFLICT', 'Your request is already waiting for the founder.');
      throw err;
    }
  }
  const investor = await db.InvestorProfile.findOne({ userId: investorUserId }).select({ firmName: 1 }).lean();
  await createNotification(db, {
    userId: p.userId,
    type: 'INVESTOR_CONNECTION',
    title: `${investor?.firmName ?? 'An investor'} wants to connect about ${p.startup?.name ?? 'your startup'}`,
    body: message ?? null,
    data: { connectionId: String(id), path: '/founders/investors' },
  });
  return getFounder(db, investorUserId, founderProfileId);
}

export async function listConnections(db, investorUserId, { status, page, pageSize }) {
  const filter = { investorUserId: new mongoose.Types.ObjectId(String(investorUserId)) };
  if (status) filter.status = status;
  const [rows, total] = await Promise.all([
    db.InvestorConnection.find(filter).sort({ updatedAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    db.InvestorConnection.countDocuments(filter),
  ]);
  const profiles = await db.FounderProfile.find({ _id: { $in: rows.map((r) => r.founderProfileId) } }).lean();
  const users = await foundersUsers(db, profiles);
  const byId = new Map(profiles.map((p) => [String(p._id), p]));
  return {
    items: rows.map((c) => {
      const p = byId.get(String(c.founderProfileId));
      return {
        id: String(c._id),
        status: c.status,
        message: c.message ?? null,
        createdAt: c.createdAt,
        respondedAt: c.respondedAt ?? null,
        founder: p ? toInvestorView(p, users.get(String(p.userId)), c) : null,
        contactEmail: c.status === 'ACCEPTED' && p ? (users.get(String(p.userId))?.email ?? null) : null,
      };
    }),
    total,
  };
}

export async function withdraw(db, investorUserId, id) {
  const { modifiedCount } = await db.InvestorConnection.updateOne({ _id: id, investorUserId, status: 'PENDING' }, { $set: { status: 'WITHDRAWN' } });
  if (!modifiedCount) {
    if (!(await db.InvestorConnection.exists({ _id: id, investorUserId }))) throw AppError.notFound('Connection request');
    throw new AppError('CONFLICT', 'Only pending requests can be withdrawn.');
  }
  return { id, status: 'WITHDRAWN' };
}

// ---- saved / shortlisted -------------------------------------------------------------

export async function setSaved(db, investorUserId, founderProfileId, savedFlag) {
  if (savedFlag) {
    const exists = await db.FounderProfile.exists({ _id: founderProfileId, discoverable: true, onboardingCompletedAt: { $ne: null } });
    if (!exists) throw AppError.notFound('Founder');
    await saved.save(db, investorUserId, { entityType: 'FOUNDER', entityId: founderProfileId });
  } else {
    await saved.unsave(db, investorUserId, { entityType: 'FOUNDER', entityId: founderProfileId });
  }
  return { founderProfileId, saved: savedFlag };
}

// ---- investor intelligence ---------------------------------------------------------

/**
 * How the discoverable pipeline sits against the investor's own preferences: how many startups
 * match their funding stages / sectors / startup types, what changed recently, and the
 * distribution by industry, stage and type. Aggregates only.
 */
export async function intelligence(db, investorUserId) {
  const prefs = await db.InvestorProfile.findOne({ userId: investorUserId }).lean();
  const base = { discoverable: true, onboardingCompletedAt: { $ne: null } };
  const group = (field) =>
    db.FounderProfile.aggregate([{ $match: base }, { $group: { _id: '$' + field, n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 12 }]);
  const matchFilter = { ...base };
  if (prefs?.stages?.length) matchFilter['startup.fundingStage'] = { $in: prefs.stages };
  if (prefs?.sectors?.length) matchFilter['startup.industry'] = { $in: prefs.sectors.map((x) => new RegExp('^' + escapeRegex(x) + '$', 'i')) };
  if (prefs?.startupTypes?.length) matchFilter['startup.type'] = { $in: prefs.startupTypes };
  const [byIndustry, byStage, byType, total, matching, recentlyUpdated] = await Promise.all([
    group('startup.industry'),
    group('startup.stage'),
    group('startup.type'),
    db.FounderProfile.countDocuments(base),
    db.FounderProfile.countDocuments(matchFilter),
    db.FounderProfile.countDocuments({ ...base, updatedAt: { $gte: new Date(Date.now() - 14 * 86_400_000) } }),
  ]);
  const clean = (rows) => rows.filter((r) => r._id).map((r) => ({ key: r._id, count: r.n }));
  return {
    total,
    matchingPreferences: matching,
    updatedLast14Days: recentlyUpdated,
    byIndustry: clean(byIndustry),
    byStage: clean(byStage),
    byStartupType: clean(byType),
    preferences: {
      stages: prefs?.stages ?? [],
      sectors: prefs?.sectors ?? [],
      geographies: prefs?.geographies ?? [],
      startupTypes: prefs?.startupTypes ?? [],
      checkSize: prefs?.checkSize ?? null,
    },
  };
}

export async function dashboard(db, investorUserId) {
  const [profile, facetData, recent, counts, intel, saved] = await Promise.all([
    getRequest(db, investorUserId),
    facets(db),
    discover(db, investorUserId, { page: 1, pageSize: 4 }),
    db.InvestorConnection.aggregate([
      { $match: { investorUserId: new mongoose.Types.ObjectId(String(investorUserId)) } },
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]),
    intelligence(db, investorUserId),
    savedIdsOf(db, investorUserId),
  ]);
  const byStatus = Object.fromEntries(counts.map((c) => [c._id, c.n]));
  return {
    profile,
    discoverableStartups: facetData.total,
    stages: facetData.stages,
    connections: { pending: byStatus.PENDING ?? 0, accepted: byStatus.ACCEPTED ?? 0, declined: byStatus.DECLINED ?? 0 },
    recentStartups: recent.items,
    saved: saved.length,
    intelligence: intel,
  };
}
