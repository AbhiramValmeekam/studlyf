import { Router } from 'express';
import { requireAuth } from '../../common/auth/middleware.js';
import { noStore } from '../../common/middleware/security.js';
import { ok } from '../../common/http/respond.js';
import { parse } from '../../common/validation/index.js';
import { getMe } from '../users/users.service.js';
import { personalPatchBody } from './profile.schemas.js';
import { applyPersonalPatch } from './profile.service.js';

/**
 * The personal profile behind the "Complete your profile" prompt and the profile page.
 * Any signed-in user may edit their own — no builder role required. Returns the full
 * `Me` payload so the client can refresh its session user in one round-trip.
 */
export function profileRouter({ db }) {
  const r = Router();
  r.patch('/me/profile', noStore, requireAuth, async (req, res) => {
    const body = parse(personalPatchBody, req.body);
    await applyPersonalPatch(db, req.auth.user.id, body);
    ok(res, await getMe(db, req.auth.user.id));
  });
  return r;
}
