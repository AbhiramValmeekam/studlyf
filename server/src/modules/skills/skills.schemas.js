import { z } from 'zod';
import { optionalText, paginationQuery, queryBool, slugSchema, text } from '../../common/validation/index.js';
import { searchText } from '../../common/validation/query.js';

export const publicListQuery = z.object({
  q: searchText,
  ...paginationQuery,
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export const adminListQuery = z.object({
  q: searchText,
  active: queryBool.optional(),
  ...paginationQuery,
  pageSize: z.coerce.number().int().min(1).max(100).default(100),
});

const fields = {
  name: text(80),
  slug: slugSchema.optional(),
  category: optionalText(60),
  description: optionalText(500),
  active: z.boolean().optional(),
};

export const createBody = z.object(fields).strict();
export const updateBody = z.object(fields).partial().strict();
