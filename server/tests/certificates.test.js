import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext } from './helpers.js';
import { issueForAchievement } from '../src/modules/certificates/certificates.service.js';

// Verifiable certificates (spec §18/§68): a result mints a credential, the credential resolves
// publicly by its code, and revoking one is visible immediately.
let ctx;
let admin;

beforeAll(async () => {
  ctx = await createTestContext();
  admin = await ctx.loginAs('superAdmin');
});
afterAll(() => ctx.close());

const me = async (agent) => (await agent.get('/api/v1/me')).body.data;
/** The first program the seeded organization owns — used so certificates carry a real issuer. */
const firstOpportunity = async (organizer) => (await organizer.get('/api/v1/organization/opportunities')).body.data[0];

async function award(body) {
  const res = await admin.post('/api/v1/admin/achievements').send(body);
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body.data;
}

describe('certificates: a result mints a verifiable credential', () => {
  it('mints one for a WINNER achievement and lists it for the organization', async () => {
    const organizer = await ctx.loginAs('organizer');
    const opportunity = await firstOpportunity(organizer);
    const builder = await ctx.loginAs('builder');
    const builderId = (await me(builder)).id;

    const achievement = await award({ userId: builderId, type: 'WINNER', title: `Winner — ${opportunity.title}`, opportunityId: opportunity.id });

    const cert = await ctx.deps.db.Certificate.findOne({ achievementId: achievement.id }).lean();
    expect(cert, 'a WINNER achievement mints a certificate').toBeTruthy();
    expect(cert).toMatchObject({ type: 'WINNER', status: 'ACTIVE', recipientName: 'Sample Builder (dev)', issuerName: opportunity.organization.name });
    expect(cert.verificationCode).toMatch(/^[A-Z2-9]{12}$/);

    const listed = await organizer.get('/api/v1/organization/certificates?pageSize=100');
    expect(listed.status).toBe(200);
    const row = listed.body.data.find((c) => c.verificationCode === cert.verificationCode);
    expect(row).toMatchObject({ recipient: 'Sample Builder (dev)', verified: true, opportunity: opportunity.title });
  });

  it('does not mint for an achievement that is not a result', async () => {
    const organizer = await ctx.loginAs('organizer');
    const opportunity = await firstOpportunity(organizer);
    const builderId = (await me(await ctx.loginAs('builder'))).id;
    const achievement = await award({ userId: builderId, type: 'OTHER', title: 'Something else', opportunityId: opportunity.id });
    expect(await ctx.deps.db.Certificate.exists({ achievementId: achievement.id })).toBeFalsy();
  });

  it('is idempotent — the same achievement can never mint twice', async () => {
    const builderId = (await me(await ctx.loginAs('builder'))).id;
    const opportunity = await firstOpportunity(await ctx.loginAs('organizer'));
    const achievement = await award({ userId: builderId, type: 'FINALIST', title: 'Finalist', opportunityId: opportunity.id });
    const spec = { achievementId: achievement.id, userId: builderId, type: 'FINALIST', title: 'Finalist', date: new Date(), opportunityId: opportunity.id };

    const again = await issueForAchievement(ctx.deps.db, spec);
    expect(again).toBeNull();
    expect(await ctx.deps.db.Certificate.countDocuments({ achievementId: achievement.id })).toBe(1);
  });
});

describe('certificates: public verification', () => {
  it('resolves a code without a session, and tolerates how a human retypes it', async () => {
    const builderId = (await me(await ctx.loginAs('builder'))).id;
    const opportunity = await firstOpportunity(await ctx.loginAs('organizer'));
    const achievement = await award({ userId: builderId, type: 'WINNER', title: `Winner — ${opportunity.title}`, opportunityId: opportunity.id });
    const cert = await ctx.deps.db.Certificate.findOne({ achievementId: achievement.id }).lean();

    // A fresh agent with no cookies — exactly what a third party checking a certificate has.
    const anonymous = request(ctx.app);
    const res = await anonymous.get(`/api/v1/certificates/verify/${cert.verificationCode}`);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.data).toMatchObject({
      valid: true,
      status: 'ACTIVE',
      title: `Winner — ${opportunity.title}`,
      recipient: 'Sample Builder (dev)',
      opportunity: opportunity.title,
    });

    const messy = await anonymous.get(`/api/v1/certificates/verify/${cert.verificationCode.toLowerCase()}`);
    expect(messy.status).toBe(200);
    expect(messy.body.data.valid).toBe(true);
  });

  it('404s an unknown code and 400s a malformed one', async () => {
    const anonymous = request(ctx.app);
    expect((await anonymous.get('/api/v1/certificates/verify/ZZZZZZZZZZZZ')).status).toBe(404);
    expect((await anonymous.get(`/api/v1/certificates/verify/${'A'.repeat(80)}`)).status).toBe(400);
  });

  it('reports a revoked certificate as invalid rather than hiding it', async () => {
    const organizer = await ctx.loginAs('organizer');
    const opportunity = await firstOpportunity(organizer);
    const builderId = (await me(await ctx.loginAs('builder'))).id;
    const achievement = await award({ userId: builderId, type: 'SHORTLISTED', title: 'Shortlisted', opportunityId: opportunity.id });
    const cert = await ctx.deps.db.Certificate.findOne({ achievementId: achievement.id }).lean();

    const revoked = await organizer.post(`/api/v1/organization/certificates/${cert._id}/revoke`).send({ reason: 'Issued to the wrong team.' });
    expect(revoked.status, JSON.stringify(revoked.body)).toBe(200);
    expect(revoked.body.data).toMatchObject({ status: 'REVOKED', verified: false, revokedReason: 'Issued to the wrong team.' });
    expect((await organizer.post(`/api/v1/organization/certificates/${cert._id}/revoke`).send({})).status).toBe(409);

    const res = await request(ctx.app).get(`/api/v1/certificates/verify/${cert.verificationCode}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ valid: false, status: 'REVOKED', revokedReason: 'Issued to the wrong team.' });
  });
});

describe('certificates: authorization', () => {
  it('only the owning organization can list or revoke; listing needs a session', async () => {
    const organizer = await ctx.loginAs('organizer');
    const cert = (await organizer.get('/api/v1/organization/certificates?pageSize=100')).body.data[0];
    expect(cert).toBeTruthy();

    expect((await request(ctx.app).get('/api/v1/organization/certificates')).status).toBe(401);
    expect((await (await ctx.loginAs('builder')).get('/api/v1/organization/certificates')).status).toBe(403);
    expect((await (await ctx.loginAs('builder')).post(`/api/v1/organization/certificates/${cert.id}/revoke`).send({})).status).toBe(403);

    const other = await (await ctx.loginAs('founder')).post(`/api/v1/organization/certificates/${cert.id}/revoke`).send({});
    expect(other.status).toBe(403);
  });
});
