import { Router } from 'express';
import { z } from 'zod';
import { BUILDER_AVAILABILITIES, HIRING_STAGES } from '../../database/schema/index.js';
import { requireAuth } from '../../common/auth/middleware.js';
import { limiter, noStore } from '../../common/middleware/security.js';
import { created, ok, pageMeta } from '../../common/http/respond.js';
import { emailSchema } from '../auth/auth.schemas.js';
import { httpUrl, idParams, isoDate, objectIdSchema, optionalText, paginationQuery, parse, text } from '../../common/validation/index.js';
import { enumParam, searchText } from '../../common/validation/query.js';
import { recordAudit } from '../../common/utilities/admin-change.js';
import { requireEcosystem } from '../ecosystems/ecosystems.service.js';
import * as service from './hr.service.js';

const requestBody = z
  .object({
    companyName: text(120),
    designation: text(120),
    workEmail: emailSchema,
    companyWebsite: httpUrl.nullish(),
    linkedin: httpUrl.nullish(),
    companySize: optionalText(40),
    hiringFor: optionalText(500),
  })
  .strict();

const talentQuery = z.object({
  q: searchText,
  skill: z.string().trim().toLowerCase().max(60).optional(),
  availability: enumParam(BUILDER_AVAILABILITIES).optional(),
  college: z.string().trim().max(120).optional(),
  location: z.string().trim().max(80).optional(),
  ...paginationQuery,
});
const candidatesQuery = z.object({
  stage: z
    .string()
    .trim()
    .toUpperCase()
    .transform((v) => v.split(',').filter(Boolean))
    .pipe(z.array(z.enum(HIRING_STAGES)).max(HIRING_STAGES.length))
    .optional(),
  ...paginationQuery,
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
// `jobId` ties the shortlist to one of the caller's own job posts; omitted for a talent-pool add.
const addBody = z
  .object({
    username: z.string().trim().toLowerCase().min(1).max(40),
    role: optionalText(120),
    note: optionalText(2000),
    jobId: objectIdSchema.nullish(),
  })
  .strict();
const updateBody = z
  .object({ stage: z.enum(HIRING_STAGES), role: optionalText(120), note: optionalText(2000), interviewAt: isoDate.nullish() })
  .partial()
  .strict();

/** /hr/* — controlled access: verification is open to any account; talent + pipeline need ACTIVE HR access. */
export function hrRouter(deps) {
  const { db, config } = deps;
  const r = Router();
  const writes = limiter(config.rateLimit.enabled, { windowMs: 60_000, limit: 60 });
  r.use('/hr', noStore, requireAuth);

  r.get('/hr/access-request', async (req, res) => {
    ok(res, await service.getRequest(db, req.auth.user.id));
  });
  r.put('/hr/access-request', writes, async (req, res) => {
    const body = parse(requestBody, req.body);
    const { request, created: isNew } = await service.submitRequest(db, req.auth.user.id, body);
    await recordAudit(deps, req, { action: isNew ? 'hr_access.request' : 'hr_access.update', entityType: 'hr_profile', entityId: request.id, changes: { status: request.status } });
    (isNew ? created : ok)(res, request);
  });

  const hr = requireEcosystem(db, 'HR');
  r.get('/hr/dashboard', hr, async (req, res) => {
    ok(res, await service.dashboard(db, req.auth.user.id));
  });
  r.get('/hr/talent', hr, async (req, res) => {
    const q = parse(talentQuery, req.query);
    const { items, total } = await service.searchTalent(db, req.auth.user.id, q);
    ok(res, items, pageMeta(q.page, q.pageSize, total));
  });
  r.get('/hr/candidates', hr, async (req, res) => {
    const q = parse(candidatesQuery, req.query);
    const stage = q.stage?.length ? (q.stage.length === 1 ? q.stage[0] : q.stage) : undefined;
    const { items, total } = await service.listCandidates(db, req.auth.user.id, { ...q, stage });
    ok(res, items, pageMeta(q.page, q.pageSize, total));
  });
  r.post('/hr/candidates', writes, hr, async (req, res) => {
    const body = parse(addBody, req.body);
    const item = await service.addCandidate(db, req.auth.user.id, body);
    await recordAudit(deps, req, { action: 'hr_candidate.add', entityType: 'hr_candidate', entityId: item.id });
    created(res, item);
  });
  r.patch('/hr/candidates/:id', writes, hr, async (req, res) => {
    const { id } = parse(idParams, req.params);
    const body = parse(updateBody, req.body);
    const item = await service.updateCandidate(db, req.auth.user.id, id, body);
    await recordAudit(deps, req, { action: 'hr_candidate.update', entityType: 'hr_candidate', entityId: id, changes: { fields: Object.keys(body), stage: body.stage } });
    ok(res, item);
  });
  r.delete('/hr/candidates/:id', writes, hr, async (req, res) => {
    const { id } = parse(idParams, req.params);
    ok(res, await service.removeCandidate(db, req.auth.user.id, id));
  });
  return r;
}
