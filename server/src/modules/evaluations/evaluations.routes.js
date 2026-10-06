import { Router } from 'express';
import { requireAuth, requireRole, requireSuperAdmin } from '../../common/auth/middleware.js';
import { noStore } from '../../common/middleware/security.js';
import { created, ok, pageMeta } from '../../common/http/respond.js';
import { idParams, parse } from '../../common/validation/index.js';
import { recordAdminChange, recordAudit } from '../../common/utilities/admin-change.js';
import * as evaluations from './evaluations.service.js';
import * as templates from './templates.service.js';
import {
  adminEvaluationsQuery,
  assignBody,
  builderEvaluationsQuery,
  evaluatorGrantBody,
  evaluatorListQuery,
  evaluatorParams,
  evaluatorSaveBody,
  templateCreateBody,
  templatesQuery,
  templateUpdateBody,
} from './evaluations.schemas.js';

/**
 * Evaluator workspace — EVALUATOR role (checked against the database on every request).
 * An evaluator only ever sees evaluations assigned to them; anything else is a 404.
 */
export function evaluatorRouter(deps) {
  const { db } = deps;
  const r = Router();
  r.use('/evaluator', noStore, requireAuth, requireRole(db, 'EVALUATOR'));

  r.get('/evaluator/evaluations', async (req, res) => {
    const q = parse(evaluatorListQuery, req.query);
    const { items, total, counts } = await evaluations.listForEvaluator(db, req.auth.user.id, q);
    ok(res, items, { ...pageMeta(q.page, q.pageSize, total), counts });
  });

  r.get('/evaluator/evaluations/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    ok(res, await evaluations.getForEvaluator(deps, req.auth.user.id, id));
  });

  r.patch('/evaluator/evaluations/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const body = parse(evaluatorSaveBody, req.body);
    ok(res, await evaluations.save(deps, req.auth.user.id, id, body));
  });

  r.post('/evaluator/evaluations/:id/complete', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const body = parse(evaluatorSaveBody, req.body ?? {});
    const result = await evaluations.complete(deps, req.auth.user.id, id, body);
    await recordAudit(deps, req, {
      action: 'evaluation.complete',
      entityType: 'evaluation',
      entityId: id,
      changes: { overallScore: result.overallScore, scoreVisibility: result.scoreVisibility },
    });
    ok(res, result);
  });

  return r;
}

/** Builder "Evaluation results" — completed evaluations the team is allowed to see. */
export function builderEvaluationsRouter(deps) {
  const { db } = deps;
  const r = Router();
  r.use('/builder/evaluations', noStore, requireAuth);
  r.get('/builder/evaluations', async (req, res) => {
    const q = parse(builderEvaluationsQuery, req.query);
    const { items, total } = await evaluations.listForBuilder(db, req.auth.user.id, q);
    ok(res, items, pageMeta(q.page, q.pageSize, total));
  });
  r.get('/builder/evaluations/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    ok(res, await evaluations.getForBuilder(db, req.auth.user.id, id));
  });
  return r;
}

/**
 * Admin evaluation management, mounted at /admin:
 *   /evaluation-templates   rubric builder (EDITOR+)
 *   /evaluators             list (EDITOR+); grant/revoke the EVALUATOR role (SUPER_ADMIN)
 *   /evaluations            all evaluations incl. internal notes (EDITOR+)
 *   /submissions/:id/evaluations   assign an evaluator (EDITOR+)
 */
export function evaluationsAdminRouter(deps) {
  const { db } = deps;
  const r = Router();

  // -- templates
  r.get('/evaluation-templates', async (req, res) => {
    const q = parse(templatesQuery, req.query);
    const { items, total } = await templates.list(db, q);
    ok(res, items, pageMeta(q.page, q.pageSize, total));
  });
  r.get('/evaluation-templates/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    ok(res, await templates.get(db, id));
  });
  r.post('/evaluation-templates', async (req, res) => {
    const body = parse(templateCreateBody, req.body);
    const item = await templates.create(db, req.auth.user.id, body);
    await recordAdminChange(deps, req, { action: 'evaluation_template.create', entityType: 'evaluation_template', entityId: item.id, changes: { name: body.name, criteria: body.criteria.length } });
    created(res, item);
  });
  r.patch('/evaluation-templates/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const body = parse(templateUpdateBody, req.body);
    const item = await templates.update(db, req.auth.user.id, id, body);
    await recordAdminChange(deps, req, { action: 'evaluation_template.update', entityType: 'evaluation_template', entityId: id, changes: { fields: Object.keys(body) } });
    ok(res, item);
  });
  for (const [verb, active] of [['activate', true], ['deactivate', false]]) {
    r.post(`/evaluation-templates/:id/${verb}`, async (req, res) => {
      const { id } = parse(idParams, req.params);
      const item = await templates.setActive(db, req.auth.user.id, id, active);
      await recordAdminChange(deps, req, { action: `evaluation_template.${verb}`, entityType: 'evaluation_template', entityId: id });
      ok(res, item);
    });
  }
  r.delete('/evaluation-templates/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const removed = await templates.remove(db, id);
    await recordAdminChange(deps, req, { action: 'evaluation_template.delete', entityType: 'evaluation_template', entityId: id, changes: removed });
    ok(res, { id });
  });

  // -- evaluators
  r.get('/evaluators', async (_req, res) => ok(res, await evaluations.listEvaluators(db)));
  r.post('/evaluators', requireSuperAdmin, async (req, res) => {
    const body = parse(evaluatorGrantBody, req.body);
    const user = await evaluations.grantEvaluator(db, body);
    await recordAdminChange(deps, req, { action: 'evaluator.grant', entityType: 'user', entityId: user.id, changes: { role: 'EVALUATOR' } });
    created(res, user);
  });
  r.delete('/evaluators/:userId', requireSuperAdmin, async (req, res) => {
    const { userId } = parse(evaluatorParams, req.params);
    await evaluations.revokeEvaluator(db, userId);
    await recordAdminChange(deps, req, { action: 'evaluator.revoke', entityType: 'user', entityId: userId, changes: { role: 'EVALUATOR' } });
    ok(res, { id: userId });
  });

  // -- evaluations
  r.get('/evaluations', async (req, res) => {
    const q = parse(adminEvaluationsQuery, req.query);
    const { items, total } = await evaluations.listAdmin(db, q);
    ok(res, items, pageMeta(q.page, q.pageSize, total));
  });
  r.get('/evaluations/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    ok(res, await evaluations.getAdmin(db, id, deps.config));
  });
  r.delete('/evaluations/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const removed = await evaluations.unassign(db, id);
    await recordAdminChange(deps, req, { action: 'evaluation.unassign', entityType: 'evaluation', entityId: id, changes: removed });
    ok(res, { id });
  });
  r.post('/submissions/:id/evaluations', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const body = parse(assignBody, req.body);
    const item = await evaluations.assign(deps, req.auth.user.id, id, body);
    await recordAdminChange(deps, req, {
      action: 'evaluation.assign',
      entityType: 'evaluation',
      entityId: item.id,
      changes: { submissionId: id, evaluatorUserId: body.evaluatorUserId, templateName: item.templateName },
    });
    created(res, item);
  });

  return r;
}
