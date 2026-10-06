import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext, uniqueEmail } from './helpers.js';

let ctx;
let admin;
let editor;

beforeAll(async () => {
  ctx = await createTestContext();
  admin = await ctx.loginAs('superAdmin');
  editor = await ctx.loginAs('editor');
});
afterAll(() => ctx.close());

async function register(intent) {
  const agent = request.agent(ctx.app);
  const res = await agent.post('/api/v1/auth/register').send({ name: 'Eco Tester', email: uniqueEmail('eco'), password: 'goodpass123', ...(intent ? { intent } : {}) });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return { agent, user: res.body.data.user };
}
const me = async (agent) => (await agent.get('/api/v1/me')).body.data;
const statuses = (eco) => Object.fromEntries(Object.entries(eco).map(([k, v]) => [k, v.status]));

const investorRequest = { firmName: 'Test Capital', investorType: 'ANGEL', stages: ['SEED'], sectors: ['AgriTech'] };
const hrRequest = { companyName: 'Acme', designation: 'Recruiter', workEmail: 'recruiter@acme.example' };
const orgBody = { name: `Test Org ${Date.now()}`, type: 'COLLEGE', contactEmail: 'events@college.example' };

async function approve(ecosystem, id) {
  const res = await admin.post(`/api/v1/admin/access-requests/${ecosystem}/${id}/status`).send({ status: 'ACTIVE' });
  expect(res.status, JSON.stringify(res.body)).toBe(200);
  return res.body.data;
}

describe('ecosystem state resolver (/me)', () => {
  it('never assumes Builder: a plain account has no ecosystem', async () => {
    const { user } = await register();
    expect(statuses(user.ecosystems)).toEqual({ BUILDER: 'NONE', FOUNDER: 'NONE', INVESTOR: 'NONE', HR: 'NONE', ORGANIZER: 'NONE' });
    expect(user.ecosystems.INVESTOR.destination).toBe('/investors/access-request');
  });

  it('existing builders keep Builder access, pointed at /builders/dashboard', async () => {
    const builder = await ctx.loginAs('builder');
    const eco = (await me(builder)).ecosystems;
    expect(eco.BUILDER).toMatchObject({ status: 'ACTIVE', active: true, destination: '/builders/dashboard' });
    expect(eco.FOUNDER.status).toBe('NONE');
  });

  it('one account can hold several ecosystems (nova = builder + founder)', async () => {
    const agent = request.agent(ctx.app);
    await agent.post('/api/v1/auth/login').send({ email: 'nova@studlyf.local', password: 'StudlyfBuilder#2026' }).expect(200);
    const eco = (await me(agent)).ecosystems;
    expect(eco.BUILDER.status).toBe('ACTIVE');
    expect(eco.FOUNDER).toMatchObject({ status: 'ACTIVE', destination: '/founders/dashboard' });
  });

  it('seeded ecosystem accounts resolve to their own dashboards', async () => {
    for (const [who, eco, path] of [
      ['founder', 'FOUNDER', '/founders/dashboard'],
      ['investor', 'INVESTOR', '/investors/dashboard'],
      ['hr', 'HR', '/hr/dashboard'],
      ['organizer', 'ORGANIZER', '/organizations/dashboard'],
    ]) {
      const e = (await me(await ctx.loginAs(who))).ecosystems;
      expect(e[eco], who).toMatchObject({ status: 'ACTIVE', destination: path });
      expect(e.BUILDER.status, who).toBe('NONE');
    }
  });

  it('intent INVESTOR/HR/ORGANIZER at sign-up records the intent but grants nothing', async () => {
    for (const intent of ['INVESTOR', 'HR', 'ORGANIZER']) {
      const { user } = await register(intent);
      expect(user.onboarding.intent).toBe(intent);
      expect(user.roles).not.toContain(intent);
      expect(user.ecosystems[intent].status).toBe('NONE');
    }
  });
});

