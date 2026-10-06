import { z } from 'zod';
import { APPLICATION_QUESTION_TYPES, OPPORTUNITY_MODES, OPPORTUNITY_TYPES, PUBLISH_STATUSES } from '../../database/schema/index.js';
import {
  httpUrl,
  isoDate,
  optionalText,
  paginationQuery,
  queryBool,
  slugSchema,
  text,
  objectIdSchema,
} from '../../common/validation/index.js';
import { enumParam, searchText } from '../../common/validation/query.js';
import { emailSchema } from '../auth/auth.schemas.js';

/** Lifecycle filter derived from dates (not the publication status). */
export const OPPORTUNITY_LIFECYCLE = ['open', 'closed', 'upcoming'];

export const publicListQuery = z.object({
  q: searchText,
  type: enumParam(OPPORTUNITY_TYPES).optional(),
  category: z.string().trim().max(80).optional(),
  mode: enumParam(OPPORTUNITY_MODES).optional(),
  location: z.string().trim().max(120).optional(),
  status: z.preprocess((v) => (typeof v === 'string' ? v.toLowerCase() : v), z.enum(OPPORTUNITY_LIFECYCLE)).optional(),
  skill: z.string().trim().max(60).optional(),
  featured: queryBool.optional(),
  sort: z.enum(['relevance', 'newest', 'deadline']).optional(),
  ...paginationQuery,
});

export const adminListQuery = z.object({
  q: searchText,
  status: enumParam(PUBLISH_STATUSES).optional(),
  type: enumParam(OPPORTUNITY_TYPES).optional(),
  featured: queryBool.optional(),
  ...paginationQuery,
});

const applicationQuestionInput = z
  .object({
    label: text(300),
    type: z.enum(APPLICATION_QUESTION_TYPES),
    required: z.boolean().optional(),
    options: z.array(text(200)).max(30).optional(),
    displayOrder: z.number().int().min(0).max(1000).optional(),
  })
  .strict()
  .superRefine((q, ctx) => {
    if ((q.type === 'SINGLE_SELECT' || q.type === 'MULTI_SELECT') && !(q.options && q.options.length)) {
      ctx.addIssue({ code: 'custom', path: ['options'], message: 'Select questions require at least one option' });
    }
  });

/** Phase 3 — how (and whether) the opportunity accepts project submissions. */
const submissionSettingsInput = z
  .object({
    acceptsProjects: z.boolean().optional(),
    deadline: isoDate.nullish(),
    guidelines: optionalText(5000),
    requireRepository: z.boolean().optional(),
    requireDemo: z.boolean().optional(),
    requireVideo: z.boolean().optional(),
    requirePublished: z.boolean().optional(),
    minTeamSize: z.number().int().min(1).max(20).nullish(),
    maxTeamSize: z.number().int().min(1).max(20).nullish(),
    evaluationTemplateId: objectIdSchema.nullish(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.minTeamSize && v.maxTeamSize && v.minTeamSize > v.maxTeamSize) {
      ctx.addIssue({ code: 'custom', path: ['maxTeamSize'], message: 'Maximum team size must be at least the minimum' });
    }
  });

const roundInput = z
  .object({
    title: text(200),
    description: optionalText(2000),
    startsAt: isoDate.nullish(),
    endsAt: isoDate.nullish(),
    mode: z.enum(OPPORTUNITY_MODES).nullish(),
    location: optionalText(160),
    displayOrder: z.number().int().min(0).max(1000).optional(),
  })
  .strict()
  .superRefine((r, ctx) => {
    if (r.startsAt && r.endsAt && r.endsAt < r.startsAt) {
      ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'A round must end on or after it starts' });
    }
  });

const timelineInput = z
  .object({
    label: text(200),
    date: isoDate.nullish(),
    description: optionalText(1000),
    displayOrder: z.number().int().min(0).max(1000).optional(),
  })
  .strict();

