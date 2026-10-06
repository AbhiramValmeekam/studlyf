import { Router } from 'express';
import { requireAuth, requireBuilder } from '../../common/auth/middleware.js';
import { noStore } from '../../common/middleware/security.js';
import { created, ok, pageMeta } from '../../common/http/respond.js';
import { idParams, parse } from '../../common/validation/index.js';
import { recordAdminChange } from '../../common/utilities/admin-change.js';
import * as service from './applications.service.js';
import { applyBody, builderListQuery, editBody, reviewBody } from './applications.schemas.js';

/** Authenticated builder-owned application routes (own applications only). */
export function applicationsBuilderRouter(deps) {
  const { db } = deps;
  const r = Router();
  r.use('/builder/applications', noStore, requireAuth, requireBuilder(db));

  r.get('/builder/applications', async (req, res) => {
    const q = parse(builderListQuery, req.query);
    const { items, total } = await service.listOwn(db, req.auth.user.id, q);
    ok(res, items, pageMeta(q.page, q.pageSize, total));
  });

  r.get('/builder/applications/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    ok(res, await service.getOwn(db, req.auth.user.id, id));
  });

  r.post('/builder/applications', async (req, res) => {
    const body = parse(applyBody, req.body);
    created(res, await service.apply(db, req.auth.user.id, body));
  });

  r.patch('/builder/applications/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const { answers } = parse(editBody, req.body);
    ok(res, await service.editDraft(db, req.auth.user.id, id, answers));
  });

  r.post('/builder/applications/:id/submit', async (req, res) => {
    const { id } = parse(idParams, req.params);
    ok(res, await service.submit(db, req.auth.user.id, id));
  });

  r.post('/builder/applications/:id/withdraw', async (req, res) => {
    const { id } = parse(idParams, req.params);
    ok(res, await service.withdraw(db, req.auth.user.id, id));
  });

  return r;
}

/** Admin application-review routes; mounted inside the requireAdmin-gated admin tree. */
export function applicationsAdminRouter(deps) {
  const { db } = deps;
  const r = Router();
  const entityType = 'application';

  r.get('/opportunities/:id/applications', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const q = parse(builderListQuery, req.query);
    const { items, total } = await service.listForOpportunity(db, id, q);
    ok(res, items, pageMeta(q.page, q.pageSize, total));
  });

  r.get('/applications/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    ok(res, await service.getAdmin(db, id));
  });

  r.post('/applications/:id/status', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const body = parse(reviewBody, req.body);
    const { application } = await service.review(db, id, req.auth.user.id, body);
    await recordAdminChange(deps, req, {
      action: `${entityType}.review`,
      entityType,
      entityId: id,
      changes: { status: body.status, reviewerNote: body.reviewerNote ?? null },
    });
    ok(res, application);
  });

  return r;
}
