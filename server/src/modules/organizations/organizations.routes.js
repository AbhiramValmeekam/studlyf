import { Router } from 'express';
import { z } from 'zod';
import { APPLICATION_STATUSES, EVALUATION_STATUSES, OPPORTUNITY_TYPES, ORGANIZATION_MEMBER_ROLES, ORGANIZATION_TYPES, SUBMISSION_STATUSES } from '../../database/schema/index.js';
import { requireAuth } from '../../common/auth/middleware.js';
import { limiter, noStore } from '../../common/middleware/security.js';
import { created, ok, pageMeta } from '../../common/http/respond.js';
import { emailSchema } from '../auth/auth.schemas.js';
import { httpUrl, idParams, objectIdSchema, optionalText, paginationQuery, parse, slugParams, text } from '../../common/validation/index.js';
import { enumParam } from '../../common/validation/query.js';
import { recordAdminChange, recordAudit } from '../../common/utilities/admin-change.js';
import { orgCreateBody, orgUpdateBody } from '../opportunities/opportunities.schemas.js';
import { requireEcosystem } from '../ecosystems/ecosystems.service.js';
import * as certificates from '../certificates/certificates.service.js';
import * as service from './organizations.service.js';

const orgFields = {
  name: text(120),
  type: z.enum(ORGANIZATION_TYPES),
  website: httpUrl.nullish(),
  description: optionalText(3000),
  city: optionalText(120),
  contactEmail: emailSchema,
};
const createBody = z.object(orgFields).strict();
const updateBody = z.object(orgFields).partial().strict();
const memberBody = z.object({ email: emailSchema, role: z.enum(ORGANIZATION_MEMBER_ROLES) }).strict();
const memberRoleBody = z.object({ role: z.enum(ORGANIZATION_MEMBER_ROLES) }).strict();
const assignBody = z.object({ evaluatorUserId: objectIdSchema, templateId: objectIdSchema.optional() }).strict();

const listQuery = (statuses) =>
  z.object({
    opportunityId: objectIdSchema.optional(),
    status: enumParam(statuses).optional(),
    ...paginationQuery,
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
  });
const oppListQuery = z.object({ type: enumParam(OPPORTUNITY_TYPES).optional(), ...paginationQuery, pageSize: z.coerce.number().int().min(1).max(100).default(25) });
const certificateListQuery = z.object({ ...paginationQuery, pageSize: z.coerce.number().int().min(1).max(100).default(50) });
const revokeBody = z.object({ reason: optionalText(500) }).strict();
const reviewBody = z
  .object({ status: z.enum(APPLICATION_STATUSES.filter((s) => ['UNDER_REVIEW', 'SHORTLISTED', 'SELECTED', 'REJECTED'].includes(s))), reviewerNote: optionalText(2000) })
  .strict();

/**
 * Public organization profile (spec §82) — what a participant, partner or journalist sees when
 * they open a verified organization. Cacheable, so it is mounted inside the public-content group
 * in `app.js`; it never reads the session and never leaks a non-ACTIVE organization.
 */
export function organizationsPublicRouter({ db }) {
  const r = Router();
  r.get('/organizations/:slug', async (req, res) => {
    const { slug } = parse(slugParams, req.params);
    ok(res, await service.publicProfile(db, slug));
  });
  return r;
}

/**
 * /organizations (create) and /organization/* (the caller's organization). Creating an
 * organization is open to any signed-in account; everything operational needs the organization
 * to be ACTIVE (verified by STUDLYF) — checked in the database on every request. Builders, founders
 * and everyone else get 403 on these routes: only verified organizations post opportunities.
 *
 * NB: the plural `/organizations` is NOT blanket-guarded here — `GET /organizations/:slug` belongs
 * to the public router above. Only the create route needs a session, so it carries its own guard.
 */
