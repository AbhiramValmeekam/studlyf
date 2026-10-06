import { Router } from 'express';
import { z } from 'zod';
import { PUBLISH_STATUSES } from '../../database/schema/index.js';
import { cached } from '../../common/cache/cache.js';
import { ok } from '../../common/http/respond.js';
import { linkUrl, objectIdSchema, optionalText, text } from '../../common/validation/index.js';
import { idOf, loadMedia, pick } from '../../common/utilities/media.js';
import { isPublished, resolvePublishFields } from '../../common/utilities/publishing.js';
import { simpleCrudRouter } from '../../common/utilities/simple-crud.js';

// "Choose your path" cards — Builders, Founders, Organizations, HR & Talent.
const fields = {
  key: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]{2,40}$/, 'Use lowercase letters, numbers and underscores'),
  title: text(60),
  description: text(240),
  icon: optionalText(60), // icon name from the frontend icon set
  imageId: objectIdSchema.nullish(),
  ctaLabel: text(40),
  ctaUrl: linkUrl,
  displayOrder: z.number().int().min(0).max(10_000).optional(),
  status: z.enum(PUBLISH_STATUSES).optional(),
};
const createSchema = z.object(fields).strict();
const updateSchema = z.object(fields).partial().strict();

async function serialize(db, rows) {
  const media = await loadMedia(db, rows.map((r) => r.imageId));
  return rows.map((r) => ({
    id: String(r._id),
    key: r.key,
    title: r.title,
    description: r.description,
    icon: r.icon,
    image: pick(media, r.imageId),
    cta: { label: r.ctaLabel, url: r.ctaUrl },
    displayOrder: r.displayOrder,
  }));
}

export async function listPublicPaths(db) {
  const rows = await db.PathCard.find(isPublished()).sort({ displayOrder: 1 }).lean();
  return serialize(db, rows);
}

export function pathsPublicRouter({ db, cache, config }) {
  const r = Router();
  r.get('/paths', async (_req, res) => {
    ok(res, await cached(cache, 'public:paths', config.cache.publicTtlSeconds, () => listPublicPaths(db)));
  });
  return r;
}

export function pathsAdminRouter(deps) {
  return simpleCrudRouter(deps, {
    entityType: 'path_card',
    label: 'Path card',
    model: (db) => db.PathCard,
    createSchema,
    updateSchema,
    sort: { displayOrder: 1 },
    publishMode: 'status',
    prepare: async (_db, input, existing) => {
      const { status, ...rest } = input;
      return { ...rest, ...resolvePublishFields({ status: status ?? (existing ? undefined : 'DRAFT') }, existing) };
    },
    serialize: async (db, docs) => {
      const rows = docs;
      const out = await serialize(db, rows);
      return out.map((p, i) => ({ ...p, imageId: idOf(rows[i].imageId), status: rows[i].status, publishedAt: rows[i].publishedAt }));
    },
  });
}