const prizeInput = z
  .object({
    title: text(200),
    description: optionalText(1000),
    rank: optionalText(60),
    value: z.number().min(0).max(1_000_000_000).nullish(),
    currency: optionalText(8),
    quantity: z.number().int().min(0).max(100_000).nullish(),
    displayOrder: z.number().int().min(0).max(1000).optional(),
  })
  .strict();

const faqInput = z
  .object({
    question: text(300),
    answer: optionalText(5000),
    displayOrder: z.number().int().min(0).max(1000).optional(),
  })
  .strict();

const contactInput = z
  .object({
    name: optionalText(120),
    designation: optionalText(120),
    email: z.preprocess((v) => (v === '' ? null : v), emailSchema.nullish()),
    phone: optionalText(40),
    website: httpUrl.nullish(),
  })
  .strict();

const fields = {
  title: text(160),
  slug: slugSchema.optional(),
  partnerId: objectIdSchema.nullish(),
  organizationName: text(120),
  organizationLogoId: objectIdSchema.nullish(),
  type: z.enum(OPPORTUNITY_TYPES),
  categoryId: objectIdSchema.nullish(),
  shortDescription: text(300),
  description: optionalText(50_000),
  eligibility: optionalText(20_000),
  prizeInformation: optionalText(5_000),
  applicationQuestions: z.array(applicationQuestionInput).max(30).optional(),
  submissionSettings: submissionSettingsInput.optional(),
  rounds: z.array(roundInput).max(20).optional(),
  timeline: z.array(timelineInput).max(30).optional(),
  prizes: z.array(prizeInput).max(30).optional(),
  faqs: z.array(faqInput).max(50).optional(),
  contact: contactInput.nullish(),
  venue: optionalText(200),
  location: optionalText(120),
  mode: z.enum(OPPORTUNITY_MODES),
  applicationDeadline: isoDate.nullish(),
  startDate: isoDate.nullish(),
  endDate: isoDate.nullish(),
  externalUrl: httpUrl.nullish(),
  bannerId: objectIdSchema.nullish(),
  skills: z.array(text(40)).max(20).optional(),
  status: z.enum(PUBLISH_STATUSES).optional(),
  featured: z.boolean().optional(),
  publishedAt: isoDate.nullish(),
};

export const checkDateOrder = (v, ctx) => {
  if (v.startDate && v.endDate && v.endDate < v.startDate) {
    ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End date must be on or after the start date' });
  }
};

export const createBody = z.object(fields).strict().superRefine(checkDateOrder);
export const updateBody = z.object(fields).partial().strict().superRefine(checkDateOrder);

export const publishBody = z.object({ publishedAt: isoDate.optional() }).strict();

/**
 * What a verified organization may set on its own opportunities. Curation fields (partner,
 * featured, slug, status, organization name/logo) stay with STUDLYF admins — the organization's
 * name is always taken from its verified record, never from the request.
 *
 * `bannerId` and `categoryId` are here deliberately: a program page is unreadable without a hero
 * image and unfilterable without a category, and `assertCategory` validates the category on both
 * create and update. The banner has no equivalent existence check today (see the service).
 */
const ORG_FIELDS = [
  'title',
  'type',
  'categoryId',
  'bannerId',
  'shortDescription',
  'description',
  'eligibility',
  'prizeInformation',
  'applicationQuestions',
  'submissionSettings',
  'rounds',
  'timeline',
  'prizes',
  'faqs',
  'contact',
  'venue',
  'location',
  'mode',
  'applicationDeadline',
  'startDate',
  'endDate',
  'externalUrl',
  'skills',
];
const orgFields = Object.fromEntries(ORG_FIELDS.map((k) => [k, fields[k]]));
export const orgCreateBody = z.object(orgFields).strict().superRefine(checkDateOrder);
export const orgUpdateBody = z.object(orgFields).partial().strict().superRefine(checkDateOrder);
