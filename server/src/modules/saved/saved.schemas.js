import { z } from 'zod';
import { SAVEABLE_TYPES } from '../../database/schema/enums.js';
import { objectIdSchema, paginationQuery } from '../../common/validation/index.js';
import { enumParam } from '../../common/validation/query.js';

/** Save / unsave one thing. Strict, like every other write body in the platform. */
export const saveBody = z
  .object({
    entityType: enumParam(SAVEABLE_TYPES),
    entityId: objectIdSchema,
  })
  .strict();

export const removeQuery = z.object({
  entityType: enumParam(SAVEABLE_TYPES),
  entityId: objectIdSchema,
});

export const listQuery = z.object({
  entityType: enumParam(SAVEABLE_TYPES).optional(),
  page: paginationQuery.page,
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
