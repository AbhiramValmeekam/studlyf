import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/app-error.js';
import { created, ok, pageMeta } from '../http/respond.js';
import { idParams, paginationQuery, parse } from '../validation/index.js';
import { recordAdminChange } from './admin-change.js';

/**
 * Admin CRUD + publish/unpublish for small, ordered display content (stats, partners,
 * testimonials, path cards). Each module still owns its schema, rules and serializer.
 */
export function simpleCrudRouter(deps, cfg) {
  const { db } = deps;
  const r = Router();
  const model = cfg.model(db);

  const findById = async (id) => (await model.findById(id).lean());
  const one = async (id) => {
    const doc = await findById(id);
    if (!doc) throw AppError.notFound(cfg.label);
    return (await cfg.serialize(db, [doc]))[0];
  };

  r.get('/', async (req, res) => {
    const { page, pageSize } = parse(z.object(paginationQuery), { page: req.query.page, pageSize: req.query.pageSize ?? 50 });
    const [docs, total] = await Promise.all([
      model.find().sort(cfg.sort).skip((page - 1) * pageSize).limit(pageSize).lean(),
      model.countDocuments(),
    ]);
    ok(res, await cfg.serialize(db, docs), pageMeta(page, pageSize, total));
  });

  r.get('/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    ok(res, await one(id));
  });

  r.post('/', async (req, res) => {
    const body = parse(cfg.createSchema, req.body);
    const values = cfg.prepare ? await cfg.prepare(db, body) : body;
    const doc = await model.create(values);
    await recordAdminChange(deps, req, { action: `${cfg.entityType}.create`, entityType: cfg.entityType, entityId: String(doc._id), changes: body });
    created(res, await one(String(doc._id)));
  });

  r.patch('/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const body = parse(cfg.updateSchema, req.body);
    const existing = await findById(id);
    if (!existing) throw AppError.notFound(cfg.label);
    const values = cfg.prepare ? await cfg.prepare(db, body, existing) : body;
    if (Object.keys(values).length) await model.updateOne({ _id: id }, { $set: values }, { runValidators: true });
    await recordAdminChange(deps, req, { action: `${cfg.entityType}.update`, entityType: cfg.entityType, entityId: id, changes: body });
    ok(res, await one(id));
  });

  const publishUpdate = (published) =>
    cfg.publishMode === 'active'
      ? { active: published }
      : published
        ? { status: 'PUBLISHED', publishedAt: new Date() }
        : { status: 'DRAFT' };

  for (const [verb, published] of [['publish', true], ['unpublish', false]]) {
    r.post(`/:id/${verb}`, async (req, res) => {
      const { id } = parse(idParams, req.params);
      const { matchedCount } = await model.updateOne({ _id: id }, { $set: publishUpdate(published) });
      if (!matchedCount) throw AppError.notFound(cfg.label);
      await recordAdminChange(deps, req, { action: `${cfg.entityType}.${verb}`, entityType: cfg.entityType, entityId: id });
      ok(res, await one(id));
    });
  }

  r.delete('/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const doc = await model.findByIdAndDelete(id).lean();
    if (!doc) throw AppError.notFound(cfg.label);
    await recordAdminChange(deps, req, { action: `${cfg.entityType}.delete`, entityType: cfg.entityType, entityId: id });
    ok(res, { id });
  });

  return r;
}
