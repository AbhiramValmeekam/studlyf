import { Router } from 'express';
import { created, ok, pageMeta } from '../../common/http/respond.js';
import { idParams, parse } from '../../common/validation/index.js';
import { recordAdminChange } from '../../common/utilities/admin-change.js';
import * as service from './skills.service.js';
import { adminListQuery, createBody, publicListQuery, updateBody } from './skills.schemas.js';

export function skillsPublicRouter({ db }) {
  const r = Router();

  r.get('/skills', async (req, res) => {
    const query = parse(publicListQuery, req.query);
    const { items, total } = await service.listPublic(db, query);
    ok(res, items, pageMeta(query.page, query.pageSize, total));
  });

  return r;
}

export function skillsAdminRouter(deps) {
  const { db } = deps;
  const r = Router();
  const entityType = 'skill';

  r.get('/', async (req, res) => {
    const query = parse(adminListQuery, req.query);
    const { items, total } = await service.listAdmin(db, query);
    ok(res, items, pageMeta(query.page, query.pageSize, total));
  });

  r.get('/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    ok(res, await service.getAdmin(db, id));
  });

  r.post('/', async (req, res) => {
    const body = parse(createBody, req.body);
    const item = await service.create(db, body);
    await recordAdminChange(deps, req, { action: `${entityType}.create`, entityType, entityId: item.id, changes: body });
    created(res, item);
  });

  r.patch('/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const body = parse(updateBody, req.body);
    const item = await service.update(db, id, body);
    await recordAdminChange(deps, req, { action: `${entityType}.update`, entityType, entityId: id, changes: body });
    ok(res, item);
  });

  for (const [verb, active] of [['activate', true], ['deactivate', false]]) {
    r.post(`/:id/${verb}`, async (req, res) => {
      const { id } = parse(idParams, req.params);
      const item = await service.setActive(db, id, active);
      await recordAdminChange(deps, req, { action: `${entityType}.${verb}`, entityType, entityId: id });
      ok(res, item);
    });
  }

  r.delete('/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const removed = await service.remove(db, id);
    await recordAdminChange(deps, req, { action: `${entityType}.delete`, entityType, entityId: id, changes: removed });
    ok(res, { id });
  });

  return r;
}
