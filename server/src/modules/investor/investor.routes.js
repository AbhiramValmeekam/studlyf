import { Router } from 'express';
import { z } from 'zod';
import { CONNECTION_STATUSES, FUNDING_STAGES, INVESTOR_TYPES, STARTUP_STAGES, STARTUP_TYPES } from '../../database/schema/index.js';
import { requireAuth } from '../../common/auth/middleware.js';
import { limiter, noStore } from '../../common/middleware/security.js';
import { created, ok, pageMeta } from '../../common/http/respond.js';
import { httpUrl, idParams, objectIdSchema, optionalText, paginationQuery, parse, queryBool, text } from '../../common/validation/index.js';
import { enumParam, searchText } from '../../common/validation/query.js';
import { recordAudit } from '../../common/utilities/admin-change.js';
import { requireEcosystem } from '../ecosystems/ecosystems.service.js';
import * as service from './investor.service.js';

const list = (max) => z.array(text(60)).max(max).transform((a) => [...new Set(a)]);

const requestBody = z
  .object({
    firmName: text(120),
    title: optionalText(120),
    investorType: z.enum(INVESTOR_TYPES),
    website: httpUrl.nullish(),
    linkedin: httpUrl.nullish(),
    stages: z.array(z.enum(FUNDING_STAGES)).max(FUNDING_STAGES.length).default([]),
    sectors: list(12).default([]),
    geographies: list(12).default([]),
    startupTypes: z.array(z.enum(STARTUP_TYPES)).max(STARTUP_TYPES.length).default([]),
    checkSize: optionalText(80),
    thesis: optionalText(3000),
  })
  .strict();

const discoverQuery = z.object({
  q: searchText,
  industry: z.string().trim().max(80).optional(),
  stage: enumParam(STARTUP_STAGES).optional(),
  fundingStage: enumParam(FUNDING_STAGES).optional(),
  startupType: enumParam(STARTUP_TYPES).optional(),
  saved: queryBool.optional(),
  location: z.string().trim().max(80).optional(),
  sort: z.enum(['updated', 'newest']).default('updated'),
  ...paginationQuery,
});
const connectionsQuery = z.object({ status: enumParam(CONNECTION_STATUSES).optional(), ...paginationQuery, pageSize: z.coerce.number().int().min(1).max(50).default(20) });
const connectBody = z.object({ founderProfileId: objectIdSchema, message: optionalText(1000) }).strict();

/**
 * /investor/* — controlled access. The access request is open to any signed-in account;
 * discovery and connections need an ACTIVE (admin-verified) investor profile, checked per request.
 */
export function investorRouter(deps) {
  const { db, config } = deps;
  const r = Router();
  const writes = limiter(config.rateLimit.enabled, { windowMs: 60_000, limit: 30 });
  r.use('/investor', noStore, requireAuth);

  r.get('/investor/access-request', async (req, res) => {
    ok(res, await service.getRequest(db, req.auth.user.id));
  });
  r.put('/investor/access-request', writes, async (req, res) => {
    const body = parse(requestBody, req.body);
    const { request, created: isNew } = await service.submitRequest(db, req.auth.user.id, body);
    await recordAudit(deps, req, { action: isNew ? 'investor_access.request' : 'investor_access.update', entityType: 'investor_profile', entityId: request.id, changes: { status: request.status } });
    (isNew ? created : ok)(res, request);
  });

  const investor = requireEcosystem(db, 'INVESTOR');
  r.get('/investor/dashboard', investor, async (req, res) => {
    ok(res, await service.dashboard(db, req.auth.user.id));
  });
  r.get('/investor/facets', investor, async (_req, res) => {
    ok(res, await service.facets(db));
  });
  r.get('/investor/founders', investor, async (req, res) => {
    const q = parse(discoverQuery, req.query);
    const { items, total } = await service.discover(db, req.auth.user.id, q);
    ok(res, items, pageMeta(q.page, q.pageSize, total));
  });
  r.get('/investor/founders/:id', investor, async (req, res) => {
    const { id } = parse(idParams, req.params);
    ok(res, await service.getFounder(db, req.auth.user.id, id));
  });
  r.get('/investor/intelligence', investor, async (req, res) => {
    ok(res, await service.intelligence(db, req.auth.user.id));
  });
  r.put('/investor/saved/:id', writes, investor, async (req, res) => {
    const { id } = parse(idParams, req.params);
    ok(res, await service.setSaved(db, req.auth.user.id, id, true));
  });
  r.delete('/investor/saved/:id', writes, investor, async (req, res) => {
    const { id } = parse(idParams, req.params);
    ok(res, await service.setSaved(db, req.auth.user.id, id, false));
  });
  r.get('/investor/connections', investor, async (req, res) => {
    const q = parse(connectionsQuery, req.query);
    const { items, total } = await service.listConnections(db, req.auth.user.id, q);
    ok(res, items, pageMeta(q.page, q.pageSize, total));
  });
  r.post('/investor/connections', writes, investor, async (req, res) => {
    const body = parse(connectBody, req.body);
    const founder = await service.requestConnection(db, req.auth.user.id, body);
    await recordAudit(deps, req, { action: 'investor_connection.request', entityType: 'founder_profile', entityId: body.founderProfileId });
    created(res, founder);
  });
  r.post('/investor/connections/:id/withdraw', writes, investor, async (req, res) => {
    const { id } = parse(idParams, req.params);
    ok(res, await service.withdraw(db, req.auth.user.id, id));
  });
  return r;
}
