import { Router } from 'express';
import { z } from 'zod';
import {
  ACHIEVEMENT_SOURCES,
  ACHIEVEMENT_TYPES,
  ACHIEVEMENT_VERIFICATION_STATUSES,
  ACHIEVEMENT_VISIBILITIES,
  USER_ACHIEVEMENT_TYPES,
} from '../../database/schema/index.js';
import { requireAuth } from '../../common/auth/middleware.js';
import { noStore } from '../../common/middleware/security.js';
import { created, ok, pageMeta } from '../../common/http/respond.js';
import { httpUrl, idParams, isoDate, objectIdSchema, optionalText, paginationQuery, parse, text } from '../../common/validation/index.js';
import { enumParam } from '../../common/validation/query.js';
import { recordAdminChange, recordAudit } from '../../common/utilities/admin-change.js';
import * as service from './achievements.service.js';

// Users choose from USER_ACHIEVEMENT_TYPES only and can never send a verification status or source.
const userFields = {
  title: text(160),
  description: optionalText(1000),
  type: z.enum(USER_ACHIEVEMENT_TYPES),
  issuer: optionalText(120),
  date: isoDate.optional(),
  projectId: objectIdSchema.nullish(),
  url: httpUrl.nullish(),
  visibility: z.enum(ACHIEVEMENT_VISIBILITIES).optional(),
};
const createBody = z.object(userFields).strict();
const updateBody = z.object(userFields).partial().strict();
const usernameParams = z.object({ username: z.string().trim().toLowerCase().min(1).max(40) });
const listQuery = z.object({ ...paginationQuery, pageSize: z.coerce.number().int().min(1).max(100).default(50) });

export function achievementsRouter(deps) {
  const { db } = deps;
  const r = Router();
  r.use(['/achievements', '/users/:username/achievements'], noStore);

  // Public: a builder's public achievements (their builder profile must be public).
  r.get('/users/:username/achievements', async (req, res) => {
    const { username } = parse(usernameParams, req.params);
    const q = parse(listQuery, req.query);
    const { items, total } = await service.listPublicByUsername(db, username, q);
    ok(res, items, pageMeta(q.page, q.pageSize, total));
  });

  r.get('/achievements', requireAuth, async (req, res) => {
    const q = parse(listQuery, req.query);
    const { items, total } = await service.listMine(db, req.auth.user.id, q);
    ok(res, items, pageMeta(q.page, q.pageSize, total));
  });

  r.post('/achievements', requireAuth, async (req, res) => {
    const body = parse(createBody, req.body);
    const item = await service.createForUser(db, req.auth.user.id, body);
    await recordAudit(deps, req, { action: 'achievement.create', entityType: 'achievement', entityId: item.id, changes: { type: body.type, source: 'USER' } });
    created(res, item);
  });

  r.patch('/achievements/:id', requireAuth, async (req, res) => {
    const { id } = parse(idParams, req.params);
    const body = parse(updateBody, req.body);
    const item = await service.updateForUser(db, req.auth.user.id, id, body);
    await recordAudit(deps, req, { action: 'achievement.update', entityType: 'achievement', entityId: id, changes: { fields: Object.keys(body) } });
    ok(res, item);
  });

  r.delete('/achievements/:id', requireAuth, async (req, res) => {
    const { id } = parse(idParams, req.params);
    await service.removeForUser(db, req.auth.user.id, id);
    await recordAudit(deps, req, { action: 'achievement.delete', entityType: 'achievement', entityId: id });
    ok(res, { id });
  });

  return r;
}

const adminListQuery = z.object({
  source: enumParam(ACHIEVEMENT_SOURCES).optional(),
  verificationStatus: enumParam(ACHIEVEMENT_VERIFICATION_STATUSES).optional(),
  type: enumParam(ACHIEVEMENT_TYPES).optional(),
  userId: objectIdSchema.optional(),
  ...paginationQuery,
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
const verifyBody = z.object({ verificationStatus: z.enum(ACHIEVEMENT_VERIFICATION_STATUSES) }).strict();
const awardBody = z
  .object({
    userId: objectIdSchema,
    type: z.enum(ACHIEVEMENT_TYPES),
    title: text(160),
    description: optionalText(1000),
    issuer: optionalText(120),
    date: isoDate.optional(),
    projectId: objectIdSchema.nullish(),
    opportunityId: objectIdSchema.nullish(),
  })
  .strict();

/** /admin/achievements — review, verify/reject user claims, award platform achievements. */
export function achievementsAdminRouter(deps) {
  const { db } = deps;
  const r = Router();
  r.get('/', async (req, res) => {
    const q = parse(adminListQuery, req.query);
    const { items, total } = await service.listAdmin(db, q);
    ok(res, items, pageMeta(q.page, q.pageSize, total));
  });
  r.post('/', async (req, res) => {
    const body = parse(awardBody, req.body);
    const item = await service.adminAward(db, req.auth.user.id, body);
    await recordAdminChange(deps, req, { action: 'achievement.award', entityType: 'achievement', entityId: item.id, changes: { userId: body.userId, type: body.type } });
    created(res, item);
  });
  r.post('/:id/verification', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const { verificationStatus } = parse(verifyBody, req.body);
    const item = await service.adminSetVerification(db, req.auth.user.id, id, verificationStatus);
    await recordAdminChange(deps, req, { action: 'achievement.verify', entityType: 'achievement', entityId: id, changes: { verificationStatus } });
    ok(res, item);
  });
  r.delete('/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const removed = await service.adminRemove(db, id);
    await recordAdminChange(deps, req, { action: 'achievement.delete', entityType: 'achievement', entityId: id, changes: removed });
    ok(res, { id });
  });
  return r;
}
