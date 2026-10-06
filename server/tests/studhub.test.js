import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext } from './helpers.js';

let ctx;
let editor;
let builder;

beforeAll(async () => {
  ctx = await createTestContext();
  [editor, builder] = await Promise.all([ctx.loginAs('editor'), ctx.loginAs('builder')]);
});
afterAll(() => ctx.close());

const pub = (path) => request(ctx.app).get(`/api/v1${path}`);
const HIDDEN = /DRAFT|must never appear|should never appear/i;

describe('public STUDHub', () => {
  it('lists only published benefits with pagination meta and light cards', async () => {
    const res = await pub('/studhub?pageSize=50');
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(5); // 2 scholarships + 2 perks + 1 discount published; draft hidden
    expect(JSON.stringify(res.body)).not.toMatch(HIDDEN);
    const item = res.body.data[0];
    expect(item).toMatchObject({
      id: expect.any(String),
      slug: expect.any(String),
      type: expect.any(String),
      summary: expect.any(String),
      tags: expect.any(Array),
    });
    expect(item.description).toBeUndefined(); // list view is lightweight
    expect(item.claimUrl).toBeUndefined();
  });

  it('is cacheable by browsers/CDNs', async () => {
    const res = await pub('/studhub');
    expect(res.headers['cache-control']).toMatch(/public, max-age=\d+/);
    expect(res.headers.etag).toBeDefined();
  });

  it('filters by type, tag and featured', async () => {
    const scholarships = (await pub('/studhub?type=scholarship&pageSize=50')).body;
    expect(scholarships.meta.total).toBe(2);
    expect(scholarships.data.every((b) => b.type === 'SCHOLARSHIP')).toBe(true);
    expect(scholarships.data.every((b) => b.deadline)).toBe(true);

    const perks = (await pub('/studhub?type=perk&pageSize=50')).body;
    expect(perks.data.every((b) => b.type === 'PERK')).toBe(true);

    const featured = (await pub('/studhub?featured=true&pageSize=50')).body.data;
    expect(featured.every((b) => b.featured)).toBe(true);
    expect(featured.length).toBeGreaterThan(0);
  });

  it('rejects invalid filter values with field errors', async () => {
    const res = await pub('/studhub?type=freebie&pageSize=500');
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['type', 'pageSize']));
  });

  it('returns full details by slug including description + claimUrl', async () => {
    const res = await pub('/studhub/studlyf-merit-scholarship');
    expect(res.status).toBe(200);
    const b = res.body.data;
    expect(b).toMatchObject({
      title: 'STUDLYF Merit Scholarship',
      type: 'SCHOLARSHIP',
      provider: 'STUDLYF Foundation',
      description: expect.stringContaining('<p>'),
      claimUrl: expect.stringContaining('http'),
    });
  });

  it('404s for draft slugs', async () => {
    const res = await pub('/studhub/internal-draft-cloud-credits-bundle');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: { code: 'NOT_FOUND', message: 'Benefit not found' } });
  });
});

describe('STUDHub via admin', () => {
  it('rejects non-admin callers', async () => {
    expect((await request(ctx.app).get('/api/v1/admin/studhub')).status).toBe(401);
    expect((await builder.get('/api/v1/admin/studhub')).status).toBe(403);
  });

  it('create (draft) → invisible → publish → visible → unpublish → delete', async () => {
    const created = await editor.post('/api/v1/admin/studhub').send({
      title: 'GitHub Student Developer Pack',
      type: 'PERK',
      provider: 'GitHub',
      summary: 'A bundle of free developer tools for verified students.',
      description: '<p onclick="steal()">Free tools</p><script>alert(1)</script>',
      offer: 'Free bundle',
      eligibility: 'Verified students.',
      claimUrl: 'https://example.com/github-pack',
      tags: ['DevTools', 'GitHub'],
      featured: true,
    });
    expect(created.status).toBe(201);
    const benefit = created.body.data;
    expect(benefit).toMatchObject({ slug: 'github-student-developer-pack', status: 'DRAFT', publishedAt: null });
    expect(benefit.description).toBe('<p>Free tools</p>'); // rich text sanitised on write
    expect(benefit.tags.map((t) => t.slug).sort()).toEqual(['devtools', 'github']);

    expect((await pub('/studhub/github-student-developer-pack')).status).toBe(404);

    const published = await editor.post(`/api/v1/admin/studhub/${benefit.id}/publish`);
    expect(published.body.data.status).toBe('PUBLISHED');
    expect((await pub('/studhub/github-student-developer-pack')).status).toBe(200);

    await editor.post(`/api/v1/admin/studhub/${benefit.id}/unpublish`).expect(200);
    expect((await pub('/studhub/github-student-developer-pack')).status).toBe(404);

    await editor.delete(`/api/v1/admin/studhub/${benefit.id}`).expect(200);
    expect((await editor.get(`/api/v1/admin/studhub/${benefit.id}`)).status).toBe(404);
  });

  it('requires a deadline for SCHOLARSHIP benefits', async () => {
    const res = await editor.post('/api/v1/admin/studhub').send({
      title: 'Scholarship Without Deadline',
      type: 'SCHOLARSHIP',
      summary: 'Should fail validation.',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.field)).toContain('deadline');
  });

  it('validates admin input and rejects unknown fields', async () => {
    const res = await editor.post('/api/v1/admin/studhub').send({
      title: '',
      type: 'FREEBIE',
      summary: 'x',
      claimUrl: 'javascript:alert(1)',
      bogus: true,
    });
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['title', 'type', 'claimUrl']));
  });

  it('admin list includes drafts and supports filters', async () => {
    const drafts = (await editor.get('/api/v1/admin/studhub?status=draft')).body;
    expect(drafts.data.map((b) => b.title)).toContain('Internal Draft: Cloud Credits Bundle');
    const discounts = (await editor.get('/api/v1/admin/studhub?type=discount')).body.data;
    expect(discounts.every((b) => b.type === 'DISCOUNT')).toBe(true);
  });

  it('refuses taken slugs on update', async () => {
    const list = (await editor.get('/api/v1/admin/studhub?type=perk&pageSize=50')).body.data;
    const target = list.find((b) => b.slug !== 'notion-pro-free-for-students');
    const taken = await editor.patch(`/api/v1/admin/studhub/${target.id}`).send({ slug: 'notion-pro-free-for-students' });
    expect(taken.status).toBe(409);
    expect(taken.body.error.code).toBe('SLUG_TAKEN');
  });
});
