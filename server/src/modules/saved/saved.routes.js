import { Router } from 'express';
import { requireAuth } from '../../common/auth/middleware.js';
import { noStore } from '../../common/middleware/security.js';
import { created, ok, pageMeta } from '../../common/http/respond.js';
import { parse } from '../../common/validation/index.js';
import * as service from './saved.service.js';
import { listQuery, removeQuery, saveBody } from './saved.schemas.js';

/**
 * A user's saved items. Outside the public cache and behind a session for the same reason the
 * OTT shelf is: what someone bookmarked is theirs, and a shared cache would hand the next
 * reader their shortlist.
 */
export function savedRouter({ db }) {
  const r = Router();
  r.use('/me/saved', noStore, requireAuth);

  r.get('/me/saved', async (req, res) => {
    const query = parse(listQuery, req.query);
    const { items, total, counts } = await service.list(db, req.auth.user.id, query);
    ok(res, items, { ...pageMeta(query.page, query.pageSize, total), counts });
  });

  r.post('/me/saved', async (req, res) => {
    const body = parse(saveBody, req.body);
    created(res, await service.save(db, req.auth.user.id, body));
  });

  r.delete('/me/saved', async (req, res) => {
    const query = parse(removeQuery, req.query);
    ok(res, await service.unsave(db, req.auth.user.id, query));
  });

  return r;
}
