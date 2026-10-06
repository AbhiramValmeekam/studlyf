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
const HIDDEN = /DRAFT|must never appear/i;

describe('public courses', () => {
  it('lists only published courses with pagination meta and light cards', async () => {
    const res = await pub('/courses?pageSize=50');
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(5); // 3 STUDENT + 2 COMPANY published; the draft is hidden
    expect(JSON.stringify(res.body)).not.toMatch(HIDDEN);
    const item = res.body.data[0];
    expect(item).toMatchObject({
      id: expect.any(String),
      slug: expect.any(String),
      audience: expect.any(String),
      level: expect.any(String),
      summary: expect.any(String),
      skills: expect.any(Array),
      moduleCount: expect.any(Number),
      lessonCount: expect.any(Number),
    });
    expect(item.modules).toBeUndefined(); // list view is lightweight
    expect(item.description).toBeUndefined();
  });

  it('is cacheable by browsers/CDNs', async () => {
    const res = await pub('/courses');
    expect(res.headers['cache-control']).toMatch(/public, max-age=\d+/);
    expect(res.headers.etag).toBeDefined();
  });

  it('filters by audience, level, skill and featured', async () => {
    const students = (await pub('/courses?audience=student&pageSize=50')).body;
    expect(students.meta.total).toBe(3);
    expect(students.data.every((c) => c.audience === 'STUDENT')).toBe(true);

    const company = (await pub('/courses?audience=company')).body;
    expect(company.meta.total).toBe(2);
    expect(company.data.every((c) => c.audience === 'COMPANY' && c.provider)).toBe(true);

    const advanced = (await pub('/courses?level=advanced')).body.data;
    expect(advanced.map((c) => c.slug)).toEqual(['applied-machine-learning']);

    const react = (await pub('/courses?skill=react')).body.data;
    expect(react.map((c) => c.slug)).toEqual(['frontend-engineering-readiness']);

    const featured = (await pub('/courses?featured=true&pageSize=50')).body.data;
    expect(featured.every((c) => c.featured)).toBe(true);
    expect(featured.length).toBeGreaterThan(0);
  });

  it('rejects invalid filter values with field errors', async () => {
    const res = await pub('/courses?audience=aliens&level=wizard&pageSize=500');
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['audience', 'level', 'pageSize']));
  });

  it('returns full details (modules + lessons) by slug and sorts them', async () => {
    const res = await pub('/courses/frontend-engineering-readiness');
    expect(res.status).toBe(200);
    const c = res.body.data;
    expect(c).toMatchObject({
      title: 'Frontend Engineering Readiness',
      audience: 'STUDENT',
      role: 'Frontend Engineer',
      description: expect.stringContaining('<p>'),
    });
    expect(c.modules.map((m) => m.displayOrder)).toEqual([0, 1, 2]);
    expect(c.modules[0].lessons[0]).toMatchObject({ title: expect.any(String), kind: expect.any(String) });
    expect(c.moduleCount).toBe(3);
  });

  it('404s for draft slugs', async () => {
    const res = await pub('/courses/internal-draft-ml-ops-deep-dive');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: { code: 'NOT_FOUND', message: 'Course not found' } });
  });
});

describe('courses via admin', () => {
  it('rejects non-admin callers', async () => {
    expect((await request(ctx.app).get('/api/v1/admin/courses')).status).toBe(401);
    expect((await builder.get('/api/v1/admin/courses')).status).toBe(403);
  });

  it('create (draft) → invisible → publish → visible → unpublish → delete', async () => {
    const created = await editor.post('/api/v1/admin/courses').send({
      title: 'Go Concurrency Masterclass',
      audience: 'STUDENT',
      level: 'ADVANCED',
      role: 'Backend Engineer',
      summary: 'Master goroutines, channels and the Go memory model.',
      description: '<p onclick="steal()">Learn Go</p><script>alert(1)</script>',
      durationHours: 16,
      skills: ['Go', 'Concurrency'],
      modules: [
        { title: 'Goroutines', lessons: [{ title: 'Spawning work', kind: 'READING', durationMinutes: 20 }] },
        { title: 'Channels', lessons: [{ title: 'Fan-in / fan-out', kind: 'VIDEO', url: 'https://example.com/go-channels' }] },
      ],
      featured: true,
    });
    expect(created.status).toBe(201);
    const course = created.body.data;
    expect(course).toMatchObject({ slug: 'go-concurrency-masterclass', status: 'DRAFT', publishedAt: null });
    expect(course.description).toBe('<p>Learn Go</p>'); // rich text sanitised on write
    expect(course.skills.map((s) => s.slug).sort()).toEqual(['concurrency', 'go']);
    expect(course.moduleCount).toBe(2);

    expect((await pub('/courses/go-concurrency-masterclass')).status).toBe(404);

    const published = await editor.post(`/api/v1/admin/courses/${course.id}/publish`);
    expect(published.body.data.status).toBe('PUBLISHED');
    expect((await pub('/courses/go-concurrency-masterclass')).status).toBe(200);

    await editor.post(`/api/v1/admin/courses/${course.id}/unpublish`).expect(200);
    expect((await pub('/courses/go-concurrency-masterclass')).status).toBe(404);

    await editor.delete(`/api/v1/admin/courses/${course.id}`).expect(200);
    expect((await editor.get(`/api/v1/admin/courses/${course.id}`)).status).toBe(404);
  });

  it('requires a provider for COMPANY learning modules', async () => {
    const res = await editor.post('/api/v1/admin/courses').send({
      title: 'Company Module Without Provider',
      audience: 'COMPANY',
      level: 'BEGINNER',
      summary: 'Should fail validation.',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.field)).toContain('provider');
  });

  it('validates admin input and rejects unknown fields', async () => {
    const res = await editor.post('/api/v1/admin/courses').send({
      title: '',
      audience: 'STUDENT',
      level: 'PARTY',
      summary: 'x',
      enrollUrl: 'javascript:alert(1)',
      bogus: true,
    });
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['title', 'level', 'enrollUrl']));
  });

  it('admin list includes drafts and supports filters', async () => {
    const drafts = (await editor.get('/api/v1/admin/courses?status=draft')).body;
    expect(drafts.data.map((c) => c.title)).toContain('Internal Draft: ML Ops Deep Dive');
    const company = (await editor.get('/api/v1/admin/courses?audience=company')).body.data;
    expect(company.every((c) => c.audience === 'COMPANY')).toBe(true);
  });

  it('refuses taken slugs on update', async () => {
    const list = (await editor.get('/api/v1/admin/courses?audience=student&pageSize=50')).body.data;
    const target = list.find((c) => c.slug !== 'applied-machine-learning');
    const taken = await editor.patch(`/api/v1/admin/courses/${target.id}`).send({ slug: 'applied-machine-learning' });
    expect(taken.status).toBe(409);
    expect(taken.body.error.code).toBe('SLUG_TAKEN');
  });
});
