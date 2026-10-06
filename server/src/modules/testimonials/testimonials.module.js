import { Router } from 'express';
import { z } from 'zod';
import { cached } from '../../common/cache/cache.js';
import { ok } from '../../common/http/respond.js';
import { objectIdSchema, optionalText, parse, queryBool, text } from '../../common/validation/index.js';
import { idOf, loadMedia, pick } from '../../common/utilities/media.js';
import { simpleCrudRouter } from '../../common/utilities/simple-crud.js';
import { assertCategory, categoryIdBySlug, categoryOf, loadCategories } from '../taxonomy/taxonomy.service.js';

const fields = {
  personName: text(120),
  designation: optionalText(120),
  organization: optionalText(120),
  quote: text(1000),
  photoId: objectIdSchema.nullish(),
  categoryId: objectIdSchema.nullish(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
  displayOrder: z.number().int().min(0).max(10_000).optional(),
};
const createSchema = z.object(fields).strict();
const updateSchema = z.object(fields).partial().strict();

const publicQuery = z.object({
  category: z.string().trim().max(80).optional(),
  featured: queryBool.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

async function serialize(db, rows) {
  const [media, cats] = await Promise.all([loadMedia(db, rows.map((r) => r.photoId)), loadCategories(db, rows.map((r) => r.categoryId))]);
  return rows.map((r) => ({
    id: String(r._id),
    personName: r.personName,
    designation: r.designation,
    organization: r.organization,
    quote: r.quote,
    photo: pick(media, r.photoId),
    category: categoryOf(cats, r.categoryId),
    featured: r.featured,
    displayOrder: r.displayOrder,
  }));
}

export async function listPublicTestimonials(db, opts) {
  const filter = { active: true };
  if (opts.featured !== undefined) filter.featured = opts.featured;
  if (opts.category) filter.categoryId = (await categoryIdBySlug(db, 'TESTIMONIAL', opts.category)) ?? { $in: [] };
  const rows = await db.Testimonial.find(filter)
    .sort({ featured: -1, displayOrder: 1, createdAt: -1 })
    .limit(opts.limit)
    .lean();
  return serialize(db, rows);
}

export function testimonialsPublicRouter({ db, cache, config }) {
  const r = Router();
  r.get('/testimonials', async (req, res) => {
    const q = parse(publicQuery, req.query);
    const key = `public:testimonials:${q.featured ?? ''}:${q.category ?? ''}:${q.limit}`;
    ok(res, await cached(cache, key, config.cache.publicTtlSeconds, () => listPublicTestimonials(db, q)));
  });
  return r;
}

export function testimonialsAdminRouter(deps) {
  return simpleCrudRouter(deps, {
    entityType: 'testimonial',
    label: 'Testimonial',
    model: (db) => db.Testimonial,
    createSchema,
    updateSchema,
    sort: { displayOrder: 1, createdAt: -1 },
    publishMode: 'active',
    prepare: async (db, input) => {
      await assertCategory(db, input.categoryId, 'TESTIMONIAL');
      return input;
    },
    serialize: async (db, docs) => {
      const rows = docs;
      const out = await serialize(db, rows);
      return out.map((t, i) => ({ ...t, active: rows[i].active, photoId: idOf(rows[i].photoId), categoryId: idOf(rows[i].categoryId) }));
    },
  });
}
