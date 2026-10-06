import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext } from './helpers.js';

// Public startup pages (spec §68/§82): a founder who publishes a page is reachable without an
// account, one who has not is invisible, and the payload is allow-listed rather than "send
// everything and hope the client hides it".
let ctx;
const SLUG = 'soilsense';

beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());

const anon = () => request(ctx.app);

describe('public founder page', () => {
  it('serves a PUBLIC startup without a session', async () => {
    const res = await anon().get(`/api/v1/founders/${SLUG}`);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const page = res.body.data;
    expect(page).toMatchObject({ slug: SLUG, founder: { name: expect.any(String) }, startup: { name: 'SoilSense', industry: 'AgriTech', stage: 'EARLY_TRACTION' } });
    expect(page.updates.length).toBeGreaterThan(0);
  });

  it('never leaks the private half of the profile', async () => {
    const page = (await anon().get(`/api/v1/founders/${SLUG}`)).body.data;
    // Traction, the strategy workspace and the founder's email all stay on the owner's side.
    expect(page.startup.traction).toBeUndefined();
    expect(page.startup.teamDescription).toBeUndefined();
    expect(page.workspace).toBeUndefined();
    expect(page.founder.email).toBeUndefined();
    expect(page.readiness).toBeUndefined();
  });

  it('hides a startup the founder has not published, and reveals it the moment they do', async () => {
    const founder = await ctx.loginAs('founder');
    const me = (await founder.get('/api/v1/founder/profile')).body.data;
    expect(me.slug).toBe(SLUG);
    expect(me.visibility).toBe('PUBLIC');

    await founder.patch('/api/v1/founder/profile').send({ visibility: 'PRIVATE' }).expect(200);
    expect((await anon().get(`/api/v1/founders/${SLUG}`)).status).toBe(404);

    await founder.patch('/api/v1/founder/profile').send({ visibility: 'PUBLIC' }).expect(200);
    expect((await anon().get(`/api/v1/founders/${SLUG}`)).status).toBe(200);
  });

  it('404s an unknown handle and 400s a malformed one', async () => {
    expect((await anon().get('/api/v1/founders/nobody-here')).status).toBe(404);
    expect((await anon().get(`/api/v1/founders/${'x'.repeat(200)}`)).status).toBe(400);
  });
});

describe('founder handles', () => {
  it('mints a handle on onboarding and keeps it stable across saves', async () => {
    const investor = await ctx.loginAs('investor'); // an account with no founder profile yet
    const created = await investor.post('/api/v1/founder/profile').send({
      headline: 'Building test infrastructure',
      startup: { name: 'Ledger Loom', oneLiner: 'Reconciled books for small manufacturers.' },
    });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    expect(created.body.data).toMatchObject({ slug: 'ledger-loom', visibility: 'INVESTOR_VISIBLE' });

    // Renaming the startup must not move the page.
    const renamed = await investor.patch('/api/v1/founder/profile').send({ startup: { name: 'Ledger Loom Systems' } });
    expect(renamed.body.data.slug).toBe('ledger-loom');

    // The default audience is not public until the founder says so.
    expect((await anon().get('/api/v1/founders/ledger-loom')).status).toBe(404);
  });

  it('rejects a handle another founder already holds, and reserves the product page names', async () => {
    const investor = await ctx.loginAs('investor');
    expect((await investor.patch('/api/v1/founder/profile').send({ slug: SLUG })).status).toBe(409);
    expect((await investor.patch('/api/v1/founder/profile').send({ slug: 'dashboard' })).status).toBe(400);
    expect((await investor.patch('/api/v1/founder/profile').send({ slug: 'a' })).status).toBe(400);
  });

  it('reads a cleared handle or visibility as “leave it alone”', async () => {
    // The editor posts every field it renders, so a cleared control arrives as null.
    const founder = await ctx.loginAs('founder');
    const res = await founder.patch('/api/v1/founder/profile').send({ slug: null, visibility: null });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.data).toMatchObject({ slug: SLUG, visibility: 'PUBLIC' });
  });
});
