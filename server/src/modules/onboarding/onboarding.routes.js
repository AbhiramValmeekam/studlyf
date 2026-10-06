import { Router } from 'express';
import { z } from 'zod';
import { ONBOARDING_INTENTS } from '../../database/schema/index.js';
import { requireAuth } from '../../common/auth/middleware.js';
import { noStore } from '../../common/middleware/security.js';
import { ok } from '../../common/http/respond.js';
import { parse } from '../../common/validation/index.js';
import { enumParam } from '../../common/validation/query.js';
import * as onboarding from './onboarding.service.js';

// "What are you here for?" → I am a Builder / I am a Founder / I am exploring STUDLYF
const body = z.object({ intent: enumParam(ONBOARDING_INTENTS) }).strict();

export function onboardingRouter({ db }) {
  const r = Router();
  r.use('/onboarding', noStore, requireAuth);

  r.get('/onboarding', async (req, res) => {
    ok(res, { options: onboarding.OPTIONS, selection: await onboarding.get(db, req.auth.user.id) });
  });

  r.post('/onboarding', async (req, res) => {
    const { intent } = parse(body, req.body);
    ok(res, await onboarding.save(db, req.auth.user.id, intent));
  });

  return r;
}
