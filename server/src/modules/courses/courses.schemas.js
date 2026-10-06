import { z } from 'zod';
import { COURSE_AUDIENCES, COURSE_LEVELS, PUBLISH_STATUSES } from '../../database/schema/index.js';
import { LESSON_KINDS } from '../../database/schema/course.js';
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

export const publicListQuery = z.object({
  q: searchText,
  audience: enumParam(COURSE_AUDIENCES).optional(),
  level: enumParam(COURSE_LEVELS).optional(),
  skill: z.string().trim().max(60).optional(),
  featured: queryBool.optional(),
  sort: z.enum(['relevance', 'newest']).optional(),
  ...paginationQuery,
});

export const adminListQuery = z.object({
  q: searchText,
  status: enumParam(PUBLISH_STATUSES).optional(),
  audience: enumParam(COURSE_AUDIENCES).optional(),
  level: enumParam(COURSE_LEVELS).optional(),
  featured: queryBool.optional(),
  ...paginationQuery,
});

const lessonSchema = z
  .object({
    title: text(160),
    kind: z.enum(LESSON_KINDS).optional(),
    durationMinutes: z.number().int().min(0).max(100_000).nullish(),
    url: httpUrl.nullish(),
    displayOrder: z.number().int().min(0).max(1000).optional(),
  })
  .strict();

const moduleSchema = z
  .object({
    title: text(160),
    summary: optionalText(500),
    displayOrder: z.number().int().min(0).max(1000).optional(),
    lessons: z.array(lessonSchema).max(100).optional(),
  })
  .strict();

const fields = {
  title: text(200),
  slug: slugSchema.optional(),
  audience: z.enum(COURSE_AUDIENCES),
  level: z.enum(COURSE_LEVELS),
  summary: text(500),
  description: optionalText(200_000),
  thumbnailId: objectIdSchema.nullish(),
  provider: optionalText(120),
  role: optionalText(120),
  durationHours: z.number().min(0).max(100_000).nullish(),
  enrollUrl: httpUrl.nullish(),
  skills: z.array(text(40)).max(20).optional(),
  modules: z.array(moduleSchema).max(50).optional(),
  status: z.enum(PUBLISH_STATUSES).optional(),
  featured: z.boolean().optional(),
  publishedAt: isoDate.nullish(),
};

export const createBody = z
  .object(fields)
  .strict()
  .superRefine((v, ctx) => {
    if (v.audience === 'COMPANY' && !v.provider) {
      ctx.addIssue({ code: 'custom', path: ['provider'], message: 'Company learning modules need a provider' });
    }
  });
export const updateBody = z.object(fields).partial().strict();

export const publishBody = z.object({ publishedAt: isoDate.optional() }).strict();
