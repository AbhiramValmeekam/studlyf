import { z } from 'zod';
import { CONNECTION_STATUSES, FOUNDER_VISIBILITIES, FUNDING_STAGES, STARTUP_STAGES, STARTUP_TYPES } from '../../database/schema/index.js';
import { httpUrl, isoDate, optionalText, paginationQuery, text } from '../../common/validation/index.js';
import { enumParam } from '../../common/validation/query.js';

/**
 * Founder product routes live under /founders/<page>, next to the public startup page at
 * /founders/<slug> — so those page names can never be taken as handles.
 */
export const RESERVED_FOUNDER_SLUGS = new Set([
  'onboarding', 'dashboard', 'profile', 'workspace', 'updates', 'connections', 'traction',
  'market', 'competitors', 'swot', 'business-model', 'gtm', 'pitch-deck',
  'login', 'signup', 'settings', 'admin', 'new', 'edit',
]);

/** Public handle: 3–60 chars, letters/numbers with internal hyphens. */
export const founderSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(60)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'Use letters, numbers and hyphens')
  .refine((s) => !RESERVED_FOUNDER_SLUGS.has(s), 'That handle is reserved — pick another');

const startupFields = {
  name: optionalText(120),
  oneLiner: optionalText(200),
  description: optionalText(5000),
  website: httpUrl.nullish(),
  industry: optionalText(80),
  type: z.enum(STARTUP_TYPES).nullish(),
  stage: z.enum(STARTUP_STAGES).nullish(),
  fundingStage: z.enum(FUNDING_STAGES).nullish(),
  location: optionalText(120),
  foundedYear: z.number().int().min(1990).max(2100).nullish(),
  teamSize: z.number().int().min(1).max(100000).nullish(),
  teamDescription: optionalText(3000),
  traction: z
    .object({ users: optionalText(200), revenue: optionalText(200), growth: optionalText(200), highlights: optionalText(2000) })
    .partial()
    .strict()
    .optional(),
  tractionHistory: z
    .array(
      z
        .object({ date: isoDate, users: optionalText(200), revenue: optionalText(200), growth: optionalText(200), note: optionalText(500) })
        .strict(),
    )
    .max(120)
    .optional(),
};

const workspaceFields = {
  problem: optionalText(5000),
  targetCustomer: optionalText(3000),
  marketAnalysis: optionalText(8000),
  competitors: optionalText(8000),
  swot: z
    .object({ strengths: optionalText(3000), weaknesses: optionalText(3000), opportunities: optionalText(3000), threats: optionalText(3000) })
    .partial()
    .strict()
    .optional(),
  businessModel: optionalText(5000),
  gtmStrategy: optionalText(8000),
  marketingStrategy: optionalText(8000),
  pitchDeckUrl: httpUrl.nullish(),
  pitchNotes: optionalText(8000),
  fundingNeeds: optionalText(3000),
  // Structured builders (spec §38–43). Additive — the free-text fields above remain the fallback.
  market: z
    .object({
      market: optionalText(3000),
      customerSegment: optionalText(2000),
      tam: optionalText(500),
      sam: optionalText(500),
      som: optionalText(500),
      trends: optionalText(3000),
      customerProblem: optionalText(3000),
      opportunity: optionalText(3000),
    })
    .partial()
    .strict()
    .optional(),
  competitorAnalysis: z
    .array(
      z
        .object({
          name: optionalText(120),
          description: optionalText(2000),
          strengths: optionalText(2000),
          weaknesses: optionalText(2000),
          pricing: optionalText(1000),
          positioning: optionalText(2000),
          differentiation: optionalText(2000),
        })
        .strict(),
    )
    .max(30)
    .optional(),
  businessModelCanvas: z
    .object({
      customerSegments: optionalText(2000),
      valueProposition: optionalText(2000),
      channels: optionalText(2000),
      customerRelationships: optionalText(2000),
      revenueStreams: optionalText(2000),
      keyResources: optionalText(2000),
      keyActivities: optionalText(2000),
      keyPartnerships: optionalText(2000),
      costStructure: optionalText(2000),
    })
    .partial()
    .strict()
    .optional(),
  gtm: z
    .object({
      targetCustomers: optionalText(2000),
      positioning: optionalText(2000),
      acquisitionChannels: optionalText(2000),
      salesStrategy: optionalText(3000),
      pricing: optionalText(2000),
      launchPlan: optionalText(3000),
      growthStrategy: optionalText(3000),
      kpis: optionalText(2000),
    })
    .partial()
    .strict()
    .optional(),
  pitchDeck: z
    .object({
      problem: optionalText(3000),
      solution: optionalText(3000),
      product: optionalText(3000),
      market: optionalText(3000),
      businessModel: optionalText(3000),
      traction: optionalText(3000),
      competition: optionalText(3000),
      goToMarket: optionalText(3000),
      team: optionalText(3000),
      financials: optionalText(3000),
      fundingAsk: optionalText(3000),
    })
    .partial()
    .strict()
    .optional(),
};

const profileFields = {
  headline: optionalText(160),
  bio: optionalText(2000),
  linkedin: httpUrl.nullish(),
  location: optionalText(120),
  discoverable: z.boolean().optional(),
  /** Spec §68 — the public page's handle and its audience. Both optional; the slug is derived.
      Nullish, not optional: the editor submits every field it renders, and a cleared select
      arrives as null rather than being absent. */
  slug: founderSlugSchema.nullish(),
  visibility: z.enum(FOUNDER_VISIBILITIES).nullish(),
};

/** Founder onboarding: the minimum that makes a startup profile meaningful. */
export const createBody = z
  .object({
    ...profileFields,
    startup: z
      .object({ ...startupFields, name: text(120), oneLiner: text(200) })
      .strict(),
  })
  .strict();

export const updateBody = z
  .object({
    ...profileFields,
    startup: z.object(startupFields).partial().strict().optional(),
    workspace: z.object(workspaceFields).partial().strict().optional(),
  })
  .strict();

export const connectionsQuery = z.object({
  status: enumParam(CONNECTION_STATUSES).optional(),
  ...paginationQuery,
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const respondBody = z.object({ status: z.enum(['ACCEPTED', 'DECLINED']) }).strict();

export const updateCreateBody = z.object({ title: text(140), body: text(4000) }).strict();