describe('server-side RBAC per ecosystem', () => {
  it('a builder cannot reach founder, investor, HR or organization APIs — including posting opportunities', async () => {
    const builder = await ctx.loginAs('builder');
    expect((await builder.get('/api/v1/founder/dashboard')).status).toBe(403);
    expect((await builder.get('/api/v1/investor/founders')).status).toBe(403);
    expect((await builder.get('/api/v1/hr/talent')).status).toBe(403);
    expect((await builder.get('/api/v1/organization/dashboard')).status).toBe(403);
    const post = await builder.post('/api/v1/organization/opportunities').send({ title: 'x', type: 'HACKATHON', shortDescription: 'x', mode: 'ONLINE' });
    expect(post.status).toBe(403);
    expect((await builder.post('/api/v1/admin/opportunities').send({})).status).toBe(403);
  });

  it('other ecosystems cannot use Builder APIs', async () => {
    const investor = await ctx.loginAs('investor');
    expect((await investor.get('/api/v1/builder/dashboard')).status).toBe(403);
    expect((await investor.get('/api/v1/organization/dashboard')).status).toBe(403);
    const hr = await ctx.loginAs('hr');
    expect((await hr.get('/api/v1/founder/dashboard')).status).toBe(403);
    expect((await hr.get('/api/v1/investor/dashboard')).status).toBe(403);
  });

  it('anonymous callers are rejected everywhere', async () => {
    for (const path of ['/me/ecosystems', '/founder/dashboard', '/investor/dashboard', '/hr/dashboard', '/organization/dashboard']) {
      expect((await request(ctx.app).get(`/api/v1${path}`)).status, path).toBe(401);
    }
  });
});

describe('founder onboarding', () => {
  it('creating the founder profile makes the same account a founder', async () => {
    const { agent, user } = await register('FOUNDER');
    expect(user.ecosystems.FOUNDER).toMatchObject({ status: 'ONBOARDING', destination: '/founders/onboarding' });
    expect((await agent.get('/api/v1/founder/dashboard')).status).toBe(403);

    const bad = await agent.post('/api/v1/founder/profile').send({ startup: { name: 'X' } });
    expect(bad.status).toBe(400);
    const res = await agent.post('/api/v1/founder/profile').send({ headline: 'Founder', startup: { name: 'GreenBox', oneLiner: 'Reusable packaging for cloud kitchens.', industry: 'Climate', stage: 'IDEA' } });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(res.body.data.readiness.areas.map((a) => a.label)).toEqual(['Problem', 'Market', 'Product', 'Team', 'Traction', 'Business Model', 'GTM', 'Pitch']);
    expect(res.body.data.readiness.score).toBe(0);
    expect((await agent.post('/api/v1/founder/profile').send({ startup: { name: 'A', oneLiner: 'B' } })).status).toBe(409);

    const after = await me(agent);
    expect(after.id).toBe(user.id); // same account, no duplicate user
    expect(after.ecosystems.FOUNDER.status).toBe('ACTIVE');
    expect(after.roles).toContain('FOUNDER');

    const patched = await agent.patch('/api/v1/founder/profile').send({ workspace: { problem: 'Cloud kitchens throw away 40 tonnes of single-use packaging every day in Bengaluru alone.' } });
    expect(patched.status).toBe(200);
    const problem = patched.body.data.readiness.areas.find((a) => a.key === 'problem');
    expect(problem.checks.find((c) => c.label === 'Problem statement written').done).toBe(true);
    expect(patched.body.data.readiness.score).toBeGreaterThan(0);
    expect((await agent.get('/api/v1/founder/dashboard')).status).toBe(200);
  });
});

