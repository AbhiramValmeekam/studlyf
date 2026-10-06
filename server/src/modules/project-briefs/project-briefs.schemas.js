import { z } from 'zod';
import { COURSE_LEVELS, PROJECT_CATEGORIES, PUBLISH_STATUSES } from '../../database/schema/index.js';
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
  category: enumParam(PROJECT_CATEGORIES).optional(),
  difficulty: enumParam(COURSE_LEVELS).optional(),
  skill: z.string().trim().max(60).optional(),
  featured: queryBool.optional(),
  sort: z.enum(['relevance', 'newest']).optional(),
  ...paginationQuery,
});

export const adminListQuery = z.object({
  q: searchText,
  status: enumParam(PUBLISH_STATUSES).optional(),
  category: enumParam(PROJECT_CATEGORIES).optional(),
  difficulty: enumParam(COURSE_LEVELS).optional(),
  featured: queryBool.optional(),
  ...paginationQuery,
});

const fields = {
  title: text(200),
  slug: slugSchema.optional(),
  category: z.enum(PROJECT_CATEGORIES),
  difficulty: z.enum(COURSE_LEVELS),
  summary: text(500),
  description: optionalText(200_000),
  thumbnailId: objectIdSchema.nullish(),
  estimatedHours: z.number().int().min(0).max(100_000).nullish(),
  deliverables: z.array(text(280)).max(30).optional(),
  starterUrl: httpUrl.nullish(),
  skills: z.array(text(40)).max(20).optional(),
  status: z.enum(PUBLISH_STATUSES).optional(),
  featured: z.boolean().optional(),
  publishedAt: isoDate.nullish(),
};

export const createBody = z.object(fields).strict();
export const updateBody = z.object(fields).partial().strict();

export const publishBody = z.object({ publishedAt: isoDate.optional() }).strict();