export function organizationsRouter(deps) {
  const { db, config } = deps;
  const r = Router();
  const writes = limiter(config.rateLimit.enabled, { windowMs: 60_000, limit: 60 });
  r.use('/organization', noStore, requireAuth);

  r.post('/organizations', noStore, requireAuth, writes, async (req, res) => {
    const body = parse(createBody, req.body);
    const org = await service.create(db, req.auth.user.id, body);
    await recordAudit(deps, req, { action: 'organization.create', entityType: 'organization', entityId: org.id });
    created(res, org);
  });
  r.get('/organization', async (req, res) => {
    ok(res, await service.getMine(db, req.auth.user.id));
  });
  r.patch('/organization', writes, async (req, res) => {
    const body = parse(updateBody, req.body);
    const org = await service.update(db, req.auth.user.id, body);
    await recordAudit(deps, req, { action: 'organization.update', entityType: 'organization', entityId: org.id, changes: { fields: Object.keys(body), status: org.status } });
    ok(res, org);
  });

  const organizer = requireEcosystem(db, 'ORGANIZER');
  const org = (req) => req.ecosystem.organization;
  // Role inside the organization (OWNER/ADMIN/ORGANIZER/EVALUATOR/VIEWER), checked per request.
  const can = (permission) => (req, _res, next) => {
    try {
      service.assertOrgRole(req.ecosystem.membership, permission);
      next();
    } catch (err) {
      next(err);
    }
  };
  const programs = [organizer, can('managePrograms')];
  const people = [organizer, can('manageMembers')];

  r.get('/organization/dashboard', organizer, async (req, res) => {
    ok(res, await service.dashboard(db, org(req)));
  });

  r.get('/organization/opportunities', organizer, async (req, res) => {
    const q = parse(oppListQuery, req.query);
    const { items, total } = await service.listOpportunities(db, org(req), q);
    ok(res, items, pageMeta(q.page, q.pageSize, total));
  });
  r.post('/organization/opportunities', writes, ...programs, async (req, res) => {
    const body = parse(orgCreateBody, req.body);
    const item = await service.createOpportunity(db, org(req), req.auth.user.id, body);
    await recordAdminChange(deps, req, { action: 'opportunity.create', entityType: 'opportunity', entityId: item.id, changes: { organizationId: String(org(req)._id) } });
    created(res, item);
  });
  r.get('/organization/opportunities/:id', organizer, async (req, res) => {
    const { id } = parse(idParams, req.params);
    ok(res, await service.getOpportunity(db, org(req), id));
  });
  r.patch('/organization/opportunities/:id', writes, ...programs, async (req, res) => {
    const { id } = parse(idParams, req.params);
    const body = parse(orgUpdateBody, req.body);
    const item = await service.updateOpportunity(db, org(req), req.auth.user.id, id, body);
    await recordAdminChange(deps, req, { action: 'opportunity.update', entityType: 'opportunity', entityId: id, changes: { fields: Object.keys(body) } });
    ok(res, item);
  });
  for (const [path, published] of [['publish', true], ['unpublish', false]]) {
    r.post(`/organization/opportunities/:id/${path}`, writes, ...programs, async (req, res) => {
      const { id } = parse(idParams, req.params);
      const item = await service.setPublished(db, org(req), req.auth.user.id, id, published);
      await recordAdminChange(deps, req, { action: `opportunity.${path}`, entityType: 'opportunity', entityId: id });
      ok(res, item);
    });
  }

  r.get('/organization/participants', organizer, async (req, res) => {
    const q = parse(listQuery(APPLICATION_STATUSES), req.query);
    const { items, total } = await service.listParticipants(db, org(req), q);
    ok(res, items, pageMeta(q.page, q.pageSize, total));
  });
  r.post('/organization/participants/:id/status', writes, ...programs, async (req, res) => {
    const { id } = parse(idParams, req.params);
    const body = parse(reviewBody, req.body);
    const item = await service.reviewParticipant(db, org(req), req.auth.user.id, id, body);
    await recordAudit(deps, req, { action: 'application.review', entityType: 'application', entityId: id, changes: { status: body.status } });
    ok(res, item);
  });
  r.get('/organization/submissions', organizer, async (req, res) => {
    const q = parse(listQuery(SUBMISSION_STATUSES), req.query);
    const { items, total } = await service.listSubmissions(db, org(req), q);
    ok(res, items, pageMeta(q.page, q.pageSize, total));
  });
  r.get('/organization/evaluations', organizer, async (req, res) => {
    const q = parse(listQuery(EVALUATION_STATUSES), req.query);
    const { items, total } = await service.listEvaluations(db, org(req), q);
    ok(res, items, pageMeta(q.page, q.pageSize, total));
  });
  r.get('/organization/rankings', organizer, async (req, res) => {
    const q = parse(z.object({ opportunityId: objectIdSchema.optional() }), req.query);
    ok(res, await service.rankings(db, org(req), q));
  });
  r.get('/organization/certificates', organizer, async (req, res) => {
    const q = parse(certificateListQuery, req.query);
    const { items, total } = await certificates.listForOrg(db, org(req), q);
    ok(res, items, pageMeta(q.page, q.pageSize, total));
  });
  r.post('/organization/certificates/:id/revoke', writes, ...programs, async (req, res) => {
    const { id } = parse(idParams, req.params);
    const body = parse(revokeBody, req.body ?? {});
    const item = await certificates.revokeForOrg(db, org(req), id, body.reason);
    await recordAdminChange(deps, req, { action: 'certificate.revoke', entityType: 'certificate', entityId: id, changes: { reason: body.reason ?? null } });
    ok(res, item);
  });
  r.get('/organization/members', organizer, async (req, res) => {
    ok(res, await service.listMembers(db, org(req)));
  });
  r.post('/organization/members', writes, ...people, async (req, res) => {
    const body = parse(memberBody, req.body);
    const item = await service.addMember(db, org(req), req.auth.user.id, body);
    await recordAudit(deps, req, { action: 'organization.member_add', entityType: 'organization', entityId: String(org(req)._id), changes: { role: body.role } });
    created(res, item);
  });
  r.patch('/organization/members/:id', writes, ...people, async (req, res) => {
    const { id } = parse(idParams, req.params);
    const body = parse(memberRoleBody, req.body);
    const item = await service.updateMember(db, org(req), req.auth.user.id, id, body);
    await recordAudit(deps, req, { action: 'organization.member_role', entityType: 'organization', entityId: String(org(req)._id), changes: { memberId: id, role: body.role } });
    ok(res, item);
  });
  r.delete('/organization/members/:id', writes, organizer, async (req, res) => {
    const { id } = parse(idParams, req.params);
    const item = await service.removeMember(db, org(req), req.ecosystem.membership, req.auth.user.id, id);
    await recordAudit(deps, req, { action: 'organization.member_remove', entityType: 'organization', entityId: String(org(req)._id), changes: { memberId: id } });
    ok(res, item);
  });
  r.get('/organization/teams', organizer, async (req, res) => {
    const q = parse(listQuery(SUBMISSION_STATUSES), req.query);
    const { items, total } = await service.listTeams(db, org(req), q);
    ok(res, items, pageMeta(q.page, q.pageSize, total));
  });
  r.get('/organization/winners', organizer, async (req, res) => {
    ok(res, await service.winners(db, org(req)));
  });
  r.get('/organization/evaluators', organizer, async (req, res) => {
    ok(res, await service.listEvaluators(db, org(req)));
  });
  r.post('/organization/submissions/:id/evaluators', writes, ...programs, async (req, res) => {
    const { id } = parse(idParams, req.params);
    const body = parse(assignBody, req.body);
    const item = await service.assignEvaluator(deps, org(req), req.auth.user.id, id, body);
    await recordAudit(deps, req, { action: 'evaluation.assign', entityType: 'submission', entityId: id, changes: { evaluatorUserId: body.evaluatorUserId } });
    created(res, item);
  });
  r.get('/organization/analytics', organizer, async (req, res) => {
    ok(res, await service.analytics(db, org(req)));
  });
  return r;
}
