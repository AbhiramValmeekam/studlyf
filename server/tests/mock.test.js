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

describe('public mock drills', () => {
  it('lists only published drills with pagination meta and light cards', async () => {
    const res = await pub('/mock-drills?pageSize=50');
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(4); // 2 tests + 2 interviews published; draft hidden
    expect(JSON.stringify(res.body)).not.toMatch(HIDDEN);
    const item = res.body.data[0];
    expect(item).toMatchObject({
      id: expect.any(String),
      slug: expect.any(String),
      kind: expect.any(String),
      level: expect.any(String),
      summary: expect.any(String),
      skills: expect.any(Array),
    });
    expect(item.description).toBeUndefined(); // list view is lightweight
    expect(item.startUrl).toBeUndefined();
  });

  it('is cacheable by browsers/CDNs', async () => {
    const res = await pub('/mock-drills');
    expect(res.headers['cache-control']).toMatch(/public, max-age=\d+/);
    expect(res.headers.etag).toBeDefined();
  });

  it('filters by kind, level, skill and featured', async () => {
    const tests = (await pub('/mock-drills?kind=test&pageSize=50')).body;
    expect(tests.meta.total).toBe(2);
    expect(tests.data.every((d) => d.kind === 'TEST')).toBe(true);

    const interviews = (await pub('/mock-drills?kind=interview&pageSize=50')).body;
    expect(interviews.data.every((d) => d.kind === 'INTERVIEW')).toBe(true);

    const beginner = (await pub('/mock-drills?level=beginner&pageSize=50')).body.data;
    expect(beginner.every((d) => d.level === 'BEGINNER')).toBe(true);
    expect(beginner.length).toBeGreaterThan(0);

    const react = (await pub('/mock-drills?skill=react&pageSize=50')).body.data;
    expect(react.every((d) => d.skills.some((s) => s.slug === 'react'))).toBe(true);
    expect(react.length).toBeGreaterThan(0);

    const featured = (await pub('/mock-drills?featured=true&pageSize=50')).body.data;
    expect(featured.every((d) => d.featured)).toBe(true);
    expect(featured.length).toBeGreaterThan(0);
  });

  it('rejects invalid filter values with field errors', async () => {
    const res = await pub('/mock-drills?kind=puzzle&level=godlike&pageSize=500');
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['kind', 'level', 'pageSize']));
  });

  it('returns full details by slug including description + startUrl', async () => {
    const res = await pub('/mock-drills/javascript-fundamentals-assessment');
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d).toMatchObject({
      title: 'JavaScript Fundamentals Assessment',
      kind: 'TEST',
      level: 'BEGINNER',
      questionCount: 30,
      description: expect.stringContaining('<p>'),
      startUrl: expect.stringContaining('http'),
    });
  });

  it('404s for draft slugs', async () => {
    const res = await pub('/mock-drills/internal-draft-frontend-take-home-review');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: { code: 'NOT_FOUND', message: 'Drill not found' } });
  });
});

describe('mock drills via admin', () => {
  it('rejects non-admin callers', async () => {
    expect((await request(ctx.app).get('/api/v1/admin/mock-drills')).status).toBe(401);
    expect((await builder.get('/api/v1/admin/mock-drills')).status).toBe(403);
  });

  it('create (draft) → invisible → publish → visible → unpublish → delete', async () => {
    const created = await editor.post('/api/v1/admin/mock-drills').send({
      title: 'SQL Query Challenge',
      kind: 'TEST',
      level: 'INTERMEDIATE',
      role: 'Data Analyst',
      provider: 'STUDLYF Labs',
      summary: 'A timed set of SQL problems from joins to window functions.',
      description: '<p onclick="steal()">Write queries</p><script>alert(1)</script>',
      durationMinutes: 60,
      questionCount: 15,
      startUrl: 'https://example.com/sql-challenge',
      skills: ['SQL', 'Python'],
      featured: true,
    });
    expect(created.status).toBe(201);
    const drill = created.body.data;
    expect(drill).toMatchObject({ slug: 'sql-query-challenge', status: 'DRAFT', publishedAt: null });
    expect(drill.description).toBe('<p>Write queries</p>'); // rich text sanitised on write
    expect(drill.skills.map((s) => s.slug).sort()).toEqual(['python', 'sql']);

    expect((await pub('/mock-drills/sql-query-challenge')).status).toBe(404);

    const published = await editor.post(`/api/v1/admin/mock-drills/${drill.id}/publish`);
    expect(published.body.data.status).toBe('PUBLISHED');
    expect((await pub('/mock-drills/sql-query-challenge')).status).toBe(200);

    await editor.post(`/api/v1/admin/mock-drills/${drill.id}/unpublish`).expect(200);
    expect((await pub('/mock-drills/sql-query-challenge')).status).toBe(404);

    await editor.delete(`/api/v1/admin/mock-drills/${drill.id}`).expect(200);
    expect((await editor.get(`/api/v1/admin/mock-drills/${drill.id}`)).status).toBe(404);
  });

  it('validates admin input and rejects unknown fields', async () => {
    const res = await editor.post('/api/v1/admin/mock-drills').send({
      title: '',
      kind: 'PUZZLE',
      level: 'GODLIKE',
      summary: 'x',
      startUrl: 'javascript:alert(1)',
      bogus: true,
    });
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['title', 'kind', 'level', 'startUrl']));
  });

  it('admin list includes drafts and supports filters', async () => {
    const drafts = (await editor.get('/api/v1/admin/mock-drills?status=draft')).body;
    expect(drafts.data.map((d) => d.title)).toContain('Internal Draft: Frontend Take-home Review');
    const interviews = (await editor.get('/api/v1/admin/mock-drills?kind=interview')).body.data;
    expect(interviews.every((d) => d.kind === 'INTERVIEW')).toBe(true);
  });

  it('refuses taken slugs on update', async () => {
    const list = (await editor.get('/api/v1/admin/mock-drills?kind=test&pageSize=50')).body.data;
    const target = list.find((d) => d.slug !== 'javascript-fundamentals-assessment');
    const taken = await editor.patch(`/api/v1/admin/mock-drills/${target.id}`).send({ slug: 'javascript-fundamentals-assessment' });
    expect(taken.status).toBe(409);
    expect(taken.body.error.code).toBe('SLUG_TAKEN');
  });
});
