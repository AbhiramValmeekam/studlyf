import { z } from 'zod';
import { EVALUATION_STATUSES, FEEDBACK_VISIBILITIES } from '../../database/schema/index.js';
import { objectIdSchema, optionalText, paginationQuery, queryBool, text } from '../../common/validation/index.js';
import { enumParam, searchText } from '../../common/validation/query.js';

const twoDecimals = (v) => Math.round(v * 100) === v * 100;

const criterionInput = z
  .object({
    id: objectIdSchema.optional(), // keep an existing criterion's identity when editing
    name: text(120),
    description: optionalText(1000),
    maxScore: z.number().int('Max score must be a whole number').min(1).max(100),
    weight: z.number().min(0).max(100).refine(twoDecimals, 'Use at most two decimals'),
    required: z.boolean().optional(),
  })
  .strict();

export const templateCreateBody = z
  .object({
    name: text(120),
    description: optionalText(2000),
    opportunityId: objectIdSchema.nullish(),
    isActive: z.boolean().optional(),
    criteria: z.array(criterionInput).max(20).default([]),
  })
  .strict();

export const templateUpdateBody = z
  .object({
    name: text(120).optional(),
    description: optionalText(2000),
    opportunityId: objectIdSchema.nullish(),
    isActive: z.boolean().optional(),
    criteria: z.array(criterionInput).max(20).optional(),
  })
  .strict();

export const templatesQuery = z.object({
  q: searchText,
  active: queryBool.optional(),
  ...paginationQuery,
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export const assignBody = z.object({ evaluatorUserId: objectIdSchema, templateId: objectIdSchema.optional() }).strict();

const scoreInput = z
  .object({
    criterionId: objectIdSchema,
    score: z.number().min(0).refine(twoDecimals, 'Use at most two decimals').nullable().optional(),
    feedback: optionalText(4000),
    feedbackVisibility: z.enum(FEEDBACK_VISIBILITIES).optional(),
  })
  .strict();

export const evaluatorSaveBody = z
  .object({
    scores: z.array(scoreInput).max(20).optional(),
    overallFeedback: optionalText(8000),
    overallFeedbackVisibility: z.enum(FEEDBACK_VISIBILITIES).optional(),
    scoreVisibility: z.enum(FEEDBACK_VISIBILITIES).optional(),
    internalNotes: optionalText(8000),
    showEvaluatorIdentity: z.boolean().optional(),
  })
  .strict();

export const evaluatorListQuery = z.object({
  status: enumParam(EVALUATION_STATUSES).optional(),
  ...paginationQuery,
});

export const adminEvaluationsQuery = z.object({
  status: enumParam(EVALUATION_STATUSES).optional(),
  opportunityId: objectIdSchema.optional(),
  evaluatorId: objectIdSchema.optional(),
  submissionId: objectIdSchema.optional(),
  ...paginationQuery,
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const evaluatorGrantBody = z
  .object({
    email: z.string().trim().toLowerCase().max(254).pipe(z.email({ message: 'Must be a valid email address' })).optional(),
    userId: objectIdSchema.optional(),
  })
  .strict()
  .refine((v) => !!v.email !== !!v.userId, { message: 'Provide either an email or a user id', path: ['email'] });

export const evaluatorParams = z.object({ userId: objectIdSchema });
export const builderEvaluationsQuery = z.object({ ...paginationQuery });
