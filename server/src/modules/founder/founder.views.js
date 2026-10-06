import { loadMedia, pick } from '../../common/utilities/media.js';
import { termsOf } from '../../common/utilities/text.js';
import { readiness } from './readiness.js';

export const searchTermsOf = (p, user) =>
  termsOf(
    user?.name,
    p.headline,
    p.location,
    p.startup?.name,
    p.startup?.oneLiner,
    p.startup?.industry,
    p.startup?.location,
    p.startup?.description,
  );

/** Title words, so a startup ranks by relevance in unified search like every other document. */
export const titleTermsOf = (p, user) => termsOf(user?.name, p.headline, p.startup?.name);

const startupOut = (s = {}) => ({
  name: s.name ?? null,
  oneLiner: s.oneLiner ?? null,
  description: s.description ?? null,
  website: s.website ?? null,
  industry: s.industry ?? null,
  type: s.type ?? null,
  stage: s.stage ?? null,
  fundingStage: s.fundingStage ?? null,
  location: s.location ?? null,
  foundedYear: s.foundedYear ?? null,
  teamSize: s.teamSize ?? null,
  teamDescription: s.teamDescription ?? null,
  traction: {
    users: s.traction?.users ?? null,
    revenue: s.traction?.revenue ?? null,
    growth: s.traction?.growth ?? null,
    highlights: s.traction?.highlights ?? null,
  },
  // Dated snapshots for the growth chart — always oldest first, whatever order they were saved.
  tractionHistory: (s.tractionHistory ?? [])
    .map((p) => ({
      id: String(p._id),
      date: p.date,
      users: p.users ?? null,
      revenue: p.revenue ?? null,
      growth: p.growth ?? null,
      note: p.note ?? null,
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date)),
});

/** Null-fills a nested group so the client always receives the same set of keys. */
const group = (obj, keys) => Object.fromEntries(keys.map((k) => [k, obj?.[k] ?? null]));

const COMPETITOR_KEYS = ['name', 'description', 'strengths', 'weaknesses', 'pricing', 'positioning', 'differentiation'];
const MARKET_KEYS = ['market', 'customerSegment', 'tam', 'sam', 'som', 'trends', 'customerProblem', 'opportunity'];
const BUSINESS_MODEL_KEYS = ['customerSegments', 'valueProposition', 'channels', 'customerRelationships', 'revenueStreams', 'keyResources', 'keyActivities', 'keyPartnerships', 'costStructure'];
const GTM_KEYS = ['targetCustomers', 'positioning', 'acquisitionChannels', 'salesStrategy', 'pricing', 'launchPlan', 'growthStrategy', 'kpis'];
const PITCH_KEYS = ['problem', 'solution', 'product', 'market', 'businessModel', 'traction', 'competition', 'goToMarket', 'team', 'financials', 'fundingAsk'];

const workspaceOut = (w = {}) => ({
  problem: w.problem ?? null,
  targetCustomer: w.targetCustomer ?? null,
  marketAnalysis: w.marketAnalysis ?? null,
  competitors: w.competitors ?? null,
  swot: {
    strengths: w.swot?.strengths ?? null,
    weaknesses: w.swot?.weaknesses ?? null,
    opportunities: w.swot?.opportunities ?? null,
    threats: w.swot?.threats ?? null,
  },
  businessModel: w.businessModel ?? null,
  gtmStrategy: w.gtmStrategy ?? null,
  marketingStrategy: w.marketingStrategy ?? null,
  pitchDeckUrl: w.pitchDeckUrl ?? null,
  pitchNotes: w.pitchNotes ?? null,
  fundingNeeds: w.fundingNeeds ?? null,
  // Structured builders (spec §38–43). The free-text fields above are the older fallback and
  // are still returned alongside these until every founder has migrated across.
  market: group(w.market, MARKET_KEYS),
  competitorAnalysis: (w.competitorAnalysis ?? []).map((c) => group(c, COMPETITOR_KEYS)),
  businessModelCanvas: group(w.businessModelCanvas, BUSINESS_MODEL_KEYS),
  gtm: group(w.gtm, GTM_KEYS),
  pitchDeck: group(w.pitchDeck, PITCH_KEYS),
});

export const updatesOut = (updates = [], limit = 50) =>
  [...updates]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit)
    .map((u) => ({ id: String(u._id), title: u.title, body: u.body, createdAt: u.createdAt }));

