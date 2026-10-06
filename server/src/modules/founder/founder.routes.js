import { Router } from 'express';
import { requireAuth } from '../../common/auth/middleware.js';
import { limiter, noStore } from '../../common/middleware/security.js';
import { created, ok, pageMeta } from '../../common/http/respond.js';
import { idParams, parse, slugParams } from '../../common/validation/index.js';
import { recordAudit } from '../../common/utilities/admin-change.js';
import { requireEcosystem } from '../ecosystems/ecosystems.service.js';
import * as schemas from './founder.schemas.js';
import * as service from './founder.service.js';

/**
 * The public startup page (spec §68/§82) — no session, and only a founder who chose PUBLIC
 * resolves. `noStore` because a founder flipping back to PRIVATE must stop being reachable at
 * once; nothing about a visibility change is safe to serve from a cache.
 */
export function founderPublicRouter({ db }) {
  const r = Router();
  r.get('/founders/:slug', noStore, async (req, res) => {
    const { slug } = parse(slugParams, req.params);
    ok(res, await service.getPublicBySlug(db, slug));
  });
  return r;
}

/**
 * /founder/* — the Founder ecosystem. The profile itself is reachable by any signed-in account
 * (creating it IS founder onboarding); everything else needs completed founder access.
 */
export function founderRouter(deps) {
  const { db, config } = deps;
  const r = Router();
  const writes = limiter(config.rateLimit.enabled, { windowMs: 60_000, limit: 60 });
  r.use('/founder', noStore, requireAuth);

  r.get('/founder/profile', async (req, res) => {
    ok(res, await service.getOwn(db, req.auth.user.id));
  });
  r.post('/founder/profile', writes, async (req, res) => {
    const body = parse(schemas.createBody, req.body);
    const profile = await service.create(db, req.auth.user.id, body);
    await recordAudit(deps, req, { action: 'founder.onboard', entityType: 'founder_profile', entityId: profile.id });
    created(res, profile);
  });

  const founder = requireEcosystem(db, 'FOUNDER');
  r.patch('/founder/profile', writes, founder, async (req, res) => {
    const body = parse(schemas.updateBody, req.body);
    ok(res, await service.update(db, req.auth.user.id, body));
  });
  r.get('/founder/dashboard', founder, async (req, res) => {
    ok(res, await service.dashboard(db, req.auth.user.id));
  });
  r.post('/founder/updates', writes, founder, async (req, res) => {
    const body = parse(schemas.updateCreateBody, req.body);
    created(res, await service.addUpdate(db, req.auth.user.id, body));
  });
  r.delete('/founder/updates/:id', writes, founder, async (req, res) => {
    const { id } = parse(idParams, req.params);
    ok(res, await service.removeUpdate(db, req.auth.user.id, id));
  });
  r.get('/founder/connections', founder, async (req, res) => {
    const q = parse(schemas.connectionsQuery, req.query);
    const { items, total } = await service.listConnections(db, req.auth.user.id, q);
    ok(res, items, pageMeta(q.page, q.pageSize, total));
  });
  r.patch('/founder/connections/:id', writes, founder, async (req, res) => {
    const { id } = parse(idParams, req.params);
    const { status } = parse(schemas.respondBody, req.body);
    const item = await service.respond(db, req.auth.user.id, id, status);
    await recordAudit(deps, req, { action: 'investor_connection.respond', entityType: 'investor_connection', entityId: id, changes: { status } });
    ok(res, item);
  });
  return r;
}
