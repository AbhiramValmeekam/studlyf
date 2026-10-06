import { z } from 'zod';
import {
  MODERATION_STATUSES,
  PROJECT_CATEGORIES,
  PROJECT_MEDIA_KINDS,
  PROJECT_REPORT_REASONS,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  PROJECT_VISIBILITIES,
  PROJECT_WORK_STATUSES,
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

/** Free-form technologies/tools ("React", "PostgreSQL", "Figma"), de-duplicated case-insensitively. */
export const technologiesField = z
  .array(z.string().trim().min(1, 'Technology names cannot be empty').max(40))
  .max(20, 'Add at most 20 technologies')
  .transform((list) => {
    const seen = new Set();
    return list.filter((t) => {
      const key = t.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

/** Skill slugs from the STUDLYF Skill vocabulary (validated against it in the service). */
const skillsField = z
  .array(slugSchema)
  .max(20, 'Add at most 20 skills')
  .transform((list) => [...new Set(list)]);

const nullableUrl = z
  .union([z.literal(''), httpUrl])
  .nullish()
  .transform((v) => (v === '' ? null : v));

export const linksField = z
  .object({ repo: nullableUrl, demo: nullableUrl, video: nullableUrl, website: nullableUrl })
  .partial()
  .strict();

const mediaField = z
  .array(
    z
      .object({ assetId: objectIdSchema, kind: z.enum(PROJECT_MEDIA_KINDS), caption: optionalText(200) })
      .strict(),
  )
  .max(12, 'Attach at most 12 screenshots or documents');

const checkDates = (v, ctx) => {
  if (v.startDate && v.endDate && v.endDate < v.startDate) {
    ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End date must be on or after the start date' });
  }
};

const contentFields = {
  tagline: optionalText(200), // short description
  description: optionalText(20_000),
  problemStatement: optionalText(4000),
  solution: optionalText(4000),
  impact: optionalText(4000),
  category: enumParam(PROJECT_CATEGORIES),
  projectType: enumParam(PROJECT_TYPES),
  technologies: technologiesField,
  skills: skillsField,
  coverImageId: objectIdSchema.nullish(),
  media: mediaField,
  links: linksField,
  teamName: optionalText(80),
  startDate: isoDate.nullish(),
  endDate: isoDate.nullish(),
};

/** Create = save a draft. Only the name is required; everything else can be filled in later. */
export const createBody = z
  .object({
    title: text(120),
    ...Object.fromEntries(Object.entries(contentFields).map(([k, v]) => [k, v.optional()])),
    status: z.enum(PROJECT_WORK_STATUSES).optional(),
  })
  .strict()
  .superRefine(checkDates);

export const updateBody = z
  .object({
    title: text(120).optional(),
    ...Object.fromEntries(Object.entries(contentFields).map(([k, v]) => [k, v.optional()])),
    status: z.enum(PROJECT_WORK_STATUSES).optional(),
    // PATCH can only make a project PRIVATE; going PUBLIC/UNLISTED is the validated publish action.
    visibility: z.enum(PROJECT_VISIBILITIES).optional(),
  })
  .strict()
  .superRefine(checkDates);

export const publishBody = z.object({ visibility: z.enum(['PUBLIC', 'UNLISTED']).default('PUBLIC') }).strict();

export const myProjectsQuery = z.object({
  q: searchText,
  status: enumParam(PROJECT_STATUSES).optional(),
  visibility: enumParam(PROJECT_VISIBILITIES).optional(),
  role: z.enum(['OWNER', 'MEMBER']).optional(),
  ...paginationQuery,
});

export const discoverQuery = z.object({
  q: searchText,
  category: enumParam(PROJECT_CATEGORIES).optional(),
  projectType: enumParam(PROJECT_TYPES).optional(),
  status: enumParam(PROJECT_STATUSES).optional(),
  skill: z.string().trim().toLowerCase().max(60).optional(),
  technology: z.string().trim().toLowerCase().max(60).optional(),
  opportunity: z.string().trim().max(160).optional(), // id or slug
  builder: z.string().trim().toLowerCase().max(40).optional(), // builder username
  location: z.string().trim().max(80).optional(),
  sort: z.enum(['newest', 'updated', 'relevance']).optional(),
  ...paginationQuery,
});

export const idOrSlugParams = z.object({ id: z.string().trim().min(1).max(160) });

export const teamInviteBody = z
  .object({
    username: z.string().trim().toLowerCase().max(40).optional(),
    email: z.string().trim().toLowerCase().max(254).pipe(z.email({ message: 'Must be a valid email address' })).optional(),
    role: z.enum(['CO_BUILDER', 'CONTRIBUTOR', 'MENTOR']),
    canEdit: z.boolean().optional(),
  })
  .strict()
  .refine((v) => !!v.username !== !!v.email, { message: 'Provide either a username or an email', path: ['username'] });

export const teamUpdateBody = z
  .object({
    role: z.enum(['CO_BUILDER', 'CONTRIBUTOR', 'MENTOR']).optional(),
    canEdit: z.boolean().optional(),
    status: z.literal('ACTIVE').optional(), // the invitee accepting
  })
  .strict();

export const memberParams = z.object({ id: objectIdSchema, memberId: objectIdSchema });

export const reportBody = z.object({ reason: z.enum(PROJECT_REPORT_REASONS), details: optionalText(1000) }).strict();

export const featuredBody = z.object({ projectIds: z.array(objectIdSchema).max(24) }).strict();

export const mediaUploadFields = z.object({ purpose: enumParam(['THUMBNAIL', 'SCREENSHOT', 'DOCUMENT']).default('SCREENSHOT') });

export const adminListQuery = z.object({
  q: searchText,
  status: enumParam(PROJECT_STATUSES).optional(),
  visibility: enumParam(PROJECT_VISIBILITIES).optional(),
  moderationStatus: enumParam(MODERATION_STATUSES).optional(),
  projectType: enumParam(PROJECT_TYPES).optional(),
  category: enumParam(PROJECT_CATEGORIES).optional(),
  reported: queryBool.optional(),
  ...paginationQuery,
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export const moderateBody = z
  .object({ moderationStatus: z.enum(MODERATION_STATUSES), reason: optionalText(500) })
  .strict()
  .refine((v) => !['REJECTED', 'HIDDEN'].includes(v.moderationStatus) || !!v.reason, {
    message: 'Give the builder a reason when rejecting or hiding a project',
    path: ['reason'],
  });