/** The founder's own view — everything, plus the live readiness checklist. */
export function toOwn(p, user) {
  return {
    id: String(p._id),
    name: user?.name ?? null,
    slug: p.slug ?? null,
    visibility: p.visibility ?? 'INVESTOR_VISIBLE',
    headline: p.headline ?? null,
    bio: p.bio ?? null,
    linkedin: p.linkedin ?? null,
    location: p.location ?? null,
    discoverable: p.discoverable,
    startup: startupOut(p.startup),
    workspace: workspaceOut(p.workspace),
    updates: updatesOut(p.updates),
    readiness: readiness(p),
    onboardingCompletedAt: p.onboardingCompletedAt ?? null,
    updatedAt: p.updatedAt,
  };
}

/** Users (name, photo) for a batch of founder profiles — one query each, no N+1. */
export async function foundersUsers(db, rows) {
  const users = await db.User.find({ _id: { $in: rows.map((r) => r.userId) } }).select({ name: 1, email: 1, profilePhotoId: 1, status: 1 }).lean();
  const media = await loadMedia(db, users.map((u) => u.profilePhotoId));
  return new Map(users.map((u) => [String(u._id), { ...u, photo: pick(media, u.profilePhotoId) }]));
}

/**
 * A result card: enough to recognise a startup and link to its page, without the updates
 * timeline. Used by unified search and the saved list so one founder reads identically in both.
 */
export function toCard(p, user, photo = null) {
  const s = p.startup ?? {};
  return {
    slug: p.slug,
    name: user?.name ?? null,
    headline: p.headline ?? null,
    location: p.location ?? null,
    photo: photo ?? user?.photo ?? null,
    startup: {
      name: s.name ?? null,
      oneLiner: s.oneLiner ?? null,
      industry: s.industry ?? null,
      stage: s.stage ?? null,
      location: s.location ?? null,
    },
  };
}

/**
 * The public startup page (spec §68/§82). Strictly allow-listed — only the fields a founder
 * would put on a landing page. Traction numbers, the strategy workspace, the team description
 * and the founder's email are never in this payload, whatever the client asks for; and only a
 * PUBLIC profile ever reaches this serializer.
 */
export function toPublic(p, user, photo = null) {
  const s = p.startup ?? {};
  return {
    slug: p.slug,
    founder: {
      name: user?.name ?? null,
      photo: photo ?? null,
      headline: p.headline ?? null,
      location: p.location ?? null,
    },
    startup: {
      name: s.name ?? null,
      oneLiner: s.oneLiner ?? null,
      description: s.description ?? null,
      website: s.website ?? null,
      industry: s.industry ?? null,
      type: s.type ?? null,
      stage: s.stage ?? null,
      fundingStage: s.fundingStage ?? null,
      location: s.location ?? null,
      foundedYear: s.foundedYear ?? null,
      teamSize: s.teamSize ?? null,
    },
    // The founder's own announcements are part of the pitch — the five most recent.
    updates: updatesOut(p.updates, 5),
    memberSince: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

/**
 * What a verified investor sees. The strategy workspace and the founder's email are shared only
 * once the founder has ACCEPTED a connection — before that, the public startup profile, traction
 * and the readiness checklist (which sections exist, not their contents).
 */
export function toInvestorView(p, user, connection = null, { detail = false } = {}) {
  const connected = connection?.status === 'ACCEPTED';
  const r = readiness(p);
  return {
    id: String(p._id),
    founder: { name: user?.name ?? null, photo: user?.photo ?? null, headline: p.headline ?? null, location: p.location ?? null, linkedin: p.linkedin ?? null },
    startup: startupOut(p.startup),
    readiness: {
      score: r.score,
      level: r.level,
      ...(detail ? { areas: r.areas.map(({ key, label, score, weight, complete }) => ({ key, label, score, weight, complete })) } : {}),
    },
    connection: connection ? { id: String(connection._id), status: connection.status, createdAt: connection.createdAt } : null,
    ...(detail
      ? {
          bio: p.bio ?? null,
          updates: updatesOut(p.updates, 5),
          workspace: connected ? workspaceOut(p.workspace) : null,
          contactEmail: connected ? (user?.email ?? null) : null,
        }
      : {}),
    updatedAt: p.updatedAt,
  };
}
