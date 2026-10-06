import { Router } from 'express';
import { requireAuth } from '../../common/auth/middleware.js';
import { noStore } from '../../common/middleware/security.js';
import { created, ok, pageMeta } from '../../common/http/respond.js';
import { idParams, parse, slugParams } from '../../common/validation/index.js';
import { recordAdminChange } from '../../common/utilities/admin-change.js';
import * as repo from './ott.repository.js';
import * as service from './ott.service.js';
import { adminListQuery, createBody, progressBody, progressQuery, publicListQuery, publishBody, updateBody } from './ott.schemas.js';

/** The published shelf. Cacheable — nothing here is per-viewer; progress rides on /me/ott. */
export function ottPublicRouter({ db }) {
  const r = Router();

  r.get('/ott', async (req, res) => {
    const query = parse(publicListQuery, req.query);
    const { rows, total } = await repo.listPublic(db, query);
    ok(res, await service.toPublicList(db, rows), pageMeta(query.page, query.pageSize, total));
  });

  r.get('/ott/:slug', async (req, res) => {
    const { slug } = parse(slugParams, req.params);
    ok(res, await service.getPublicBySlug(db, slug));
  });

  return r;
}

/**
 * A viewer's own place in the shelf. Deliberately outside the public cache and behind a session:
 * what someone is watching is theirs, and a shared cache would hand it to the next reader.
 */
export function ottViewerRouter(deps) {
  const { db } = deps;
  const r = Router();
  r.use('/me/ott', noStore, requireAuth);

  r.get('/me/ott', async (req, res) => {
    ok(res, await service.getShelf(db, req.auth.user.id));
  });

  r.put('/me/ott/:id/progress', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const body = parse(progressBody, req.body);
    ok(res, await service.setProgress(db, req.auth.user.id, id, body));
  });

  r.delete('/me/ott/:id/progress', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const query = parse(progressQuery, req.query);
    ok(res, await service.clearProgress(db, req.auth.user.id, id, query.episodeKey));
  });

  return r;
}

export function ottAdminRouter(deps) {
  const { db } = deps;
  const r = Router();
  const entityType = 'ott_title';

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
    await recordAdminChange(deps, req, { action: `${entityType}.create`, entityType, entityId: item.id, changes: { ...body, description: undefined } });
    created(res, item);
  });

  r.patch('/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const body = parse(updateBody, req.body);
    const item = await service.update(db, id, body, req.auth.user.id);
    await recordAdminChange(deps, req, { action: `${entityType}.update`, entityType, entityId: id, changes: { ...body, description: body.description === undefined ? undefined : '[updated]' } });
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
