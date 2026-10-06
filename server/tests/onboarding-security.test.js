import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext, ORIGIN, uniqueEmail } from './helpers.js';

let ctx;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());

async function newUser() {
  const agent = request.agent(ctx.app);
  await agent.post('/api/v1/auth/register').send({ name: 'New', email: uniqueEmail(), password: 'goodpass123' }).expect(201);
  return agent;
}

describe('onboarding', () => {
  it('requires authentication', async () => {
    expect((await request(ctx.app).post('/api/v1/onboarding').send({ intent: 'BUILDER' })).status).toBe(401);
    expect((await request(ctx.app).get('/api/v1/me')).status).toBe(401);
  });

  it('offers every ecosystem path and stores the selection', async () => {
    const agent = await newUser();
    const initial = (await agent.get('/api/v1/onboarding')).body.data;
    expect(initial.options.map((o) => o.label)).toEqual([
      'I am a Builder',
      'I am a Founder',
      'I am an Investor',
      'I hire talent (HR)',
      'I run an organization',
      'I am exploring STUDLYF',
    ]);
    expect(initial.selection).toBeNull();

    const exploring = await agent.post('/api/v1/onboarding').send({ intent: 'exploring' });
    expect(exploring.status).toBe(200);
    expect(exploring.body.data).toMatchObject({ role: 'USER', onboarding: { intent: 'EXPLORING' } });

    const builder = await agent.post('/api/v1/onboarding').send({ intent: 'BUILDER' });
    expect(builder.body.data).toMatchObject({ role: 'BUILDER', onboarding: { intent: 'BUILDER' } });
    expect(builder.body.data.roles).toEqual(expect.arrayContaining(['USER', 'BUILDER']));
  });

  it('cannot be used to obtain privileged roles', async () => {
    const agent = await newUser();
    const admin = await agent.post('/api/v1/onboarding').send({ intent: 'ADMIN' });
    expect(admin.status).toBe(400);
    expect(admin.body.error.details[0].field).toBe('intent');
    // Controlled ecosystems can be chosen as a destination, but that never grants the role or access.
    for (const intent of ['HR', 'INVESTOR', 'ORGANIZER']) {
      const res = await agent.post('/api/v1/onboarding').send({ intent });
      expect(res.status).toBe(200);
      expect(res.body.data.roles).not.toContain(intent);
      expect(res.body.data.ecosystems[intent].status).toBe('NONE');
    }
    expect((await agent.get('/api/v1/hr/talent')).status).toBe(403);
    expect((await agent.get('/api/v1/investor/founders')).status).toBe(403);
    expect((await agent.get('/api/v1/organization/dashboard')).status).toBe(403);
    expect((await agent.post('/api/v1/onboarding').send({ intent: 'BUILDER', role: 'ADMIN' })).status).toBe(400);
    expect((await agent.get('/api/v1/admin/opportunities')).status).toBe(403);
  });

  it('PATCH /me updates only safe profile fields', async () => {
    const agent = await newUser();
    const ok = await agent.patch('/api/v1/me').send({ name: 'Renamed', phone: '+91 98765 43210' });
    expect(ok.body.data).toMatchObject({ name: 'Renamed', phone: '+91 98765 43210' });
    for (const body of [{ email: 'x@example.com' }, { status: 'ACTIVE' }, { role: 'ADMIN' }, { phone: 'abc' }]) {
      expect((await agent.patch('/api/v1/me').send(body)).status).toBe(400);
    }
  });
});

describe('private data is not reachable publicly', () => {
  it('has no public user, talent, investor or analytics endpoints', async () => {
    for (const p of ['/users', '/talent', '/investors', '/builders', '/startups', '/analytics', '/admin']) {
      const res = await request(ctx.app).get(`/api/v1${p}`);
      expect([401, 404], p).toContain(res.status);
      expect(res.body.success).toBe(false);
    }
  });
});

describe('security controls', () => {
  it('uses the standard error envelope for unknown routes and malformed JSON', async () => {
    const nf = await request(ctx.app).get('/api/v1/does-not-exist');
    expect(nf.status).toBe(404);
    expect(nf.body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } });

    const bad = await request(ctx.app).post('/api/v1/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('BAD_REQUEST');
  });

  it('blocks state-changing requests from foreign origins (CSRF)', async () => {
    const evil = await request(ctx.app)
      .post('/api/v1/auth/login')
      .set('Origin', 'https://evil.example')
      .send({ email: 'builder@studlyf.local', password: 'StudlyfBuilder#2026' });
    expect(evil.status).toBe(403);
    expect(evil.body.error.code).toBe('ORIGIN_NOT_ALLOWED');

    const good = await request(ctx.app)
      .post('/api/v1/auth/login')
      .set('Origin', ORIGIN)
      .send({ email: 'builder@studlyf.local', password: 'StudlyfBuilder#2026' });
    expect(good.status).toBe(200);
  });

  it('sends CORS headers only to allow-listed origins', async () => {
    const ok = await request(ctx.app).get('/api/v1/home').set('Origin', ORIGIN);
    expect(ok.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect(ok.headers['access-control-allow-credentials']).toBe('true');
    const no = await request(ctx.app).get('/api/v1/home').set('Origin', 'https://evil.example');
    expect(no.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('sets security headers and hides the framework', async () => {
    const res = await request(ctx.app).get('/api/v1/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-request-id']).toBeTruthy();
  });
});

describe('rate limiting', () => {
  let limited;
  beforeAll(async () => {
    limited = await createTestContext({ RATE_LIMIT_ENABLED: 'true' });
  });
  afterAll(() => limited.close());

  it('throttles repeated failed logins with a 429 envelope', async () => {
    const attempt = () => request(limited.app).post('/api/v1/auth/login').send({ email: 'builder@studlyf.local', password: 'wrongpass1' });
    for (let i = 0; i < 10; i++) expect((await attempt()).status).toBe(401);
    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
  });
});
