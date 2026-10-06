import { Schema } from 'mongoose';
import {
  ACCESS_STATUSES,
  CONNECTION_STATUSES,
  FOUNDER_VISIBILITIES,
  FUNDING_STAGES,
  HIRING_STAGES,
  INVESTOR_TYPES,
  ORGANIZATION_MEMBER_ROLES,
  ORGANIZATION_TYPES,
  STARTUP_STAGES,
  STARTUP_TYPES,
} from './enums.js';

const { ObjectId } = Schema.Types;
const ref = (model) => ({ type: ObjectId, ref: model, default: null });
const str = { type: String, default: null };

/**
 * One STUDLYF account, many ecosystems. The `users` document (roles[]) stays the identity; each
 * ecosystem keeps its own profile that is created only when the person actually enters it:
 *
 *   User ─┬─ BuilderProfile        (builder.js — Phase 2)
 *         ├─ FounderProfile        founder_profiles       self-service
 *         ├─ InvestorProfile       investor_profiles      access request → admin verification
 *         ├─ HrProfile             hr_profiles            access request → admin verification
 *         └─ OrganizationMember ── Organization           organization verification
 *
 * Controlled ecosystems carry an ACCESS_STATUSES `status` (PENDING/ACTIVE/REJECTED/SUSPENDED).
 * Only ACTIVE unlocks the ecosystem's APIs — checked in the database on every request.
 */
const reviewFields = {
  status: { type: String, enum: ACCESS_STATUSES, required: true, default: 'PENDING' },
  statusNote: str, // shown to the applicant (e.g. why a request was rejected)
  reviewedBy: ref('User'),
  reviewedAt: { type: Date, default: null },
  submittedAt: { type: Date, required: true, default: () => new Date() },
};

// ---- Founder ------------------------------------------------------------------

/** One dated traction snapshot, so growth is a series a chart can read (spec §45). */
const tractionPointSchema = new Schema(
  { date: { type: Date, required: true }, users: str, revenue: str, growth: str, note: str },
  { _id: true },
);

const startupSchema = new Schema(
  {
    name: str,
    oneLiner: str,
    description: str,
    website: str,
    industry: str,
    type: { type: String, enum: [...STARTUP_TYPES, null], default: null },
    stage: { type: String, enum: [...STARTUP_STAGES, null], default: null },
    fundingStage: { type: String, enum: [...FUNDING_STAGES, null], default: null },
    location: str,
    foundedYear: { type: Number, default: null },
    teamSize: { type: Number, default: null },
    teamDescription: str, // co-founders and key people — feeds the Team readiness area
    traction: {
      type: new Schema(
        { users: str, revenue: str, growth: str, highlights: str },
        { _id: false },
      ),
      default: () => ({}),
    },
    /** Dated snapshots of the metrics above — the current values stay the headline. */
    tractionHistory: { type: [tractionPointSchema], default: () => [] },
  },
  { _id: false },
);

// ---- Founder strategy workspace: the structured builders ------------------------------
// These sit ALONGSIDE the original free-text fields in workspaceSchema rather than replacing
// them, so a profile written before the structured editors existed keeps every word it already
// has, and the readiness checks fall back to the free text when a structured field is empty.

const marketSchema = new Schema(
  { market: str, customerSegment: str, tam: str, sam: str, som: str, trends: str, customerProblem: str, opportunity: str },
  { _id: false },
);

const competitorSchema = new Schema(
  { name: str, description: str, strengths: str, weaknesses: str, pricing: str, positioning: str, differentiation: str },
  { _id: false },
);

const businessModelSchema = new Schema(
  {
    customerSegments: str,
    valueProposition: str,
    channels: str,
    customerRelationships: str,
    revenueStreams: str,
    keyResources: str,
    keyActivities: str,
    keyPartnerships: str,
    costStructure: str,
  },
  { _id: false },
);

const gtmSchema = new Schema(
  {
    targetCustomers: str,
    positioning: str,
    acquisitionChannels: str,
    salesStrategy: str,
    pricing: str,
    launchPlan: str,
    growthStrategy: str,
    kpis: str,
  },
  { _id: false },
);

