import { Router } from 'express';
import { requireAdmin, requireAuth } from '../../common/auth/middleware.js';
import { limiter, noStore } from '../../common/middleware/security.js';
import { created, ok, pageMeta } from '../../common/http/respond.js';
import { idParams, parse } from '../../common/validation/index.js';
import { recordAdminChange, recordAudit } from '../../common/utilities/admin-change.js';
import * as service from './submissions.service.js';
import { adminListQuery, createBody, eligibilityQuery, listQuery, updateBody } from './submissions.schemas.js';

/**
 * Project → opportunity submissions. The actor is always the session user; whether a PATCH is a
 * builder move (submit/withdraw) or an organiser review move is decided server-side.
 */
export function submissionsRouter(deps) {
  const { db, config } = deps;
  const r = Router();
  r.use(['/submissions', '/opportunities/:id/submissions'], noStore);

  r.get('/submissions/open-opportunities', requireAuth, async (_req, res) => {
    ok(res, await service.openOpportunities(db));
  });

  r.get('/projects/:id/submission-check', noStore, requireAuth, async (req, res) => {
    const { id } = parse(idParams, req.params);
    const { opportunityId } = parse(eligibilityQuery, req.query);
    ok(res, await service.checkEligibility(db, req.auth.user.id, id, opportunityId));
  });

  r.post(
    '/projects/:id/submissions',
    noStore,
    requireAuth,
    limiter(config.rateLimit.enabled, { windowMs: 60 * 60 * 1000, limit: 30 }),
    async (req, res) => {
      const { id } = parse(idParams, req.params);
      const body = parse(createBody, req.body);
      const { submission } = await service.create(db, req.auth.user.id, id, body);
      await recordAudit(deps, req, {
        action: body.submit ? 'project.submit' : 'submission.create_draft',
        entityType: 'submission',
        entityId: String(submission._id),
        changes: { projectId: id, opportunityId: body.opportunityId, status: submission.status },
      });
      created(res, await service.get(db, req.auth.user.id, String(submission._id)));
    },
  );

  r.get('/projects/:id/submissions', noStore, requireAuth, async (req, res) => {
    const { id } = parse(idParams, req.params);
    ok(res, await service.listForProject(db, req.auth.user.id, id));
  });

  r.get('/submissions', requireAuth, async (req, res) => {
    const q = parse(listQuery, req.query);
    const { items, total } = await service.listMine(db, req.auth.user.id, q);
    ok(res, items, pageMeta(q.page, q.pageSize, total));
  });

  r.get('/submissions/:id', requireAuth, async (req, res) => {
    const { id } = parse(idParams, req.params);
    ok(res, await service.get(db, req.auth.user.id, id));
  });

  r.patch('/submissions/:id', requireAuth, async (req, res) => {
    const { id } = parse(idParams, req.params);
    const body = parse(updateBody, req.body);
    const { action, from, to } = await service.update(db, req.auth.user.id, id, body);
    const audit = { entityType: 'submission', entityId: id, changes: { from: from ?? null, to: to ?? null, ...body } };
    if (action === 'review') await recordAdminChange(deps, req, { action: 'submission.status_change', ...audit });
    else await recordAudit(deps, req, { action: action === 'edit' ? 'submission.update' : `submission.${action}`, ...audit });
    ok(res, await service.get(db, req.auth.user.id, id));
  });

  // Organiser/admin view of an opportunity's submissions (Phase 4 adds organisation-scoped access).
  r.get('/opportunities/:id/submissions', requireAdmin(db), async (req, res) => {
    const { id } = parse(idParams, req.params);
    const q = parse(adminListQuery, req.query);
    const { items, total } = await service.listForOpportunity(db, id, q);
    ok(res, items, pageMeta(q.page, q.pageSize, total));
  });

  return r;
}

/** /admin/submissions — cross-opportunity submission management. */
export function submissionsAdminRouter(deps) {
  const { db } = deps;
  const r = Router();
  r.get('/', async (req, res) => {
    const q = parse(adminListQuery, req.query);
    const { items, total } = await service.adminList(db, q);
    ok(res, items, pageMeta(q.page, q.pageSize, total));
  });
  r.get('/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    ok(res, await service.get(db, req.auth.user.id, id));
  });
  return r;
}
