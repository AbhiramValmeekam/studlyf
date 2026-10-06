import { z } from 'zod';
import { COURSE_LEVELS, OTT_KINDS, PUBLISH_STATUSES } from '../../database/schema/index.js';
import {
  httpUrl,
  isoDate,
  objectIdSchema,
  optionalText,
  paginationQuery,
  queryBool,
  slugSchema,
  text,
} from '../../common/validation/index.js';
import { enumParam, searchText } from '../../common/validation/query.js';

export const publicListQuery = z.object({
  q: searchText,
  kind: enumParam(OTT_KINDS).optional(),
  category: z.string().trim().max(80).optional(),
  skill: z.string().trim().max(60).optional(),
  featured: queryBool.optional(),
  sort: z.enum(['relevance', 'newest']).optional(),
  ...paginationQuery,
});

export const adminListQuery = z.object({
  q: searchText,
  status: enumParam(PUBLISH_STATUSES).optional(),
  kind: enumParam(OTT_KINDS).optional(),
  featured: queryBool.optional(),
  ...paginationQuery,
});

const episodeSchema = z
  .object({
    key: slugSchema,
    title: text(200),
    summary: optionalText(500),
    durationMinutes: z.number().int().min(0).max(10_000).nullish(),
    sourceUrl: httpUrl.nullish(),
  })
  .strict();

const fields = {
  title: text(200),
  slug: slugSchema.optional(),
  kind: z.enum(OTT_KINDS),
  summary: text(500),
  description: optionalText(200_000),
  thumbnailId: objectIdSchema.nullish(),
  categoryId: objectIdSchema.nullish(),
  byline: optionalText(160),
  level: z.enum(COURSE_LEVELS).nullish(),
  durationMinutes: z.number().int().min(0).max(100_000).nullish(),
  sourceUrl: httpUrl.nullish(),
  episodes: z.array(episodeSchema).max(200).optional(),
  skills: z.array(text(40)).max(20).optional(),
  status: z.enum(PUBLISH_STATUSES).optional(),
  featured: z.boolean().optional(),
  publishedAt: isoDate.nullish(),
};

export const createBody = z
  .object(fields)
  .strict()
  .superRefine((v, ctx) => {
    // Episodes are the whole point of a SERIES or COURSE; without them the title is a VIDEO.
    if ((v.kind === 'SERIES' || v.kind === 'COURSE') && !v.episodes?.length) {
      ctx.addIssue({ code: 'custom', path: ['episodes'], message: `A ${v.kind} needs at least one episode` });
    }
    if (v.episodes && new Set(v.episodes.map((e) => e.key)).size !== v.episodes.length) {
      ctx.addIssue({ code: 'custom', path: ['episodes'], message: 'Each episode key must be unique' });
    }
  });

export const updateBody = z.object(fields).partial().strict();

export const publishBody = z.object({ publishedAt: isoDate.optional() }).strict();

/**
 * A playback heartbeat. Every field is optional and only the ones sent are applied, so a player
 * can report position without knowing the percentage, and a "mark as finished" can send only
 * `completed`.
 */
export const progressBody = z
  .object({
    episodeKey: slugSchema.nullish(),
    positionSeconds: z.number().min(0).max(1_000_000).optional(),
    percent: z.number().min(0).max(100).optional(),
    completed: z.boolean().optional(),
  })
  .strict()
  .refine((v) => v.positionSeconds !== undefined || v.percent !== undefined || v.completed !== undefined, {
    message: 'Send a position, a percentage or a completion flag',
  });

export const progressQuery = z.object({ episodeKey: slugSchema.optional() });
