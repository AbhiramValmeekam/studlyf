import { Router } from 'express';
import { z } from 'zod';
import { ACCESS_STATUSES } from '../../database/schema/index.js';
import { requireAuth, requireSuperAdmin } from '../../common/auth/middleware.js';
import { noStore } from '../../common/middleware/security.js';
import { ok, pageMeta } from '../../common/http/respond.js';
import { objectIdSchema, optionalText, paginationQuery, parse } from '../../common/validation/index.js';
import { enumParam } from '../../common/validation/query.js';
import { recordAdminChange } from '../../common/utilities/admin-change.js';
import * as access from './access.service.js';
import { ecosystemStates } from './ecosystems.service.js';

const CONTROLLED = ['INVESTOR', 'HR', 'ORGANIZER'];

/** GET /me/ecosystems — the signed-in account's state in every ecosystem (also embedded in /me). */
export function ecosystemsRouter({ db }) {
  const r = Router();
  r.get('/me/ecosystems', noStore, requireAuth, async (req, res) => {
    ok(res, await ecosystemStates(db, req.auth.user.id));
  });
  return r;
}

const listQuery = z.object({
  ecosystem: enumParam(CONTROLLED).optional(),
  status: enumParam(ACCESS_STATUSES).optional(),
  ...paginationQuery,
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
const statusParams = z.object({ ecosystem: enumParam(CONTROLLED), id: objectIdSchema });
const statusBody = z.object({ status: z.enum(ACCESS_STATUSES), note: optionalText(1000) }).strict();

/** /admin/access-requests — verify investors, HR users and organizations. */
export function accessAdminRouter(deps) {
  const { db } = deps;
  const r = Router();
  r.get('/access-requests', async (req, res) => {
    const q = parse(listQuery, req.query);
    const { items, total, counts } = await access.listRequests(db, q);
    ok(res, items, { ...pageMeta(q.page, q.pageSize, total), counts });
  });
  r.post('/access-requests/:ecosystem/:id/status', requireSuperAdmin, async (req, res) => {
    const { ecosystem, id } = parse(statusParams, req.params);
    const body = parse(statusBody, req.body);
    const { item, before } = await access.setStatus(db, req.auth.user.id, ecosystem, id, body);
    await recordAdminChange(deps, req, {
      action: 'ecosystem_access.status_change',
      entityType: ecosystem === 'ORGANIZER' ? 'organization' : `${ecosystem.toLowerCase()}_profile`,
      entityId: id,
      changes: { from: before, to: body.status, note: body.note ?? null },
    });
    ok(res, item);
  });
  return r;
}
