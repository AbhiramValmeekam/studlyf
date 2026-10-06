import { z } from 'zod';
import { SUBMISSION_STATUSES } from '../../database/schema/index.js';
import { objectIdSchema, optionalText, paginationQuery, queryBool } from '../../common/validation/index.js';
import { enumParam, searchText } from '../../common/validation/query.js';

export const createBody = z
  .object({
    opportunityId: objectIdSchema,
    note: optionalText(2000),
    // false = keep as a DRAFT submission to finish later; true (default) = submit now.
    submit: z.boolean().default(true),
  })
  .strict();

/**
 * One PATCH for everyone; what is allowed depends on who is asking (see service):
 *   team (canEdit): note (while DRAFT), status SUBMITTED | WITHDRAWN
 *   admin:          status UNDER_REVIEW | SHORTLISTED | SELECTED | REJECTED, reviewerNote
 */
export const updateBody = z
  .object({
    status: z.enum(SUBMISSION_STATUSES).optional(),
    note: optionalText(2000),
    reviewerNote: optionalText(2000),
  })
  .strict();

export const listQuery = z.object({
  status: enumParam(SUBMISSION_STATUSES).optional(),
  ...paginationQuery,
});

export const adminListQuery = z.object({
  opportunityId: objectIdSchema.optional(),
  status: enumParam(SUBMISSION_STATUSES).optional(),
  q: searchText,
  unassigned: queryBool.optional(),
  ...paginationQuery,
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const eligibilityQuery = z.object({ opportunityId: objectIdSchema });