/** The eleven narrative sections of the pitch deck (spec §38). */
const pitchDeckSchema = new Schema(
  {
    problem: str,
    solution: str,
    product: str,
    market: str,
    businessModel: str,
    traction: str,
    competition: str,
    goToMarket: str,
    team: str,
    financials: str,
    fundingAsk: str,
  },
  { _id: false },
);

/** Structured strategy workspace — each section feeds the readiness assessment. */
const workspaceSchema = new Schema(
  {
    problem: str,
    targetCustomer: str,
    marketAnalysis: str,
    competitors: str,
    swot: {
      type: new Schema({ strengths: str, weaknesses: str, opportunities: str, threats: str }, { _id: false }),
      default: () => ({}),
    },
    businessModel: str,
    gtmStrategy: str,
    marketingStrategy: str,
    pitchDeckUrl: str,
    pitchNotes: str,
    fundingNeeds: str,
    // Structured builders (spec §38–43). Additive: the free-text fields above stay the fallback.
    market: { type: marketSchema, default: () => ({}) },
    competitorAnalysis: { type: [competitorSchema], default: () => [] },
    businessModelCanvas: { type: businessModelSchema, default: () => ({}) },
    gtm: { type: gtmSchema, default: () => ({}) },
    pitchDeck: { type: pitchDeckSchema, default: () => ({}) },
  },
  { _id: false },
);

/** Short progress posts ("Startup updates") — visible to the founder and verified investors. */
const startupUpdateSchema = new Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    createdAt: { type: Date, required: true, default: () => new Date() },
  },
  { _id: true },
);

export const founderProfileSchema = new Schema(
  {
    userId: { type: ObjectId, ref: 'User', required: true },
    /** Public handle for /founders/<slug>, derived from the startup name on first save. */
    slug: str,
    headline: str,
    bio: str,
    linkedin: str,
    location: str,
    /** Verified investors can find the founder + startup only while this is on. */
    discoverable: { type: Boolean, required: true, default: true },
    /**
     * Spec §68 — who may open the startup's public page. Independent of `discoverable` above:
     * this one governs the unauthenticated /founders/<slug> page, and only PUBLIC resolves there.
     */
    visibility: { type: String, enum: FOUNDER_VISIBILITIES, required: true, default: 'INVESTOR_VISIBLE' },
    startup: { type: startupSchema, default: () => ({}) },
    workspace: { type: workspaceSchema, default: () => ({}) },
    updates: { type: [startupUpdateSchema], default: () => [] },
    onboardingCompletedAt: { type: Date, default: null },
    searchTerms: { type: [String], default: [] },
    titleTerms: { type: [String], default: [] },
  },
  { collection: 'founder_profiles', timestamps: true },
);
founderProfileSchema.index({ userId: 1 }, { unique: true });
// Partial, not plain unique: profiles migrate across in batches, and a null slug must not
// collide with every other null slug the way a plain unique index would.
founderProfileSchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { slug: { $type: 'string' } } });
founderProfileSchema.index({ discoverable: 1, 'startup.stage': 1, updatedAt: -1 });
founderProfileSchema.index({ discoverable: 1, 'startup.industry': 1 });
founderProfileSchema.index({ discoverable: 1, 'startup.type': 1 });
founderProfileSchema.index({ searchTerms: 1 });

// ---- Investor -------------------------------------------------------------------

export const investorProfileSchema = new Schema(
  {
    userId: { type: ObjectId, ref: 'User', required: true },
    firmName: { type: String, required: true },
    title: str,
    investorType: { type: String, enum: INVESTOR_TYPES, required: true },
    website: str,
    linkedin: str,
    stages: { type: [String], default: [] },
    sectors: { type: [String], default: [] },
    geographies: { type: [String], default: [] },
    startupTypes: { type: [String], enum: STARTUP_TYPES, default: [] },
    checkSize: str, // ticket size
    /**
     * Legacy shortlist. Superseded by the platform-wide `saved_items` table (spec §57), which
     * migration 0016 copies these ids into; kept read-only as a fallback so no data is lost.
     */
    savedFounderProfileIds: { type: [{ type: ObjectId, ref: 'FounderProfile' }], default: [] },
    thesis: str,
    ...reviewFields,
  },
  { collection: 'investor_profiles', timestamps: true },
);
investorProfileSchema.index({ userId: 1 }, { unique: true });
investorProfileSchema.index({ status: 1, submittedAt: -1 });

