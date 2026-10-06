import { z } from 'zod';
import {
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  PUBLISH_STATUSES,
  SALARY_PERIODS,
  WORK_MODES,
} from '../../database/schema/index.js';
import {
  httpUrl,
  isoDate,
  objectIdSchema,
  optionalText,
  paginationQuery,
  queryBool,
  slugSchema,
  text,
} from '../../common/validation/index.js';
import { enumParam, searchText } from '../../common/validation/query.js';
import { emailSchema } from '../auth/auth.schemas.js';

/** Public "Apply now" board — text, the three job-specific facets, skill and category. */
export const publicListQuery = z.object({
  q: searchText,
  employmentType: enumParam(EMPLOYMENT_TYPES).optional(),
  workMode: enumParam(WORK_MODES).optional(),
  experienceLevel: enumParam(EXPERIENCE_LEVELS).optional(),
  location: z.string().trim().max(120).optional(),
  skill: z.string().trim().max(60).optional(),
  category: z.string().trim().max(80).optional(),
  featured: queryBool.optional(),
  sort: z.enum(['relevance', 'newest', 'deadline']).optional(),
  ...paginationQuery,
});

/** The HR dashboard's own list — it sees drafts, so it filters on the publication status. */
export const hrListQuery = z.object({
  q: searchText,
  status: enumParam(PUBLISH_STATUSES).optional(),
  ...paginationQuery,
});

/** Same process block as an opportunity — the sub-schema is shared (spec §96). */
const roundInput = z
  .object({
    title: text(200),
    description: optionalText(2000),
    startsAt: isoDate.nullish(),
    endsAt: isoDate.nullish(),
    mode: z.enum(['ONLINE', 'OFFLINE', 'HYBRID']).nullish(),
    location: optionalText(160),
    displayOrder: z.number().int().min(0).max(1000).optional(),
  })
  .strict()
  .superRefine((r, ctx) => {
    if (r.startsAt && r.endsAt && r.endsAt < r.startsAt) {
      ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'A round must end on or after it starts' });
    }
  });

const faqInput = z
  .object({
    question: text(300),
    answer: optionalText(5000),
    displayOrder: z.number().int().min(0).max(1000).optional(),
  })
  .strict();

const fields = {
  title: text(160),
  slug: slugSchema.optional(),
  summary: text(300),
  description: optionalText(50_000),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  workMode: z.enum(WORK_MODES),
  experienceLevel: z.enum(EXPERIENCE_LEVELS).nullish(),
  location: optionalText(160),
  openings: z.number().int().min(1).max(1000).optional(),
  minExperienceYears: z.number().min(0).max(60).nullish(),
  maxExperienceYears: z.number().min(0).max(60).nullish(),
  salaryMin: z.number().min(0).max(1_000_000_000).nullish(),
  salaryMax: z.number().min(0).max(1_000_000_000).nullish(),
  salaryCurrency: optionalText(8),
  salaryPeriod: z.enum(SALARY_PERIODS).nullish(),
  salaryDisclosed: z.boolean().optional(),
  skills: z.array(text(40)).max(30).optional(),
  categoryId: objectIdSchema.nullish(),
  responsibilities: optionalText(20_000),
  requirements: optionalText(20_000),
  perks: z.array(text(120)).max(30).optional(),
  rounds: z.array(roundInput).max(20).optional(),
  faqs: z.array(faqInput).max(50).optional(),
  applicationDeadline: isoDate.nullish(),
  startDate: isoDate.nullish(),
  externalUrl: httpUrl.nullish(),
  contactEmail: z.preprocess((v) => (v === '' ? null : v), emailSchema.nullish()),
  bannerId: objectIdSchema.nullish(),
  status: z.enum(PUBLISH_STATUSES).optional(),
  featured: z.boolean().optional(),
  publishedAt: isoDate.nullish(),
};

/** A range must be the right way round, and a currency implies a range to price. */
export const checkRanges = (v, ctx) => {
  if (v.salaryMin != null && v.salaryMax != null && v.salaryMax < v.salaryMin) {
    ctx.addIssue({ code: 'custom', path: ['salaryMax'], message: 'Maximum salary must be at least the minimum' });
  }
  if (v.minExperienceYears != null && v.maxExperienceYears != null && v.maxExperienceYears < v.minExperienceYears) {
    ctx.addIssue({ code: 'custom', path: ['maxExperienceYears'], message: 'Maximum experience must be at least the minimum' });
  }
};

export const createBody = z.object(fields).strict().superRefine(checkRanges);
export const updateBody = z.object(fields).partial().strict().superRefine(checkRanges);
