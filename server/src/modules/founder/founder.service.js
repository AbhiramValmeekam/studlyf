import { AppError } from '../../common/errors/app-error.js';
import { resolveSlug } from '../../common/utilities/slug.js';
import { createNotification } from '../notifications/notifications.service.js';
import { syncRole } from '../ecosystems/ecosystems.service.js';
import { foundersUsers, searchTermsOf, titleTermsOf, toOwn, toPublic } from './founder.views.js';

const userOf = (db, userId) => db.User.findById(userId).select({ name: 1 }).lean();

/**
 * The handle behind /founders/<slug>. An explicit one must be free (409 if not); otherwise it is
 * derived from the startup name, falling back to the founder's name when the startup has none.
 */
const slugFor = (db, input, fallbackName, excludeId) =>
  resolveSlug(db.FounderProfile, {
    ...(input.slug ? { explicit: input.slug } : { from: input.startup?.name || fallbackName || 'founder' }),
    ...(excludeId ? { excludeId } : {}),
  });

export async function getOwn(db, userId) {
  const [p, user] = await Promise.all([db.FounderProfile.findOne({ userId }).lean(), userOf(db, userId)]);
  if (!p) throw AppError.notFound('Founder profile');
  return toOwn(p, user);
}

/**
 * Founder onboarding. Creating the founder profile is what makes someone a founder: it grants the
 * FOUNDER role (self-service, like Builder) on the same account — never a second account.
 */
export async function create(db, userId, input) {
  if (await db.FounderProfile.exists({ userId })) throw new AppError('CONFLICT', 'You already have a founder profile.');
  const user = await userOf(db, userId);
  const now = new Date();
  const doc = {
    userId,
    headline: input.headline ?? null,
    bio: input.bio ?? null,
    linkedin: input.linkedin ?? null,
    location: input.location ?? null,
    discoverable: input.discoverable ?? true,
    // Safe by default (§68): the startup is investor-visible, not on the open web, until the
    // founder publishes it. The handle exists either way so a later reveal keeps the same URL.
    visibility: input.visibility ?? 'INVESTOR_VISIBLE',
    slug: await slugFor(db, input, user?.name),
    startup: input.startup,
    workspace: {},
    onboardingCompletedAt: now,
  };
  try {
    await db.FounderProfile.create({ ...doc, searchTerms: searchTermsOf(doc, user), titleTerms: titleTermsOf(doc, user) });
  } catch (err) {
    if (err?.code === 11000) {
      // Two unique indexes can raise this: userId (a second profile) or a slug race.
      if (await db.FounderProfile.exists({ userId })) throw new AppError('CONFLICT', 'You already have a founder profile.');
      throw new AppError('CONFLICT', 'That handle is already taken', [{ field: 'slug', message: 'Already in use' }]);
    }
    throw err;
  }
  await syncRole(db, userId, 'FOUNDER', true);
  return getOwn(db, userId);
}

export async function update(db, userId, patch) {
  const existing = await db.FounderProfile.findOne({ userId }).lean();
  if (!existing) throw AppError.notFound('Founder profile');
  const user = await userOf(db, userId);
  // slug/visibility are pulled out rather than spread: the editor posts every field it renders,
  // so a cleared control arrives as null and must mean "leave it as it is", not "erase it".
  const { startup, workspace, slug, visibility, ...rest } = patch;
  const set = { ...rest };
  if (visibility) set.visibility = visibility;
  if (startup) {
    const { traction, ...s } = startup;
    set.startup = { ...(existing.startup ?? {}), ...s };
    if (traction) set.startup.traction = { ...(existing.startup?.traction ?? {}), ...traction };
  }
  // An explicit handle has to be free; a profile that predates the field picks one up here, so a
  // founder created before /founders/<slug> existed becomes linkable on their next save.
  if (slug || !existing.slug) {
    set.slug = await slugFor(db, { slug, startup: set.startup ?? existing.startup }, user?.name, existing._id);
  }
  if (workspace) {
    const { swot, market, businessModelCanvas, gtm, pitchDeck, ...w } = workspace;
    set.workspace = { ...(existing.workspace ?? {}), ...w };
    // Each nested group merges key by key, so saving one field never clears its siblings.
    // competitorAnalysis is deliberately NOT here — it is an array and is replaced wholesale.
    for (const [key, value] of Object.entries({ swot, market, businessModelCanvas, gtm, pitchDeck })) {
      if (value) set.workspace[key] = { ...(existing.workspace?.[key] ?? {}), ...value };
    }
  }
  const merged = { ...existing, ...set };
  if (!merged.startup?.name || !merged.startup?.oneLiner) {
    throw AppError.validation([{ field: 'startup.name', message: 'Your startup needs a name and a one-liner.' }]);
  }
  set.searchTerms = searchTermsOf(merged, user);
  set.titleTerms = titleTermsOf(merged, user);
  await db.FounderProfile.updateOne({ _id: existing._id }, { $set: set }, { runValidators: true });
  return getOwn(db, userId);
}