describe('investor access: request → verification → discovery → connection', () => {
  it('runs the whole controlled flow', async () => {
    const { agent } = await register('INVESTOR');
    expect((await agent.get('/api/v1/investor/dashboard')).status).toBe(403);

    const req = await agent.put('/api/v1/investor/access-request').send(investorRequest);
    expect(req.status, JSON.stringify(req.body)).toBe(201);
    expect(req.body.data.status).toBe('PENDING');
    const pending = (await me(agent)).ecosystems.INVESTOR;
    expect(pending).toMatchObject({ status: 'PENDING', active: false, destination: '/investors/access-request/status' });
    const blocked = await agent.get('/api/v1/investor/dashboard');
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.message).toMatch(/being verified/);

    // An editor can read the queue but cannot decide; the super admin can.
    const queue = await editor.get('/api/v1/admin/access-requests?ecosystem=investor&status=pending');
    expect(queue.status).toBe(200);
    const item = queue.body.data.find((i) => i.details.firmName === 'Test Capital');
    expect(item).toBeTruthy();
    expect((await editor.post(`/api/v1/admin/access-requests/INVESTOR/${item.id}/status`).send({ status: 'ACTIVE' })).status).toBe(403);
    await approve('INVESTOR', item.id);

    const active = await me(agent);
    expect(active.ecosystems.INVESTOR.status).toBe('ACTIVE');
    expect(active.roles).toContain('INVESTOR');
    const notifs = (await agent.get('/api/v1/me/notifications')).body.data;
    expect(notifs.some((n) => n.type === 'ACCESS_STATUS')).toBe(true);

    const found = await agent.get('/api/v1/investor/founders?q=soil');
    expect(found.status).toBe(200);
    const soil = found.body.data.find((f) => f.startup.name === 'SoilSense');
    expect(soil).toBeTruthy();
    const detail = (await agent.get(`/api/v1/investor/founders/${soil.id}`)).body.data;
    expect(detail.workspace).toBeNull(); // strategy stays private until the founder accepts
    expect(detail.contactEmail).toBeNull();

    const connect = await agent.post('/api/v1/investor/connections').send({ founderProfileId: soil.id, message: 'Hello!' });
    expect(connect.status, JSON.stringify(connect.body)).toBe(201);
    expect((await agent.post('/api/v1/investor/connections').send({ founderProfileId: soil.id })).status).toBe(409);

    const founder = await ctx.loginAs('founder');
    const incoming = (await founder.get('/api/v1/founder/connections?status=pending')).body.data;
    const mine = incoming.find((c) => c.investor?.firmName === 'Test Capital');
    expect(mine).toBeTruthy();
    expect((await founder.patch(`/api/v1/founder/connections/${mine.id}`).send({ status: 'ACCEPTED' })).status).toBe(200);
    expect((await founder.patch(`/api/v1/founder/connections/${mine.id}`).send({ status: 'DECLINED' })).status).toBe(409);

    const connected = (await agent.get(`/api/v1/investor/founders/${soil.id}`)).body.data;
    expect(connected.workspace.problem).toMatch(/fertiliser/);
    expect(connected.contactEmail).toBe('founder@studlyf.local');
  });

  it('rejection needs a note, allows resubmission; suspension blocks access', async () => {
    const { agent } = await register();
    const { body } = await agent.put('/api/v1/investor/access-request').send({ ...investorRequest, firmName: 'Reject Me Ventures' });
    const id = body.data.id;
    expect((await admin.post(`/api/v1/admin/access-requests/INVESTOR/${id}/status`).send({ status: 'REJECTED' })).status).toBe(400);
    const rejected = await admin.post(`/api/v1/admin/access-requests/INVESTOR/${id}/status`).send({ status: 'REJECTED', note: 'Please add your firm website.' });
    expect(rejected.body.data.status).toBe('REJECTED');
    expect((await me(agent)).ecosystems.INVESTOR).toMatchObject({ status: 'REJECTED', statusNote: 'Please add your firm website.' });

    const again = await agent.put('/api/v1/investor/access-request').send({ ...investorRequest, firmName: 'Reject Me Ventures', website: 'https://example.com/rmv' });
    expect(again.body.data.status).toBe('PENDING');
    await approve('INVESTOR', id);
    expect((await agent.get('/api/v1/investor/dashboard')).status).toBe(200);

    await admin.post(`/api/v1/admin/access-requests/INVESTOR/${id}/status`).send({ status: 'SUSPENDED', note: 'Reported spam.' }).expect(200);
    const suspended = await agent.get('/api/v1/investor/dashboard');
    expect(suspended.status).toBe(403);
    expect(suspended.body.error.message).toMatch(/suspended/);
    expect((await me(agent)).roles).not.toContain('INVESTOR');
    expect((await agent.put('/api/v1/investor/access-request').send(investorRequest)).status).toBe(403);
  });
});

describe('HR verification and private hiring pipeline', () => {
  it('only verified HR sees talent, and only public builder profiles', async () => {
    const { agent } = await register('HR');
    const { body } = await agent.put('/api/v1/hr/access-request').send(hrRequest);
    expect(body.data.status).toBe('PENDING');
    expect((await agent.get('/api/v1/hr/talent')).status).toBe(403);
    await approve('HR', body.data.id);

    const talent = await agent.get('/api/v1/hr/talent?pageSize=50');
    expect(talent.status).toBe(200);
    const usernames = talent.body.data.map((t) => t.username);
    expect(usernames).toContain('sample-builder');
    expect(usernames).not.toContain('zephyr'); // PRIVATE profile
    expect(JSON.stringify(talent.body)).not.toMatch(/"email"|phone/);

    const added = await agent.post('/api/v1/hr/candidates').send({ username: 'sample-builder', role: 'Intern' });
    expect(added.status).toBe(201);
    expect((await agent.post('/api/v1/hr/candidates').send({ username: 'sample-builder' })).status).toBe(409);
    expect((await agent.post('/api/v1/hr/candidates').send({ username: 'zephyr' })).status).toBe(404);
    const moved = await agent.patch(`/api/v1/hr/candidates/${added.body.data.id}`).send({ stage: 'INTERVIEW', interviewAt: new Date(Date.now() + 86_400_000).toISOString() });
    expect(moved.body.data.stage).toBe('INTERVIEW');
    expect((await agent.get('/api/v1/hr/candidates?stage=INTERVIEW')).body.data).toHaveLength(1);

    // Pipelines are private to each HR user.
    const otherHr = await ctx.loginAs('hr');
    expect((await otherHr.patch(`/api/v1/hr/candidates/${added.body.data.id}`).send({ stage: 'HIRED' })).status).toBe(404);
    expect((await agent.delete(`/api/v1/hr/candidates/${added.body.data.id}`)).status).toBe(200);
  });
});

