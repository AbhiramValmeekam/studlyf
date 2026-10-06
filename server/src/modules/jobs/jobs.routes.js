import { Router } from 'express';
import { created, ok, pageMeta } from '../../common/http/respond.js';
import { idParams, parse, slugParams } from '../../common/validation/index.js';
import { limiter, noStore } from '../../common/middleware/security.js';
import { requireAuth } from '../../common/auth/middleware.js';
import { recordAudit } from '../../common/utilities/admin-change.js';
import { requireEcosystem } from '../ecosystems/ecosystems.service.js';
import * as repo from './jobs.repository.js';
import * as service from './jobs.service.js';
import { createBody, hrListQuery, publicListQuery, updateBody } from './jobs.schemas.js';

/** Public job board — cacheable, and the same shape a saved job resolves through. */
export function jobsPublicRouter({ db }) {
  const r = Router();

  r.get('/jobs', async (req, res) => {
    const query = parse(publicListQuery, req.query);
    const { rows, total } = await repo.listPublic(db, query);
    ok(res, await service.toPublicList(db, rows), pageMeta(query.page, query.pageSize, total));
  });

  r.get('/jobs/:slug', async (req, res) => {
    const { slug } = parse(slugParams, req.params);
    ok(res, await service.getPublicBySlug(db, slug));
  });

  return r;
}

/**
 * /hr/jobs — a verified HR account's own posts. Scoped to the owner on every read and write, so a
 * draft is invisible to anyone else and another HR user gets a 404 rather than a 403 (which would
 * confirm the id exists). Never in the public group: drafts must not be cacheable.
 */
export function hrJobsRouter(deps) {
  const { db, config } = deps;
  const r = Router();
  const writes = limiter(config.rateLimit.enabled, { windowMs: 60_000, limit: 60 });

  r.use('/hr/jobs', noStore, requireAuth, requireEcosystem(db, 'HR'));

  r.get('/hr/jobs', async (req, res) => {
    const query = parse(hrListQuery, req.query);
    const { rows, total } = await service.listMine(db, req.auth.user.id, query);
    ok(res, await service.toAdminList(db, rows, req.auth.user.id), pageMeta(query.page, query.pageSize, total));
  });

  r.get('/hr/jobs/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    ok(res, await service.getAdmin(db, id, req.auth.user.id));
  });

  r.post('/hr/jobs', writes, async (req, res) => {
    const body = parse(createBody, req.body);
    const item = await service.create(db, body, req.auth.user.id);
    await recordAudit(deps, req, { action: 'job.create', entityType: 'job', entityId: item.id, changes: { title: item.title } });
    created(res, item);
  });

  r.patch('/hr/jobs/:id', writes, async (req, res) => {
    const { id } = parse(idParams, req.params);
    const body = parse(updateBody, req.body);
    const item = await service.update(db, id, body, req.auth.user.id);
    await recordAudit(deps, req, { action: 'job.update', entityType: 'job', entityId: id, changes: { fields: Object.keys(body) } });
    ok(res, item);
  });

  r.post('/hr/jobs/:id/publish', writes, async (req, res) => {
    const { id } = parse(idParams, req.params);
    const item = await service.setPublished(db, id, req.auth.user.id, true);
    await recordAudit(deps, req, { action: 'job.publish', entityType: 'job', entityId: id, changes: { publishedAt: item.publishedAt } });
    ok(res, item);
  });

  r.post('/hr/jobs/:id/unpublish', writes, async (req, res) => {
    const { id } = parse(idParams, req.params);
    const item = await service.setPublished(db, id, req.auth.user.id, false);
    await recordAudit(deps, req, { action: 'job.unpublish', entityType: 'job', entityId: id });
    ok(res, item);
  });

  r.delete('/hr/jobs/:id', writes, async (req, res) => {
    const { id } = parse(idParams, req.params);
    const removed = await service.remove(db, id, req.auth.user.id);
    await recordAudit(deps, req, { action: 'job.delete', entityType: 'job', entityId: id, changes: removed });
    ok(res, removed);
  });

  return r;
}
