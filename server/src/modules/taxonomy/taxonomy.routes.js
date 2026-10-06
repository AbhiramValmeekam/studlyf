import { Router } from 'express';
import { z } from 'zod';
import { CATEGORY_SCOPES } from '../../database/schema/index.js';
import { AppError } from '../../common/errors/app-error.js';
import { isDuplicateKeyError } from '../../common/middleware/error-handler.js';
import { created, ok } from '../../common/http/respond.js';
import { idParams, optionalText, parse, slugSchema, text } from '../../common/validation/index.js';
import { enumParam } from '../../common/validation/query.js';
import { recordAdminChange } from '../../common/utilities/admin-change.js';
import { slugify } from '../../common/utilities/text.js';
import { deleteTag, ensureTags, listCategories, listTags } from './taxonomy.service.js';

const scopeQuery = z.object({ scope: enumParam(CATEGORY_SCOPES).optional() });

const categoryCreate = z
  .object({
    scope: z.enum(CATEGORY_SCOPES),
    name: text(80),
    slug: slugSchema.optional(),
    description: optionalText(300),
    displayOrder: z.number().int().min(0).max(10_000).optional(),
  })
  .strict();
const categoryUpdate = categoryCreate.omit({ scope: true }).partial().strict();

const categoryView = (c) => ({
  id: String(c._id),
  scope: c.scope,
  name: c.name,
  slug: c.slug,
  description: c.description,
  displayOrder: c.displayOrder,
});

const slugConflict = (err) => {
  if (isDuplicateKeyError(err)) {
    throw new AppError('SLUG_TAKEN', 'A category with this slug already exists in this scope', [{ field: 'slug', message: 'Already in use' }]);
  }
  throw err;
};

export function taxonomyPublicRouter({ db }) {
  const r = Router();
  r.get('/categories', async (req, res) => {
    const { scope } = parse(scopeQuery, req.query);
    ok(res, await listCategories(db, scope));
  });
  return r;
}

export function taxonomyAdminRouter(deps) {
  const { db } = deps;
  const r = Router();

  r.get('/categories', async (req, res) => {
    const { scope } = parse(scopeQuery, req.query);
    ok(res, await listCategories(db, scope));
  });

  r.post('/categories', async (req, res) => {
    const body = parse(categoryCreate, req.body);
    const doc = await db.Category.create({ ...body, slug: body.slug ?? slugify(body.name) }).catch(slugConflict);
    await recordAdminChange(deps, req, { action: 'category.create', entityType: 'category', entityId: String(doc._id), changes: body });
    created(res, categoryView(doc));
  });

  r.patch('/categories/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const body = parse(categoryUpdate, req.body);
    const doc = await db.Category.findByIdAndUpdate(id, { $set: body }, { new: true, runValidators: true }).lean().catch(slugConflict);
    if (!doc) throw AppError.notFound('Category');
    await recordAdminChange(deps, req, { action: 'category.update', entityType: 'category', entityId: id, changes: body });
    ok(res, categoryView(doc));
  });

  r.delete('/categories/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const doc = await db.Category.findByIdAndDelete(id).lean();
    if (!doc) throw AppError.notFound('Category');
    // No foreign keys in MongoDB: detach the category from content explicitly.
    await Promise.all(
      [db.Opportunity, db.Resource, db.Testimonial, db.Partner].map((m) =>
        m.updateMany({ categoryId: id }, { $set: { categoryId: null } }),
      ),
    );
    await recordAdminChange(deps, req, { action: 'category.delete', entityType: 'category', entityId: id });
    ok(res, { id });
  });

  r.get('/tags', async (req, res) => {
    const { q } = parse(z.object({ q: z.string().trim().max(60).optional() }), req.query);
    ok(res, await listTags(db, q));
  });

  r.post('/tags', async (req, res) => {
    const { names } = parse(z.object({ names: z.array(text(60)).min(1).max(50) }).strict(), req.body);
    const tags = await ensureTags(db, names);
    await recordAdminChange(deps, req, { action: 'tag.create', entityType: 'tag', changes: { names } });
    created(res, tags);
  });

  r.delete('/tags/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    if (!(await deleteTag(db, id))) throw AppError.notFound('Tag');
    await recordAdminChange(deps, req, { action: 'tag.delete', entityType: 'tag', entityId: id });
    ok(res, { id });
  });

  return r;
}