describe('organizations: onboarding, verification and org-owned opportunities', () => {
  it('a verified organization posts, publishes and manages its own opportunities', async () => {
    const { agent } = await register('ORGANIZER');
    const created = await agent.post('/api/v1/organizations').send(orgBody);
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    expect(created.body.data).toMatchObject({ status: 'PENDING', membership: { role: 'OWNER' } });
    expect((await agent.post('/api/v1/organizations').send(orgBody)).status).toBe(409);
    expect((await me(agent)).ecosystems.ORGANIZER).toMatchObject({ status: 'PENDING', destination: '/organizations/onboarding' });
    expect((await agent.get('/api/v1/organization/dashboard')).status).toBe(403);
    expect((await agent.post('/api/v1/organization/opportunities').send({})).status).toBe(403);

    await approve('ORGANIZER', created.body.data.id);
    expect((await me(agent)).roles).toContain('ORGANIZER');

    const opp = await agent.post('/api/v1/organization/opportunities').send({
      title: 'Campus Robotics Hackathon',
      type: 'HACKATHON',
      shortDescription: 'Build autonomous robots in 36 hours.',
      mode: 'OFFLINE',
      location: 'Chennai',
      applicationDeadline: new Date(Date.now() + 10 * 86_400_000).toISOString(),
    });
    expect(opp.status, JSON.stringify(opp.body)).toBe(201);
    expect(opp.body.data).toMatchObject({ status: 'DRAFT', organization: { name: orgBody.name } });
    // Curation fields are STUDLYF-only.
    expect((await agent.post('/api/v1/organization/opportunities').send({ title: 'x', type: 'HACKATHON', shortDescription: 'x', mode: 'ONLINE', featured: true })).status).toBe(400);

    expect((await request(ctx.app).get(`/api/v1/opportunities/${opp.body.data.slug}`)).status).toBe(404);
    await agent.post(`/api/v1/organization/opportunities/${opp.body.data.id}/publish`).expect(200);
    expect((await request(ctx.app).get(`/api/v1/opportunities/${opp.body.data.slug}`)).status).toBe(200);
    const listed = (await agent.get('/api/v1/organization/opportunities?type=hackathon')).body.data;
    expect(listed.map((o) => o.id)).toContain(opp.body.data.id);

    // Another organization can't see or touch it.
    const organizer = await ctx.loginAs('organizer');
    expect((await organizer.get(`/api/v1/organization/opportunities/${opp.body.data.id}`)).status).toBe(404);
    expect((await organizer.patch(`/api/v1/organization/opportunities/${opp.body.data.id}`).send({ title: 'Hijack' })).status).toBe(404);
  });

  it('organizers see and review participants of their own opportunities only', async () => {
    const organizer = await ctx.loginAs('organizer');
    const dash = await organizer.get('/api/v1/organization/dashboard');
    expect(dash.status).toBe(200);
    expect(dash.body.data.counts.published).toBeGreaterThanOrEqual(2);

    const participants = (await organizer.get('/api/v1/organization/participants')).body.data;
    const sampleApp = participants.find((p) => p.builder.name === 'Sample Builder (dev)');
    expect(sampleApp).toBeTruthy();
    expect(sampleApp.opportunity.slug).toBe('design-sprint-challenge-campus-commute');

    // An application to an opportunity the organization does not own is not reviewable.
    const foreign = await ctx.deps.db.Application.findOne({ opportunityId: { $nin: (await ctx.deps.db.Opportunity.find({ organizationId: { $ne: null } }).lean()).map((o) => o._id) } }).lean();
    expect((await organizer.post(`/api/v1/organization/participants/${foreign._id}/status`).send({ status: 'SHORTLISTED' })).status).toBe(404);

    for (const path of ['submissions', 'evaluations', 'rankings', 'certificates']) {
      expect((await organizer.get(`/api/v1/organization/${path}`)).status, path).toBe(200);
    }
  });
});

describe('builder usernames and onboarding options', () => {
  it('reserves builder product route names', async () => {
    const { agent } = await register('BUILDER');
    const res = await agent.post('/api/v1/builder/profile').send({ username: 'dashboard' });
    expect(res.status).toBe(400);
  });

  it('offers every ecosystem as an onboarding path', async () => {
    const { agent } = await register();
    const options = (await agent.get('/api/v1/onboarding')).body.data.options.map((o) => o.intent);
    expect(options).toEqual(expect.arrayContaining(['BUILDER', 'FOUNDER', 'INVESTOR', 'HR', 'ORGANIZER']));
  });
});
