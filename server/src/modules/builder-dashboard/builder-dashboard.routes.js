import { Router } from 'express';
import { requireAuth, requireBuilder } from '../../common/auth/middleware.js';
import { noStore } from '../../common/middleware/security.js';
import { ok } from '../../common/http/respond.js';
import * as service from './builder-dashboard.service.js';

/** Authenticated builder dashboard aggregate. */
export function builderDashboardRouter(deps) {
  const { db } = deps;
  const r = Router();
  r.use('/builder/dashboard', noStore, requireAuth, requireBuilder(db));

  r.get('/builder/dashboard', async (req, res) => {
    ok(res, await service.getDashboard(db, req.auth.user.id));
  });

  return r;
}
