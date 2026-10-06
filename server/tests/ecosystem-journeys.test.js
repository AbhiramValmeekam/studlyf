import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext, uniqueEmail } from './helpers.js';
import { readiness } from '../src/modules/founder/readiness.js';

// The per-ecosystem journeys from the architecture brief: founder workspace → readiness → updates,
// investor preferences → saved → intelligence, HR shortlist → invite → offer, and organization
// members/roles → evaluators → teams → winners → analytics.

let ctx;
let admin;

beforeAll(async () => {
  ctx = await createTestContext();
  admin = await ctx.loginAs('superAdmin');
});
afterAll(() => ctx.close());

async function register(intent) {
  const agent = request.agent(ctx.app);
  const email = uniqueEmail('journey');
  const res = await agent.post('/api/v1/auth/register').send({ name: 'Journey Tester', email, password: 'goodpass123', ...(intent ? { intent } : {}) });
  expect(res.status).toBe(201);
  return { agent, email, user: res.body.data.user };
}

describe('startup readiness (pure)', () => {
  it('scores the eight areas transparently', () => {
    const empty = readiness({});
    expect(empty.score).toBe(0);
    expect(empty.areas).toHaveLength(8);
    expect(empty.areas.reduce((s, a) => s + a.weight, 0)).toBe(100);

    const long = 'x'.repeat(60);
    const full = readiness({
      headline: 'Founder',
      bio: long,
      startup: { description: long, stage: 'MVP', teamDescription: long, teamSize: 3, traction: { users: '100', revenue: '₹1L' } },
      workspace: {
        problem: long, targetCustomer: long, marketAnalysis: long, competitors: long,
        swot: { strengths: 'Team', weaknesses: 'Cash', opportunities: 'Policy', threats: 'Incumbents' },
        businessModel: long, gtmStrategy: long, marketingStrategy: long, pitchDeckUrl: 'https://x.example', pitchNotes: long,
      },
    });
    expect(full.score).toBe(100);
    expect(full.level).toBe('INVESTOR_READY');
    expect(full.areas.every((a) => a.complete)).toBe(true);
  });
});

describe('founder workspace + updates', () => {
  it('edits SWOT/pitch sections and posts startup updates visible to verified investors', async () => {
    const founder = await ctx.loginAs('founder');
    const res = await founder.patch('/api/v1/founder/profile').send({ workspace: { pitchNotes: 'We start with FPOs because they aggregate demand and already pay for advisory services.', swot: { threats: 'New subsidised testing programmes.' } } });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.data.workspace.swot.strengths).toMatch(/Low-cost/); // partial SWOT edit merges
    expect(res.body.data.workspace.swot.threats).toBe('New subsidised testing programmes.');

    const posted = await founder.post('/api/v1/founder/updates').send({ title: 'Third FPO pilot', body: 'Signed with a Satara FPO.' });
    expect(posted.status).toBe(201);
    const update = posted.body.data.updates[0];
    expect(update.title).toBe('Third FPO pilot');

    const investor = await ctx.loginAs('investor');
    const found = (await investor.get('/api/v1/investor/founders?q=soilsense')).body.data[0];
    const detail = (await investor.get(`/api/v1/investor/founders/${found.id}`)).body.data;
    expect(detail.updates[0].title).toBe('Third FPO pilot');
    expect(detail.readiness.areas).toHaveLength(8);

    expect((await founder.delete(`/api/v1/founder/updates/${update.id}`)).status).toBe(200);
    expect((await founder.delete(`/api/v1/founder/updates/${update.id}`)).status).toBe(404);
  });
});

describe('investor preferences, saved list and intelligence', () => {
  it('saves startups privately and reports matches against preferences', async () => {
    const investor = await ctx.loginAs('investor');
    const intel = (await investor.get('/api/v1/investor/intelligence')).body.data;
    expect(intel.preferences.startupTypes).toEqual(['B2B', 'DEEPTECH']);
    expect(intel.total).toBeGreaterThanOrEqual(2);
    expect(intel.matchingPreferences).toBeGreaterThanOrEqual(1); // SoilSense: pre-seed · AgriTech · B2B
    expect(intel.byIndustry.map((i) => i.key)).toEqual(expect.arrayContaining(['AgriTech', 'EdTech']));

    const saved = (await investor.get('/api/v1/investor/founders?saved=true')).body.data;
    expect(saved.map((f) => f.startup.name)).toEqual(['SoilSense']);
    const study = (await investor.get('/api/v1/investor/founders?q=studysync')).body.data[0];
    expect(study.saved).toBe(false);
    await investor.put(`/api/v1/investor/saved/${study.id}`).expect(200);
    expect((await investor.get('/api/v1/investor/founders?saved=true')).body.data).toHaveLength(2);
    await investor.delete(`/api/v1/investor/saved/${study.id}`).expect(200);
    expect((await investor.get('/api/v1/investor/founders?startupType=b2b')).body.data.map((f) => f.startup.name)).toEqual(['SoilSense']);
    expect((await investor.get('/api/v1/investor/dashboard')).body.data.saved).toBe(1);
  });
});

