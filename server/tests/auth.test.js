import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext, tokenFromMail, uniqueEmail } from './helpers.js';

let ctx;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());

const register = (agent, body) =>
  agent.post('/api/v1/auth/register').send(body);

describe('registration', () => {
  it('creates an account, sets an HttpOnly session cookie and never returns the password hash', async () => {
    const agent = request.agent(ctx.app);
    const email = uniqueEmail();
    const res = await register(agent, { name: 'Asha', email: email.toUpperCase(), password: 'goodpass123' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toMatchObject({ name: 'Asha', email, role: 'USER', emailVerified: false, status: 'ACTIVE' });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|password_hash|scrypt/);
    expect(res.body.data.session.token).toBeUndefined(); // cookie-only for browsers

    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/studlyf_session=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);

    const me = await agent.get('/api/v1/me');
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(email);
    expect(me.headers['cache-control']).toBe('no-store');
  });

  it('rejects a duplicate email (case-insensitive)', async () => {
    const email = uniqueEmail();
    await register(request(ctx.app), { name: 'A', email, password: 'goodpass123' });
    const res = await register(request(ctx.app), { name: 'B', email: email.toUpperCase(), password: 'goodpass123' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('returns field-level validation errors', async () => {
    const res = await register(request(ctx.app), { name: '', email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } });
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });

  it('refuses client-supplied privileged fields (role escalation)', async () => {
    const res = await register(request(ctx.app), { name: 'X', email: uniqueEmail(), password: 'goodpass123', role: 'ADMIN' });
    expect(res.status).toBe(400);
    // Choosing HR at sign-up only records where the person was heading: no HR role, no HR access.
    const agent = request.agent(ctx.app);
    const hr = await register(agent, { name: 'X', email: uniqueEmail(), password: 'goodpass123', intent: 'HR' });
    expect(hr.status).toBe(201);
    expect(hr.body.data.user.roles).not.toContain('HR');
    expect(hr.body.data.user.ecosystems.HR.status).toBe('NONE');
    expect((await agent.get('/api/v1/hr/talent')).status).toBe(403);
    const bogus = await register(request(ctx.app), { name: 'X', email: uniqueEmail(), password: 'goodpass123', intent: 'ADMIN' });
    expect(bogus.status).toBe(400);
    expect(bogus.body.error.details[0].field).toBe('intent');
  });

  it('stores the onboarding intent when chosen at sign-up', async () => {
    const res = await register(request(ctx.app), { name: 'F', email: uniqueEmail(), password: 'goodpass123', intent: 'FOUNDER' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('FOUNDER');
    expect(res.body.data.user.roles).toEqual(expect.arrayContaining(['USER', 'FOUNDER']));
    expect(res.body.data.user.onboarding.intent).toBe('FOUNDER');
  });
});

describe('login / logout', () => {
  it('logs in with valid credentials and updates last_login_at', async () => {
    const agent = await ctx.loginAs('builder');
    const me = await agent.get('/api/v1/me');
    expect(me.body.data.lastLoginAt).toBeTruthy();
    expect(me.body.data.admin).toBeNull();
  });

  it('uses one generic error for unknown email and wrong password', async () => {
    const unknown = await request(ctx.app).post('/api/v1/auth/login').send({ email: uniqueEmail(), password: 'whatever1' });
    const wrong = await request(ctx.app).post('/api/v1/auth/login').send({ email: 'builder@studlyf.local', password: 'wrongpass1' });
    for (const res of [unknown, wrong]) {
      expect(res.status).toBe(401);
      expect(res.body.error).toEqual({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }
  });

  it('logout revokes the session server-side', async () => {
    const agent = await ctx.loginAs('builder');
    expect((await agent.post('/api/v1/auth/logout')).status).toBe(200);
    expect((await agent.get('/api/v1/me')).status).toBe(401);
  });

  it('supports Bearer tokens for non-browser clients', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/auth/login')
      .set('X-Auth-Transport', 'bearer')
      .send({ email: 'builder@studlyf.local', password: 'StudlyfBuilder#2026' });
    const token = res.body.data.session.token;
    expect(token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    const me = await request(ctx.app).get('/api/v1/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect((await request(ctx.app).get('/api/v1/me').set('Authorization', 'Bearer nope')).status).toBe(401);
  });
});

describe('email verification', () => {
  it('verifies with the emailed single-use token', async () => {
    const agent = request.agent(ctx.app);
    const email = uniqueEmail();
    await register(agent, { name: 'V', email, password: 'goodpass123' });
    const token = tokenFromMail(ctx.mailer, email);

    const ok = await request(ctx.app).post('/api/v1/auth/verify-email').send({ token });
    expect(ok.status).toBe(200);
    expect((await agent.get('/api/v1/me')).body.data.emailVerified).toBe(true);

    const reuse = await request(ctx.app).post('/api/v1/auth/verify-email').send({ token });
    expect(reuse.status).toBe(400);
    expect(reuse.body.error.code).toBe('INVALID_TOKEN');
  });

  it('resending voids the previous token', async () => {
    const email = uniqueEmail();
    await register(request(ctx.app), { name: 'R', email, password: 'goodpass123' });
    const first = tokenFromMail(ctx.mailer, email);
    await request(ctx.app).post('/api/v1/auth/resend-verification').send({ email }).expect(200);
    const second = tokenFromMail(ctx.mailer, email);
    expect(second).not.toBe(first);
    expect((await request(ctx.app).post('/api/v1/auth/verify-email').send({ token: first })).status).toBe(400);
    expect((await request(ctx.app).post('/api/v1/auth/verify-email').send({ token: second })).status).toBe(200);
  });
});

describe('password reset', () => {
  it('does not reveal whether an email exists', async () => {
    const before = ctx.mailer.outbox.length;
    const res = await request(ctx.app).post('/api/v1/auth/forgot-password').send({ email: uniqueEmail('ghost') });
    expect(res.status).toBe(200);
    expect(ctx.mailer.outbox.length).toBe(before);
  });

  it('resets the password, revokes existing sessions, and the token is single-use', async () => {
    const email = uniqueEmail();
    const oldAgent = request.agent(ctx.app);
    await register(oldAgent, { name: 'P', email, password: 'oldpass123' });

    await request(ctx.app).post('/api/v1/auth/forgot-password').send({ email }).expect(200);
    const token = tokenFromMail(ctx.mailer, email);

    const weak = await request(ctx.app).post('/api/v1/auth/reset-password').send({ token, password: 'nodigits' });
    expect(weak.status).toBe(400);

    await request(ctx.app).post('/api/v1/auth/reset-password').send({ token, password: 'newpass456' }).expect(200);
    expect((await oldAgent.get('/api/v1/me')).status).toBe(401);
    expect((await request(ctx.app).post('/api/v1/auth/login').send({ email, password: 'oldpass123' })).status).toBe(401);
    expect((await request(ctx.app).post('/api/v1/auth/login').send({ email, password: 'newpass456' })).status).toBe(200);
    expect((await request(ctx.app).post('/api/v1/auth/reset-password').send({ token, password: 'another789' })).status).toBe(400);
  });
});

describe('account status', () => {
  it('suspended users cannot log in and lose existing sessions', async () => {
    const email = uniqueEmail();
    const userAgent = request.agent(ctx.app);
    const reg = await register(userAgent, { name: 'S', email, password: 'goodpass123' });
    const admin = await ctx.loginAs('superAdmin');
    await admin.patch(`/api/v1/admin/users/${reg.body.data.user.id}`).send({ status: 'SUSPENDED' }).expect(200);

    expect((await userAgent.get('/api/v1/me')).status).toBe(401);
    const login = await request(ctx.app).post('/api/v1/auth/login').send({ email, password: 'goodpass123' });
    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe('ACCOUNT_DISABLED');
  });
});
