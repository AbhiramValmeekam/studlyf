import { Router } from 'express';
import { z } from 'zod';
import { cached } from '../../common/cache/cache.js';
import { ok } from '../../common/http/respond.js';
import { httpUrl, objectIdSchema, optionalText, parse, queryBool, slugSchema, text } from '../../common/validation/index.js';
import { idOf, loadMedia, pick } from '../../common/utilities/media.js';
import { simpleCrudRouter } from '../../common/utilities/simple-crud.js';
import { resolveSlug } from '../../common/utilities/slug.js';
import { assertCategory, categoryIdBySlug, categoryOf, loadCategories } from '../taxonomy/taxonomy.service.js';

const fields = {
  name: text(120),
  slug: slugSchema.optional(),
  logoId: objectIdSchema.nullish(),
  website: httpUrl.nullish(),
  description: optionalText(1000),
  categoryId: objectIdSchema.nullish(),
  verified: z.boolean().optional(),
  featured: z.boolean().optional(),
  displayOrder: z.number().int().min(0).max(10_000).optional(),
  active: z.boolean().optional(),
};
const createSchema = z.object(fields).strict();
const updateSchema = z.object(fields).partial().strict();

const publicQuery = z.object({
  category: z.string().trim().max(80).optional(),
  featured: queryBool.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(48),
});

async function serialize(db, rows) {
  const [media, cats] = await Promise.all([loadMedia(db, rows.map((r) => r.logoId)), loadCategories(db, rows.map((r) => r.categoryId))]);
  return rows.map((r) => ({
    id: String(r._id),
    name: r.name,
    slug: r.slug,
    logo: pick(media, r.logoId),
    website: r.website,
    description: r.description,
    category: categoryOf(cats, r.categoryId),
    verified: r.verified,
    featured: r.featured,
    displayOrder: r.displayOrder,
  }));
}

export async function listPublicPartners(db, opts) {
  const filter = { active: true };
  if (opts.featured !== undefined) filter.featured = opts.featured;
  if (opts.category) filter.categoryId = (await categoryIdBySlug(db, 'PARTNER', opts.category)) ?? { $in: [] };
  const rows = await db.Partner.find(filter).sort({ displayOrder: 1, name: 1 }).limit(opts.limit).lean();
  return serialize(db, rows);
}

export function partnersPublicRouter({ db, cache, config }) {
  const r = Router();
  r.get('/partners', async (req, res) => {
    const q = parse(publicQuery, req.query);
    const key = `public:partners:${q.featured ?? ''}:${q.category ?? ''}:${q.limit}`;
    ok(res, await cached(cache, key, config.cache.publicTtlSeconds, () => listPublicPartners(db, q)));
  });
  return r;
}

export function partnersAdminRouter(deps) {
  return simpleCrudRouter(deps, {
    entityType: 'partner',
    label: 'Partner',
    model: (db) => db.Partner,
    createSchema,
    updateSchema,
    sort: { displayOrder: 1, name: 1 },
    publishMode: 'active',
    prepare: async (db, input, existing) => {
      const values = { ...input };
      await assertCategory(db, input.categoryId, 'PARTNER');
      const excludeId = existing ? String(existing._id) : undefined;
      if (input.slug) values.slug = await resolveSlug(db.Partner, { explicit: input.slug, from: '', excludeId });
      else if (!existing) values.slug = await resolveSlug(db.Partner, { from: input.name });
      return values;
    },
    serialize: async (db, docs) => {
      const rows = docs;
      const out = await serialize(db, rows);
      return out.map((p, i) => ({ ...p, active: rows[i].active, logoId: idOf(rows[i].logoId), categoryId: idOf(rows[i].categoryId) }));
    },
  });
}
