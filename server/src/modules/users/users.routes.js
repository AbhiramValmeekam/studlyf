import { Router } from 'express';
import { z } from 'zod';
import { ROLES, USER_STATUSES } from '../../database/schema/index.js';
import { requireAuth } from '../../common/auth/middleware.js';
import { revokeAllUserSessions } from '../../common/auth/session-store.js';
import { AppError } from '../../common/errors/app-error.js';
import { noStore } from '../../common/middleware/security.js';
import { ok, pageMeta } from '../../common/http/respond.js';
import { idParams, paginationQuery, parse, text } from '../../common/validation/index.js';
import { enumParam, searchText } from '../../common/validation/query.js';
import { recordAdminChange } from '../../common/utilities/admin-change.js';
import { phoneSchema } from '../auth/auth.schemas.js';
import * as users from './users.service.js';

// Profile photo upload for end users arrives with the Builder profile (Phase 2).
const mePatch = z
  .object({ name: text(100), phone: phoneSchema.nullable() })
  .partial()
  .strict();

export function meRouter({ db }) {
  const r = Router();
  r.use('/me', noStore, requireAuth);
  r.get('/me', async (req, res) => {
    ok(res, await users.getMe(db, req.auth.user.id));
  });
  r.patch('/me', async (req, res) => {
    const body = parse(mePatch, req.body);
    ok(res, await users.updateMe(db, req.auth.user.id, body));
  });
  return r;
}

const listQuery = z.object({
  q: searchText,
  status: enumParam(USER_STATUSES).optional(),
  role: enumParam(ROLES).optional(),
  ...paginationQuery,
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

// Deliberately small: no role grants here. Roles beyond BUILDER/FOUNDER come from
// verified flows in later phases; admin access is managed out-of-band.
const adminPatch = z
  .object({ status: z.enum(USER_STATUSES), emailVerified: z.boolean(), name: text(100) })
  .partial()
  .strict();

export function usersAdminRouter(deps) {
  const { db } = deps;
  const r = Router();

  r.get('/', async (req, res) => {
    const q = parse(listQuery, req.query);
    const { items, total } = await users.adminList(db, q);
    ok(res, items, pageMeta(q.page, q.pageSize, total));
  });

  r.get('/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    ok(res, await users.adminGet(db, id));
  });

  r.patch('/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const body = parse(adminPatch, req.body);
    if (id === req.auth.user.id && body.status && body.status !== 'ACTIVE') {
      throw new AppError('BAD_REQUEST', 'You cannot deactivate your own account');
    }
    const user = await users.adminUpdate(db, id, body);
    if (body.status && body.status !== 'ACTIVE') await revokeAllUserSessions(db, id);
    await recordAdminChange(deps, req, { action: 'user.update', entityType: 'user', entityId: id, changes: body });
    ok(res, user);
  });

  return r;
}