/** The public startup page — only a PUBLIC profile resolves; anything else is simply not found. */
export async function getPublicBySlug(db, slug) {
  const p = await db.FounderProfile.findOne({ slug, visibility: 'PUBLIC' }).lean();
  if (!p) throw AppError.notFound('Founder');
  const user = (await foundersUsers(db, [p])).get(String(p.userId));
  return toPublic(p, user, user?.photo ?? null);
}

async function investorsFor(db, rows) {
  const ids = rows.map((r) => r.investorUserId);
  const [users, profiles] = await Promise.all([
    db.User.find({ _id: { $in: ids } }).select({ name: 1 }).lean(),
    db.InvestorProfile.find({ userId: { $in: ids } }).select({ userId: 1, firmName: 1, title: 1, investorType: 1, website: 1, status: 1, stages: 1, sectors: 1 }).lean(),
  ]);
  const nameOf = new Map(users.map((u) => [String(u._id), u.name]));
  return new Map(profiles.map((p) => [String(p.userId), { ...p, name: nameOf.get(String(p.userId)) ?? null }]));
}

function connectionView(c, investor) {
  return {
    id: String(c._id),
    status: c.status,
    message: c.message ?? null,
    createdAt: c.createdAt,
    respondedAt: c.respondedAt ?? null,
    investor: investor
      ? {
          name: investor.name,
          firmName: investor.firmName,
          title: investor.title ?? null,
          investorType: investor.investorType,
          website: investor.website ?? null,
          stages: investor.stages ?? [],
          sectors: investor.sectors ?? [],
        }
      : null,
  };
}

/** Incoming investor requests — only from investors whose access is currently ACTIVE. */
export async function listConnections(db, userId, { status, page, pageSize }) {
  const activeInvestors = await db.InvestorProfile.find({ status: 'ACTIVE' }).select({ userId: 1 }).lean();
  const filter = { founderUserId: userId, investorUserId: { $in: activeInvestors.map((i) => i.userId) } };
  if (status) filter.status = status;
  const [rows, total] = await Promise.all([
    db.InvestorConnection.find(filter).sort({ updatedAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    db.InvestorConnection.countDocuments(filter),
  ]);
  const investors = await investorsFor(db, rows);
  return { items: rows.map((c) => connectionView(c, investors.get(String(c.investorUserId)))), total };
}

export async function respond(db, userId, id, status) {
  const row = await db.InvestorConnection.findOne({ _id: id, founderUserId: userId }).lean();
  if (!row) throw AppError.notFound('Connection request');
  if (row.status !== 'PENDING') throw new AppError('CONFLICT', 'You have already responded to this request.');
  await db.InvestorConnection.updateOne({ _id: id, status: 'PENDING' }, { $set: { status, respondedAt: new Date() } });
  const founder = await db.FounderProfile.findOne({ userId }).select({ startup: 1 }).lean();
  await createNotification(db, {
    userId: row.investorUserId,
    type: 'INVESTOR_CONNECTION',
    title:
      status === 'ACCEPTED'
        ? `${founder?.startup?.name ?? 'A founder'} accepted your connection request`
        : `${founder?.startup?.name ?? 'A founder'} declined your connection request`,
    body: status === 'ACCEPTED' ? 'Their workspace and contact email are now visible to you.' : null,
    data: { connectionId: String(id), founderProfileId: String(row.founderProfileId), status, path: '/investors/connections' },
  });
  const fresh = await db.InvestorConnection.findById(id).lean();
  const investors = await investorsFor(db, [fresh]);
  return connectionView(fresh, investors.get(String(fresh.investorUserId)));
}

export async function dashboard(db, userId) {
  const [profile, user, pending, accepted] = await Promise.all([
    db.FounderProfile.findOne({ userId }).lean(),
    userOf(db, userId),
    listConnections(db, userId, { status: 'PENDING', page: 1, pageSize: 3 }),
    listConnections(db, userId, { status: 'ACCEPTED', page: 1, pageSize: 1 }),
  ]);
  return {
    profile: toOwn(profile, user),
    connections: { pending: pending.total, accepted: accepted.total, recentPending: pending.items },
  };
}

// ---- startup updates ---------------------------------------------------------------

const MAX_UPDATES = 100;

export async function addUpdate(db, userId, { title, body }) {
  const { modifiedCount } = await db.FounderProfile.updateOne(
    { userId, [`updates.${MAX_UPDATES - 1}`]: { $exists: false } },
    { $push: { updates: { title, body, createdAt: new Date() } } },
  );
  if (!modifiedCount) {
    if (!(await db.FounderProfile.exists({ userId }))) throw AppError.notFound('Founder profile');
    throw new AppError('CONFLICT', `You can keep up to ${MAX_UPDATES} updates — delete an old one first.`);
  }
  return getOwn(db, userId);
}

export async function removeUpdate(db, userId, updateId) {
  const { modifiedCount } = await db.FounderProfile.updateOne({ userId, 'updates._id': updateId }, { $pull: { updates: { _id: updateId } } });
  if (!modifiedCount) throw AppError.notFound('Update');
  return getOwn(db, userId);
}
