import { Router } from 'express';
import { z } from 'zod';
import { cached } from '../../common/cache/cache.js';
import { ok } from '../../common/http/respond.js';
import { optionalText, text } from '../../common/validation/index.js';
import { simpleCrudRouter } from '../../common/utilities/simple-crud.js';

const fields = {
  key: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]{2,60}$/, 'Use lowercase letters, numbers and underscores'),
  label: text(80),
  value: z.number().finite().min(0).max(1e15),
  suffix: optionalText(20),
  description: optionalText(300),
  displayOrder: z.number().int().min(0).max(10_000).optional(),
  active: z.boolean().optional(),
};
const createSchema = z.object(fields).strict();
const updateSchema = z.object(fields).partial().strict();

const toPublic = (r) => ({
  id: String(r._id),
  key: r.key,
  label: r.label,
  value: r.value,
  suffix: r.suffix,
  description: r.description,
  displayOrder: r.displayOrder,
});

export async function listPublicStats(db) {
  const rows = await db.PlatformStat.find({ active: true }).sort({ displayOrder: 1, label: 1 }).lean();
  return rows.map(toPublic);
}

export function statsPublicRouter({ db, cache, config }) {
  const r = Router();
  r.get('/stats', async (_req, res) => {
    ok(res, await cached(cache, 'public:stats', config.cache.publicTtlSeconds, () => listPublicStats(db)));
  });
  return r;
}

export function statsAdminRouter(deps) {
  return simpleCrudRouter(deps, {
    entityType: 'platform_stat',
    label: 'Stat',
    model: (db) => db.PlatformStat,
    createSchema,
    updateSchema,
    sort: { displayOrder: 1, label: 1 },
    publishMode: 'active',
    serialize: async (_db, docs) => docs.map((r) => ({ ...toPublic(r), active: r.active, updatedAt: r.updatedAt })),
  });
}
