import { z } from 'zod';
import { APPLICATION_STATUSES } from '../../database/schema/index.js';
import { objectIdSchema, optionalText, paginationQuery, text } from '../../common/validation/index.js';
import { enumParam } from '../../common/validation/query.js';

/** A single answer keyed by the opportunity question it responds to; typed validation happens in the service. */
const answerInput = z
  .object({
    questionId: objectIdSchema,
    text: optionalText(10_000),
    choices: z.array(text(200)).max(50).optional(),
  })
  .strict();

const answers = z.array(answerInput).max(50);

export const builderListQuery = z.object({
  status: enumParam(APPLICATION_STATUSES).optional(),
  ...paginationQuery,
});

export const applyBody = z
  .object({
    opportunityId: objectIdSchema,
    answers: answers.optional(),
  })
  .strict();

export const editBody = z.object({ answers }).strict();

/** Statuses an admin can transition an application into; legality of the move is enforced in the service. */
export const REVIEW_STATUSES = ['UNDER_REVIEW', 'SHORTLISTED', 'SELECTED', 'REJECTED'];

export const reviewBody = z
  .object({
    status: z.enum(REVIEW_STATUSES),
    reviewerNote: optionalText(2000),
  })
  .strict();