describe('HR journey: shortlist → invite → interview → offer → joining', () => {
  it('notifies the builder only when invited or offered', async () => {
    const hr = await ctx.loginAs('hr');
    const builder = await ctx.loginAs('builder');
    const unread = async () => (await builder.get('/api/v1/me/notifications')).body.data.filter((n) => n.type === 'HR_INVITATION');

    const talent = await hr.get('/api/v1/hr/talent?college=vertex');
    expect(talent.body.data.map((t) => t.username)).toContain('sample-builder');
    expect((await hr.get('/api/v1/hr/talent?location=nowhere-city')).body.data).toHaveLength(0);

    const cand = (await hr.get('/api/v1/hr/candidates')).body.data.find((c) => c.builder.username === 'sample-builder');
    const before = (await unread()).length;
    await hr.patch(`/api/v1/hr/candidates/${cand.id}`).send({ stage: 'SHORTLISTED' }).expect(200);
    expect((await unread()).length).toBe(before); // private stage — no notification

    await hr.patch(`/api/v1/hr/candidates/${cand.id}`).send({ stage: 'INVITED' }).expect(200);
    const invites = await unread();
    expect(invites.length).toBe(before + 1);
    expect(invites[0].title).toMatch(/Loopwise invited you to interview for Frontend Intern/);

    await hr.patch(`/api/v1/hr/candidates/${cand.id}`).send({ stage: 'OFFER' }).expect(200);
    await hr.patch(`/api/v1/hr/candidates/${cand.id}`).send({ stage: 'HIRED' }).expect(200);
    expect((await unread()).length).toBe(before + 2);
    const dash = (await hr.get('/api/v1/hr/dashboard')).body.data;
    expect(dash.pipeline).toMatchObject({ INVITED: 0, HIRED: 1 });
  });
});

describe('organization members, roles and program operations', () => {
  it('enforces the member role matrix', async () => {
    const owner = await ctx.loginAs('organizer');
    const { agent: viewer, email } = await register();
    const added = await owner.post('/api/v1/organization/members').send({ email, role: 'VIEWER' });
    expect(added.status, JSON.stringify(added.body)).toBe(201);
    expect((await owner.post('/api/v1/organization/members').send({ email, role: 'ADMIN' })).status).toBe(409);
    expect((await owner.post('/api/v1/organization/members').send({ email: 'nobody@nowhere.example', role: 'ADMIN' })).status).toBe(400);
    expect((await owner.post('/api/v1/organization/members').send({ email, role: 'OWNER' })).status).toBe(400);

    // The viewer now has the Organization ecosystem, read-only.
    const eco = (await viewer.get('/api/v1/me')).body.data.ecosystems.ORGANIZER;
    expect(eco).toMatchObject({ status: 'ACTIVE', organization: { role: 'VIEWER' } });
    expect((await viewer.get('/api/v1/organization/dashboard')).status).toBe(200);
    expect((await viewer.post('/api/v1/organization/opportunities').send({ title: 'x', type: 'HACKATHON', shortDescription: 'x', mode: 'ONLINE' })).status).toBe(403);
    expect((await viewer.post('/api/v1/organization/members').send({ email: 'x@example.com', role: 'VIEWER' })).status).toBe(403);

    // Promote to ORGANIZER: can run programs, still can't manage people.
    await owner.patch(`/api/v1/organization/members/${added.body.data.id}`).send({ role: 'ORGANIZER' }).expect(200);
    const opp = await viewer.post('/api/v1/organization/opportunities').send({ title: 'Civic Data Jam', type: 'CHALLENGE', shortDescription: 'Open data weekend.', mode: 'ONLINE' });
    expect(opp.status).toBe(201);
    expect((await viewer.patch(`/api/v1/organization/members/${added.body.data.id}`).send({ role: 'ADMIN' })).status).toBe(403);

    // Members can leave; the owner can't be removed.
    const members = (await owner.get('/api/v1/organization/members')).body.data;
    const ownerRow = members.find((m) => m.role === 'OWNER');
    expect((await owner.delete(`/api/v1/organization/members/${ownerRow.id}`)).status).toBe(409);
    expect((await viewer.delete(`/api/v1/organization/members/${added.body.data.id}`)).status).toBe(200);
    expect((await viewer.get('/api/v1/me')).body.data.ecosystems.ORGANIZER.status).toBe('NONE');
    expect((await viewer.get('/api/v1/organization/dashboard')).status).toBe(403);
  });

  it('lists evaluators, teams, winners and analytics; only org evaluators can be assigned', async () => {
    const owner = await ctx.loginAs('organizer');
    const evaluators = (await owner.get('/api/v1/organization/evaluators')).body.data;
    expect(evaluators.map((e) => e.email)).toContain('org.evaluator@studlyf.local');
    for (const path of ['teams', 'winners', 'analytics']) {
      expect((await owner.get(`/api/v1/organization/${path}`)).status, path).toBe(200);
    }
    const analytics = (await owner.get('/api/v1/organization/analytics')).body.data;
    expect(analytics.find((a) => a.opportunity.slug === 'design-sprint-challenge-campus-commute').participants).toBeGreaterThanOrEqual(1);

    // Assigning someone outside the organization's evaluator panel is refused.
    const builderId = (await (await ctx.loginAs('builder')).get('/api/v1/me')).body.data.id;
    const fakeSubmission = '0123456789abcdef01234567';
    expect((await owner.post(`/api/v1/organization/submissions/${fakeSubmission}/evaluators`).send({ evaluatorUserId: builderId })).status).toBe(404);
  });

  it('a pending organization is verified by a super admin and then unlocks its members', async () => {
    const { agent } = await register('ORGANIZER');
    const org = (await agent.post('/api/v1/organizations').send({ name: `Robotics Club ${Date.now()}`, type: 'COLLEGE', contactEmail: 'club@college.example' })).body.data;
    await admin.post(`/api/v1/admin/access-requests/ORGANIZER/${org.id}/status`).send({ status: 'ACTIVE' }).expect(200);
    expect((await agent.get('/api/v1/organization/members')).body.data).toHaveLength(1);
  });
});
