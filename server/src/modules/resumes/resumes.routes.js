import { Router } from 'express';
import { requireAuth } from '../../common/auth/middleware.js';
import { noStore } from '../../common/middleware/security.js';
import { created, ok, pageMeta } from '../../common/http/respond.js';
import { idParams, parse } from '../../common/validation/index.js';
import { createBody, listQuery, updateBody } from './resumes.schemas.js';
import * as service from './resumes.service.js';

// Per-user resume CRUD. Every route is gated by requireAuth + noStore and scoped
// to the caller's own userId — resumes are private and never cached.
export function resumesRouter({ db }) {
  const r = Router();
  r.use('/me/resumes', noStore, requireAuth);

  r.get('/me/resumes', async (req, res) => {
    const q = parse(listQuery, req.query);
    const { items, total } = await service.list(db, req.auth.user.id, q);
    ok(res, items, pageMeta(q.page, q.pageSize, total));
  });

  r.post('/me/resumes', async (req, res) => {
    const body = parse(createBody, req.body);
    created(res, await service.create(db, req.auth.user.id, body));
  });

  r.get('/me/resumes/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    ok(res, await service.get(db, req.auth.user.id, id));
  });

  r.patch('/me/resumes/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const patch = parse(updateBody, req.body);
    ok(res, await service.update(db, req.auth.user.id, id, patch));
  });

  r.delete('/me/resumes/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    ok(res, await service.remove(db, req.auth.user.id, id));
  });

  return r;
}
