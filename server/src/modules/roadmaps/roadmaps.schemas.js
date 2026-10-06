import { z } from 'zod';
import { PUBLISH_STATUSES, ROADMAP_STEP_PRIORITIES } from '../../database/schema/index.js';
import { isoDate, optionalText, paginationQuery, queryBool, slugSchema, text } from '../../common/validation/index.js';
import { enumParam, searchText } from '../../common/validation/query.js';

export const publicListQuery = z.object({
  q: searchText,
  roleFamily: optionalText(80),
  featured: queryBool.optional(),
  sort: z.enum(['relevance', 'role']).optional(),
  ...paginationQuery,
});

export const adminListQuery = z.object({
  q: searchText,
  status: enumParam(PUBLISH_STATUSES).optional(),
  roleFamily: optionalText(80),
  featured: queryBool.optional(),
  ...paginationQuery,
});

const stepSchema = z
  .object({
    skillSlug: slugSchema,
    skillName: text(80),
    priority: z.enum(ROADMAP_STEP_PRIORITIES).optional(),
    rationale: optionalText(500),
    resourceSlug: slugSchema.nullish(),
  })
  .strict();

const fields = {
  role: text(120),
  slug: slugSchema.optional(),
  roleFamily: optionalText(80),
  summary: text(400),
  description: optionalText(20_000),
  demandNote: optionalText(600),
  steps: z.array(stepSchema).max(60).optional(),
  status: z.enum(PUBLISH_STATUSES).optional(),
  featured: z.boolean().optional(),
  publishedAt: isoDate.nullish(),
};

export const createBody = z
  .object(fields)
  .strict()
  .superRefine((v, ctx) => {
    if (v.steps && !v.steps.length) ctx.addIssue({ code: 'custom', path: ['steps'], message: 'A roadmap needs at least one step' });
    if (v.steps && new Set(v.steps.map((s) => s.skillSlug)).size !== v.steps.length) {
      ctx.addIssue({ code: 'custom', path: ['steps'], message: 'Each skill can appear only once in a roadmap' });
    }
  });
export const updateBody = z.object(fields).partial().strict();

export const publishBody = z.object({ publishedAt: isoDate.optional() }).strict();

/** Choosing a goal — the only thing a person writes; the plan itself is computed. */
export const goalBody = z.object({ roleSlug: slugSchema, targetDate: isoDate.nullish() }).strict();

export const stepBody = z.object({ done: z.boolean() }).strict();

export const skillSlugParams = z.object({ skillSlug: slugSchema });
