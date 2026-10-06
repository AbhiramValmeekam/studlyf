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

describe('public project briefs', () => {
  it('lists only published briefs with pagination meta and light cards', async () => {
    const res = await pub('/project-briefs?pageSize=50');
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(4); // 4 published; draft hidden
    expect(JSON.stringify(res.body)).not.toMatch(HIDDEN);
    const item = res.body.data[0];
    expect(item).toMatchObject({
      id: expect.any(String),
      slug: expect.any(String),
      category: expect.any(String),
      difficulty: expect.any(String),
      summary: expect.any(String),
      skills: expect.any(Array),
    });
    expect(item.description).toBeUndefined(); // list view is lightweight
    expect(item.deliverables).toBeUndefined();
    expect(item.starterUrl).toBeUndefined();
  });

  it('is cacheable by browsers/CDNs', async () => {
    const res = await pub('/project-briefs');
    expect(res.headers['cache-control']).toMatch(/public, max-age=\d+/);
    expect(res.headers.etag).toBeDefined();
  });

  it('filters by category, difficulty, skill and featured', async () => {
    const web = (await pub('/project-briefs?category=web&pageSize=50')).body;
    expect(web.data.every((b) => b.category === 'WEB')).toBe(true);
    expect(web.data.length).toBeGreaterThan(0);

    const intermediate = (await pub('/project-briefs?difficulty=intermediate&pageSize=50')).body.data;
    expect(intermediate.every((b) => b.difficulty === 'INTERMEDIATE')).toBe(true);

    const react = (await pub('/project-briefs?skill=react&pageSize=50')).body.data;
    expect(react.every((b) => b.skills.some((s) => s.slug === 'react'))).toBe(true);
    expect(react.length).toBeGreaterThan(0);

    const featured = (await pub('/project-briefs?featured=true&pageSize=50')).body.data;
    expect(featured.every((b) => b.featured)).toBe(true);
    expect(featured.length).toBeGreaterThan(0);
  });

  it('rejects invalid filter values with field errors', async () => {
    const res = await pub('/project-briefs?category=spaceship&difficulty=godlike&pageSize=500');
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['category', 'difficulty', 'pageSize']));
  });

  it('returns full details by slug including description, deliverables + starterUrl', async () => {
    const res = await pub('/project-briefs/real-time-chat-app');
    expect(res.status).toBe(200);
    const b = res.body.data;
    expect(b).toMatchObject({
      title: 'Real-time Chat App',
      category: 'WEB',
      difficulty: 'INTERMEDIATE',
      description: expect.stringContaining('<p>'),
      starterUrl: expect.stringContaining('http'),
    });
    expect(Array.isArray(b.deliverables)).toBe(true);
    expect(b.deliverables.length).toBeGreaterThan(0);
  });

  it('404s for draft slugs', async () => {
    const res = await pub('/project-briefs/internal-draft-devops-pipeline-kata');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: { code: 'NOT_FOUND', message: 'Project brief not found' } });
  });
});

describe('project briefs via admin', () => {
  it('rejects non-admin callers', async () => {
    expect((await request(ctx.app).get('/api/v1/admin/project-briefs')).status).toBe(401);
    expect((await builder.get('/api/v1/admin/project-briefs')).status).toBe(403);
  });

  it('create (draft) → invisible → publish → visible → unpublish → delete', async () => {
    const created = await editor.post('/api/v1/admin/project-briefs').send({
      title: 'URL Shortener Service',
      category: 'DEVTOOLS',
      difficulty: 'BEGINNER',
      summary: 'Build a URL shortener with analytics and custom aliases.',
      description: '<p onclick="steal()">Shorten URLs</p><script>alert(1)</script>',
      estimatedHours: 8,
      deliverables: ['Shorten + redirect endpoints', 'Click analytics', 'Custom alias support'],
      starterUrl: 'https://example.com/starters/url-shortener',
      skills: ['Node.js', 'SQL'],
      featured: true,
    });
    expect(created.status).toBe(201);
    const brief = created.body.data;
    expect(brief).toMatchObject({ slug: 'url-shortener-service', status: 'DRAFT', publishedAt: null });
    expect(brief.description).toBe('<p>Shorten URLs</p>'); // rich text sanitised on write
    expect(brief.skills.map((s) => s.slug).sort()).toEqual(['node-js', 'sql']);
    expect(brief.deliverables).toHaveLength(3);

    expect((await pub('/project-briefs/url-shortener-service')).status).toBe(404);

    const published = await editor.post(`/api/v1/admin/project-briefs/${brief.id}/publish`);
    expect(published.body.data.status).toBe('PUBLISHED');
    expect((await pub('/project-briefs/url-shortener-service')).status).toBe(200);

    await editor.post(`/api/v1/admin/project-briefs/${brief.id}/unpublish`).expect(200);
    expect((await pub('/project-briefs/url-shortener-service')).status).toBe(404);

    await editor.delete(`/api/v1/admin/project-briefs/${brief.id}`).expect(200);
    expect((await editor.get(`/api/v1/admin/project-briefs/${brief.id}`)).status).toBe(404);
  });

  it('validates admin input and rejects unknown fields', async () => {
    const res = await editor.post('/api/v1/admin/project-briefs').send({
      title: '',
      category: 'SPACESHIP',
      difficulty: 'GODLIKE',
      summary: 'x',
      starterUrl: 'javascript:alert(1)',
      bogus: true,
    });
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['title', 'category', 'difficulty', 'starterUrl']));
  });

  it('admin list includes drafts and supports filters', async () => {
    const drafts = (await editor.get('/api/v1/admin/project-briefs?status=draft')).body;
    expect(drafts.data.map((b) => b.title)).toContain('Internal Draft: DevOps Pipeline Kata');
    const aiml = (await editor.get('/api/v1/admin/project-briefs?category=ai_ml')).body.data;
    expect(aiml.every((b) => b.category === 'AI_ML')).toBe(true);
  });

  it('refuses taken slugs on update', async () => {
    const list = (await editor.get('/api/v1/admin/project-briefs?pageSize=50')).body.data;
    const target = list.find((b) => b.slug !== 'real-time-chat-app');
    const taken = await editor.patch(`/api/v1/admin/project-briefs/${target.id}`).send({ slug: 'real-time-chat-app' });
    expect(taken.status).toBe(409);
    expect(taken.body.error.code).toBe('SLUG_TAKEN');
  });
});
