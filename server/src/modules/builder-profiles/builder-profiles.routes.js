import { Router } from 'express';
import { requireAuth, requireBuilder } from '../../common/auth/middleware.js';
import { noStore } from '../../common/middleware/security.js';
import { created, ok } from '../../common/http/respond.js';
import { parse } from '../../common/validation/index.js';
import * as service from './builder-profiles.service.js';
import { createBody, setSkillsBody, updateBody, usernameParams } from './builder-profiles.schemas.js';

/** Authenticated builder-owned profile routes (mounted beside meRouter/onboardingRouter). */
export function builderProfileRouter(deps) {
  const { db } = deps;
  const r = Router();
  r.use('/builder/profile', noStore, requireAuth, requireBuilder(db));

  r.get('/builder/profile', async (req, res) => {
    ok(res, await service.getOwn(db, req.auth.user.id));
  });

  r.post('/builder/profile', async (req, res) => {
    const body = parse(createBody, req.body);
    created(res, await service.create(db, req.auth.user.id, body));
  });

  r.patch('/builder/profile', async (req, res) => {
    const body = parse(updateBody, req.body);
    ok(res, await service.update(db, req.auth.user.id, body));
  });

  r.put('/builder/profile/skills', async (req, res) => {
    const { skills } = parse(setSkillsBody, req.body);
    ok(res, await service.setSkills(db, req.auth.user.id, skills));
  });

  r.get('/builder/profile/completion', async (req, res) => {
    ok(res, await service.getCompletion(db, req.auth.user.id));
  });

  return r;
}

/** Public builder profile by username — only when visibility is PUBLIC. Never per-user cached. */
export function builderProfilePublicRouter({ db }) {
  const r = Router();
  r.get('/builders/:username', noStore, async (req, res) => {
    const { username } = parse(usernameParams, req.params);
    ok(res, await service.getPublicByUsername(db, username));
  });
  return r;
}
