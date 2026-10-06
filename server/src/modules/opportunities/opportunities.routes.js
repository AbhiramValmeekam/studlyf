import { Router } from 'express';
import { created, ok, pageMeta } from '../../common/http/respond.js';
import { idParams, parse, slugParams } from '../../common/validation/index.js';
import { recordAdminChange } from '../../common/utilities/admin-change.js';
import * as repo from './opportunities.repository.js';
import * as service from './opportunities.service.js';
import { adminListQuery, createBody, publicListQuery, publishBody, updateBody } from './opportunities.schemas.js';

export function opportunitiesPublicRouter({ db }) {
  const r = Router();

  r.get('/opportunities', async (req, res) => {
    const query = parse(publicListQuery, req.query);
    const { rows, total } = await repo.listPublic(db, query);
    ok(res, await service.toPublicList(db, rows), pageMeta(query.page, query.pageSize, total));
  });

  r.get('/opportunities/:slug', async (req, res) => {
    const { slug } = parse(slugParams, req.params);
    ok(res, await service.getPublicBySlug(db, slug));
  });

  return r;
}

export function opportunitiesAdminRouter(deps) {
  const { db } = deps;
  const r = Router();
  const entityType = 'opportunity';

  r.get('/', async (req, res) => {
    const query = parse(adminListQuery, req.query);
    const { rows, total } = await repo.listAdmin(db, query);
    ok(res, await service.toAdminList(db, rows), pageMeta(query.page, query.pageSize, total));
  });

  r.get('/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    ok(res, await service.getAdmin(db, id));
  });

  r.post('/', async (req, res) => {
    const body = parse(createBody, req.body);
    const item = await service.create(db, body, req.auth.user.id);
    await recordAdminChange(deps, req, { action: `${entityType}.create`, entityType, entityId: item.id, changes: body });
    created(res, item);
  });

  r.patch('/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const body = parse(updateBody, req.body);
    const item = await service.update(db, id, body, req.auth.user.id);
    await recordAdminChange(deps, req, { action: `${entityType}.update`, entityType, entityId: id, changes: body });
    ok(res, item);
  });

  r.post('/:id/publish', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const { publishedAt } = parse(publishBody, req.body ?? {});
    const item = await service.setPublished(db, id, true, req.auth.user.id, publishedAt);
    await recordAdminChange(deps, req, { action: `${entityType}.publish`, entityType, entityId: id, changes: { publishedAt: item.publishedAt } });
    ok(res, item);
  });

  r.post('/:id/unpublish', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const item = await service.setPublished(db, id, false, req.auth.user.id);
    await recordAdminChange(deps, req, { action: `${entityType}.unpublish`, entityType, entityId: id });
    ok(res, item);
  });

  r.delete('/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const removed = await service.remove(db, id);
    await recordAdminChange(deps, req, { action: `${entityType}.delete`, entityType, entityId: id, changes: removed });
    ok(res, { id });
  });

  return r;
}
