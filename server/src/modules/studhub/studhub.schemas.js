import { z } from 'zod';
import { PUBLISH_STATUSES, STUDHUB_TYPES } from '../../database/schema/index.js';
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
  type: enumParam(STUDHUB_TYPES).optional(),
  tag: z.string().trim().max(60).optional(),
  featured: queryBool.optional(),
  sort: z.enum(['relevance', 'newest']).optional(),
  ...paginationQuery,
});

export const adminListQuery = z.object({
  q: searchText,
  status: enumParam(PUBLISH_STATUSES).optional(),
  type: enumParam(STUDHUB_TYPES).optional(),
  featured: queryBool.optional(),
  ...paginationQuery,
});

const fields = {
  title: text(200),
  slug: slugSchema.optional(),
  type: z.enum(STUDHUB_TYPES),
  summary: text(500),
  description: optionalText(200_000),
  thumbnailId: objectIdSchema.nullish(),
  provider: optionalText(160),
  offer: optionalText(120),
  eligibility: optionalText(500),
  claimUrl: httpUrl.nullish(),
  deadline: isoDate.nullish(),
  tags: z.array(text(40)).max(20).optional(),
  status: z.enum(PUBLISH_STATUSES).optional(),
  featured: z.boolean().optional(),
  publishedAt: isoDate.nullish(),
};

export const createBody = z
  .object(fields)
  .strict()
  .superRefine((v, ctx) => {
    if (v.type === 'SCHOLARSHIP' && !v.deadline) {
      ctx.addIssue({ code: 'custom', path: ['deadline'], message: 'Scholarships need an application deadline' });
    }
  });
export const updateBody = z.object(fields).partial().strict();

export const publishBody = z.object({ publishedAt: isoDate.optional() }).strict();
