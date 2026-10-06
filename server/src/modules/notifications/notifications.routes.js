import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../common/auth/middleware.js';
import { noStore } from '../../common/middleware/security.js';
import { ok, pageMeta } from '../../common/http/respond.js';
import { idParams, paginationQuery, parse, queryBool } from '../../common/validation/index.js';
import * as service from './notifications.service.js';

const listQuery = z.object({ unread: queryBool.optional(), ...paginationQuery });

export function notificationsRouter({ db }) {
  const r = Router();
  r.use('/me/notifications', noStore, requireAuth);

  r.get('/me/notifications', async (req, res) => {
    const q = parse(listQuery, req.query);
    const { items, total, unreadCount } = await service.list(db, req.auth.user.id, q);
    ok(res, items, { ...pageMeta(q.page, q.pageSize, total), unreadCount });
  });

  r.post('/me/notifications/read-all', async (req, res) => {
    ok(res, await service.markAllRead(db, req.auth.user.id));
  });

  r.post('/me/notifications/:id/read', async (req, res) => {
    const { id } = parse(idParams, req.params);
    ok(res, await service.markRead(db, req.auth.user.id, id));
  });

  return r;
}
