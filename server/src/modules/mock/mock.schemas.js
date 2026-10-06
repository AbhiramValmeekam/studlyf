import { z } from 'zod';
import { COURSE_LEVELS, MOCK_KINDS, PUBLISH_STATUSES } from '../../database/schema/index.js';
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

export const publicListQuery = z.object({
  q: searchText,
  kind: enumParam(MOCK_KINDS).optional(),
  level: enumParam(COURSE_LEVELS).optional(),
  skill: z.string().trim().max(60).optional(),
  featured: queryBool.optional(),
  sort: z.enum(['relevance', 'newest']).optional(),
  ...paginationQuery,
});

export const adminListQuery = z.object({
  q: searchText,
  status: enumParam(PUBLISH_STATUSES).optional(),
  kind: enumParam(MOCK_KINDS).optional(),
  level: enumParam(COURSE_LEVELS).optional(),
  featured: queryBool.optional(),
  ...paginationQuery,
});

const fields = {
  title: text(200),
  slug: slugSchema.optional(),
  kind: z.enum(MOCK_KINDS),
  level: z.enum(COURSE_LEVELS),
  summary: text(500),
  description: optionalText(200_000),
  thumbnailId: objectIdSchema.nullish(),
  role: optionalText(120),
  provider: optionalText(160),
  durationMinutes: z.number().int().min(0).max(100_000).nullish(),
  questionCount: z.number().int().min(0).max(10_000).nullish(),
  startUrl: httpUrl.nullish(),
  skills: z.array(text(40)).max(20).optional(),
  status: z.enum(PUBLISH_STATUSES).optional(),
  featured: z.boolean().optional(),
  publishedAt: isoDate.nullish(),
};

export const createBody = z.object(fields).strict();
export const updateBody = z.object(fields).partial().strict();

export const publishBody = z.object({ publishedAt: isoDate.optional() }).strict();
