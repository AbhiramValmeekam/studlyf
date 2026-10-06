import { z } from 'zod';
import { PUBLISH_STATUSES, RESOURCE_TYPES } from '../../database/schema/index.js';
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
  type: enumParam(RESOURCE_TYPES).optional(),
  category: z.string().trim().max(80).optional(),
  tag: z.string().trim().max(60).optional(),
  featured: queryBool.optional(),
  sort: z.enum(['relevance', 'newest']).optional(),
  ...paginationQuery,
});

export const adminListQuery = z.object({
  q: searchText,
  status: enumParam(PUBLISH_STATUSES).optional(),
  type: enumParam(RESOURCE_TYPES).optional(),
  featured: queryBool.optional(),
  ...paginationQuery,
});

const fields = {
  title: text(200),
  slug: slugSchema.optional(),
  type: z.enum(RESOURCE_TYPES),
  description: text(500),
  thumbnailId: objectIdSchema.nullish(),
  categoryId: objectIdSchema.nullish(),
  content: optionalText(200_000),
  externalUrl: httpUrl.nullish(),
  authorName: optionalText(120),
  tags: z.array(text(40)).max(20).optional(),
  status: z.enum(PUBLISH_STATUSES).optional(),
  featured: z.boolean().optional(),
  publishedAt: isoDate.nullish(),
};

export const createBody = z
  .object(fields)
  .strict()
  .superRefine((v, ctx) => {
    if (v.type === 'VIDEO' && !v.externalUrl) {
      ctx.addIssue({ code: 'custom', path: ['externalUrl'], message: 'Video resources need a video URL' });
    }
  });
export const updateBody = z.object(fields).partial().strict();

export const publishBody = z.object({ publishedAt: isoDate.optional() }).strict();