// ---- HR & talent ------------------------------------------------------------------

export const hrProfileSchema = new Schema(
  {
    userId: { type: ObjectId, ref: 'User', required: true },
    companyName: { type: String, required: true },
    designation: { type: String, required: true },
    workEmail: { type: String, required: true, lowercase: true, trim: true },
    companyWebsite: str,
    linkedin: str,
    companySize: str,
    hiringFor: str,
    ...reviewFields,
  },
  { collection: 'hr_profiles', timestamps: true },
);
hrProfileSchema.index({ userId: 1 }, { unique: true });
hrProfileSchema.index({ status: 1, submittedAt: -1 });

/** An HR user's private pipeline entry for one builder (never visible to other HR users). */
export const hrCandidateSchema = new Schema(
  {
    hrUserId: { type: ObjectId, ref: 'User', required: true },
    builderProfileId: { type: ObjectId, ref: 'BuilderProfile', required: true },
    builderUserId: { type: ObjectId, ref: 'User', required: true },
    stage: { type: String, enum: HIRING_STAGES, required: true, default: 'SHORTLISTED' },
    role: str, // the position being considered for
    // Set when the candidate was shortlisted from a job post; null for a talent-pool add. The job
    // post is the front door and this pipeline is the funnel — one application model, not two.
    jobId: { type: ObjectId, ref: 'Job', default: null },
    note: str,
    interviewAt: { type: Date, default: null },
  },
  { collection: 'hr_candidates', timestamps: true },
);
hrCandidateSchema.index({ hrUserId: 1, builderProfileId: 1 }, { unique: true });
hrCandidateSchema.index({ hrUserId: 1, stage: 1, updatedAt: -1 });
hrCandidateSchema.index({ hrUserId: 1, jobId: 1 });

// ---- Organizations ------------------------------------------------------------------

export const organizationSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
    type: { type: String, enum: ORGANIZATION_TYPES, required: true },
    website: str,
    description: str,
    city: str,
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    logoId: ref('MediaAsset'),
    createdBy: { type: ObjectId, ref: 'User', required: true },
    // Indexed search words, so an organization surfaces in unified search by the same
    // prefix-matching mechanism every other searchable document uses.
    searchTerms: { type: [String], default: () => [], select: false },
    titleTerms: { type: [String], default: () => [], select: false },
    ...reviewFields,
  },
  { collection: 'organizations', timestamps: true },
);
organizationSchema.index({ slug: 1 }, { unique: true });
organizationSchema.index({ status: 1, submittedAt: -1 });
organizationSchema.index({ searchTerms: 1 });

export const organizationMemberSchema = new Schema(
  {
    organizationId: { type: ObjectId, ref: 'Organization', required: true },
    userId: { type: ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ORGANIZATION_MEMBER_ROLES, required: true, default: 'VIEWER' },
    addedBy: ref('User'),
  },
  { collection: 'organization_members', timestamps: true },
);
organizationMemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
organizationMemberSchema.index({ userId: 1 });

// ---- Investor ↔ founder connections --------------------------------------------------

export const investorConnectionSchema = new Schema(
  {
    investorUserId: { type: ObjectId, ref: 'User', required: true },
    founderProfileId: { type: ObjectId, ref: 'FounderProfile', required: true },
    founderUserId: { type: ObjectId, ref: 'User', required: true },
    message: str,
    status: { type: String, enum: CONNECTION_STATUSES, required: true, default: 'PENDING' },
    respondedAt: { type: Date, default: null },
  },
  { collection: 'investor_connections', timestamps: true },
);
investorConnectionSchema.index({ investorUserId: 1, founderProfileId: 1 }, { unique: true });
investorConnectionSchema.index({ founderUserId: 1, status: 1, updatedAt: -1 });
investorConnectionSchema.index({ investorUserId: 1, status: 1, updatedAt: -1 });
