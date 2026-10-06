import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext } from './helpers.js';

// The public organization profile (spec §82): a verified organization is browsable by anyone,
// an unverified one does not exist as far as the public is concerned, and opening the create
// route to the public router did not accidentally un-gate anything that writes.
let ctx;
const SLUG = 'campus-builders-collective';

beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());

const anon = () => request(ctx.app);

describe('public organization profile', () => {
  it('serves a verified organization without a session', async () => {
    const res = await anon().get(`/api/v1/organizations/${SLUG}`);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const org = res.body.data;
    expect(org).toMatchObject({ name: 'Campus Builders Collective', slug: SLUG, type: 'COMMUNITY', city: 'Bengaluru' });
    expect(org.programCount).toBeGreaterThan(0);
    expect(org.programs.length).toBe(org.programCount);
    // The public shape carries the same fields as the public opportunities listing, and nothing more.
    for (const p of org.programs) {
      expect(p).toMatchObject({ id: expect.any(String), title: expect.any(String), slug: expect.any(String) });
      expect(p.status).toBeUndefined();
      expect(p.createdBy).toBeUndefined();
    }
  });

  it('withholds the organization’s contact email and membership', async () => {
    const org = (await anon().get(`/api/v1/organizations/${SLUG}`)).body.data;
    expect(org.contactEmail).toBeUndefined();
    expect(org.members).toBeUndefined();
  });

  it('hides an organization that is not ACTIVE, and reveals it the moment it is verified', async () => {
    const organizer = await ctx.loginAs('organizer');
    const organizerId = (await organizer.get('/api/v1/me')).body.data.id;
    await ctx.deps.db.Organization.create({
      name: 'Pending Collective',
      slug: 'pending-collective',
      type: 'COMMUNITY',
      contactEmail: 'pending@example.com',
      createdBy: organizerId,
      status: 'PENDING',
    });

    expect((await anon().get('/api/v1/organizations/pending-collective')).status).toBe(404);
    await ctx.deps.db.Organization.updateOne({ slug: 'pending-collective' }, { $set: { status: 'ACTIVE', reviewedAt: new Date() } });
    const res = await anon().get('/api/v1/organizations/pending-collective');
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.data).toMatchObject({ name: 'Pending Collective', programCount: 0, programs: [] });
  });

  it('404s a slug that never existed and 400s a malformed one', async () => {
    expect((await anon().get('/api/v1/organizations/no-such-organization')).status).toBe(404);
    expect((await anon().get(`/api/v1/organizations/${'x'.repeat(200)}`)).status).toBe(400);
  });
});

describe('public organization profile: the guarded routes stay guarded', () => {
  it('still requires a session to create an organization', async () => {
    const res = await anon().post('/api/v1/organizations').send({ name: 'Anyone', type: 'COMMUNITY', contactEmail: 'anyone@example.com' });
    expect(res.status).toBe(401);
  });

  it('still requires a session for the caller’s own organization', async () => {
    expect((await anon().get('/api/v1/organization')).status).toBe(401);
    expect((await anon().get('/api/v1/organization/dashboard')).status).toBe(401);
  });

  it('still lets a signed-in account create one', async () => {
    const founder = await ctx.loginAs('founder');
    const res = await founder.post('/api/v1/organizations').send({ name: 'Founder Collective', type: 'COMMUNITY', contactEmail: 'founder.collective@example.com' });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(res.body.data).toMatchObject({ name: 'Founder Collective', status: 'PENDING', slug: 'founder-collective' });
  });
});
