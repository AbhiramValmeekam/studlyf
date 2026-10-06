import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext, uniqueEmail } from './helpers.js';

let ctx;
let admin;

let unameCounter = 0;
const nextUsername = () => `maker-${Date.now().toString(36)}-${unameCounter++}`;

beforeAll(async () => {
  ctx = await createTestContext();
  admin = await ctx.loginAs('superAdmin');
});
afterAll(() => ctx.close());

/** Register a fresh account, grant BUILDER via onboarding, and give it a profile. */
async function makeBuilderWithProfile(extra = {}) {
  const agent = request.agent(ctx.app);
  await agent.post('/api/v1/auth/register').send({ name: 'Maker', email: uniqueEmail('maker'), password: 'goodpass123' }).expect(201);
  await agent.post('/api/v1/onboarding').send({ intent: 'BUILDER' }).expect(200);
  const username = nextUsername();
  const res = await agent.post('/api/v1/builder/profile').send({ username, ...extra });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return { agent, username };
}

/** Register a plain USER (no builder onboarding). */
async function makePlainUser() {
  const agent = request.agent(ctx.app);
  await agent.post('/api/v1/auth/register').send({ name: 'Plain', email: uniqueEmail('plain'), password: 'goodpass123' }).expect(201);
  return agent;
}

const newProject = (over = {}) => ({
  title: `Project ${Math.random().toString(36).slice(2, 8)}`,
  tagline: 'A small useful thing built over a weekend.',
  category: 'WEB',
  tags: ['react', 'node-js'],
  description: '<p>Longer write-up of what the project does and how it was built.</p>',
  links: { repo: 'https://github.com/example/thing' },
  ...over,
});

describe('community feed (seeded)', () => {
  it('requires authentication for every community route', async () => {
    expect((await request(ctx.app).get('/api/v1/community/projects')).status).toBe(401);
    expect((await request(ctx.app).get('/api/v1/community/leaderboard')).status).toBe(401);
  });

  it('lists published projects with pagination meta and never leaks search helpers', async () => {
    const builder = await makeBuilderWithProfile();
    const res = await builder.agent.get('/api/v1/community/projects');
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, total: expect.any(Number) });
    expect(res.body.data.length).toBeGreaterThanOrEqual(4); // four seeded projects
    const card = res.body.data[0];
    expect(card).toMatchObject({ id: expect.any(String), slug: expect.any(String), title: expect.any(String), upvoteCount: expect.any(Number) });
    expect(card.author).toMatchObject({ username: expect.any(String) });
    expect(JSON.stringify(res.body)).not.toMatch(/searchTerms|titleTerms|_trend/);
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('filters the feed by category and tag, and sorts TOP by upvotes', async () => {
    const builder = await makeBuilderWithProfile();
    const ai = await builder.agent.get('/api/v1/community/projects?category=AI_ML');
    expect(ai.body.data.every((p) => p.category === 'AI_ML')).toBe(true);
    expect(ai.body.data.length).toBeGreaterThanOrEqual(2);

    const tagged = await builder.agent.get('/api/v1/community/projects?tag=python');
    expect(tagged.body.data.every((p) => p.tags.includes('python'))).toBe(true);

    const top = await builder.agent.get('/api/v1/community/projects?sort=TOP');
    const counts = top.body.data.map((p) => p.upvoteCount);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  it('exposes popular tags, category counts and a leaderboard', async () => {
    const builder = await makeBuilderWithProfile();
    const tags = await builder.agent.get('/api/v1/community/tags');
    expect(tags.body.data[0]).toMatchObject({ tag: expect.any(String), count: expect.any(Number) });

    const cats = await builder.agent.get('/api/v1/community/categories');
    expect(cats.body.data.find((c) => c.category === 'AI_ML').count).toBeGreaterThanOrEqual(2);

    const board = await builder.agent.get('/api/v1/community/leaderboard');
    expect(board.body.data[0]).toMatchObject({ rank: 1, username: expect.any(String), upvotes: expect.any(Number), projects: expect.any(Number) });
  });

  it('serves a public author portfolio by username', async () => {
    const builder = await makeBuilderWithProfile();
    const res = await builder.agent.get('/api/v1/community/authors/sample-builder/projects');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(3);
    expect(res.body.data[0]).toMatchObject({ slug: expect.any(String), status: 'PUBLISHED' });
  });
});

describe('community project ownership', () => {
  it('lets a builder create, read, edit and delete their own project', async () => {
    const { agent } = await makeBuilderWithProfile();
    const created = await agent.post('/api/v1/community/projects').send(newProject({ title: 'My First Build' }));
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ slug: 'my-first-build', status: 'PUBLISHED', upvoteCount: 0 });
    const { id, slug } = created.body.data;

    const detail = await agent.get(`/api/v1/community/projects/${slug}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.links.repo).toBe('https://github.com/example/thing');

    const mine = await agent.get('/api/v1/community/my/projects');
    expect(mine.body.data.map((p) => p.id)).toContain(id);

    const edited = await agent.patch(`/api/v1/community/projects/${id}`).send({ tagline: 'An updated tagline.' });
    expect(edited.status).toBe(200);
    expect(edited.body.data.tagline).toBe('An updated tagline.');

    expect((await agent.delete(`/api/v1/community/projects/${id}`)).status).toBe(200);
    expect((await agent.get(`/api/v1/community/projects/${slug}`)).status).toBe(404);
  });

  it('requires the BUILDER role to submit a project', async () => {
    const plain = await makePlainUser();
    expect((await plain.post('/api/v1/community/projects').send(newProject())).status).toBe(403);
  });

  it('scopes edits and deletes to the owner', async () => {
    const owner = await makeBuilderWithProfile();
    const id = (await owner.agent.post('/api/v1/community/projects').send(newProject())).body.data.id;

    const other = await makeBuilderWithProfile();
    expect((await other.agent.patch(`/api/v1/community/projects/${id}`).send({ tagline: 'hijack' })).status).toBe(403);
    expect((await other.agent.delete(`/api/v1/community/projects/${id}`)).status).toBe(403);
  });
});

describe('community upvotes', () => {
  it('toggles an upvote and refuses self-upvotes', async () => {
    const owner = await makeBuilderWithProfile();
    const { id, slug } = (await owner.agent.post('/api/v1/community/projects').send(newProject())).body.data;

    // Author cannot upvote their own project.
    expect((await owner.agent.post(`/api/v1/community/projects/${id}/upvote`)).status).toBe(400);

    const voter = await makeBuilderWithProfile();
    const up = await voter.agent.post(`/api/v1/community/projects/${id}/upvote`);
    expect(up.status).toBe(200);
    expect(up.body.data).toMatchObject({ upvoted: true, upvoteCount: 1 });

    // The card now reflects the viewer's own vote.
    const seen = (await voter.agent.get(`/api/v1/community/projects/${slug}`)).body.data;
    expect(seen).toMatchObject({ upvoted: true, upvoteCount: 1 });

    // Toggling again removes it.
    const down = await voter.agent.post(`/api/v1/community/projects/${id}/upvote`);
    expect(down.body.data).toMatchObject({ upvoted: false, upvoteCount: 0 });
  });
});

describe('community admin moderation', () => {
  it('lists, features and archives projects with audit entries', async () => {
    const owner = await makeBuilderWithProfile();
    const { id } = (await owner.agent.post('/api/v1/community/projects').send(newProject({ title: 'Moderate Me' }))).body.data;

    const listed = await admin.get('/api/v1/admin/projects');
    expect(listed.status).toBe(200);
    expect(listed.body.data.map((p) => p.id)).toContain(id);

    await admin.post(`/api/v1/admin/projects/${id}/feature`).expect(200);
    await admin.post(`/api/v1/admin/projects/${id}/archive`).expect(200);

    // An archived project drops out of the public feed.
    const feed = await owner.agent.get('/api/v1/community/projects');
    expect(feed.body.data.map((p) => p.id)).not.toContain(id);

    await admin.delete(`/api/v1/admin/projects/${id}`).expect(200);

    const logs = (await admin.get('/api/v1/admin/audit-logs?entityType=project&pageSize=100')).body.data;
    expect(logs.map((l) => l.action)).toEqual(
      expect.arrayContaining(['project.feature', 'project.archive', 'project.delete']),
    );
  });

  it('rejects non-admins from moderation routes', async () => {
    const builder = await makeBuilderWithProfile();
    expect((await builder.agent.get('/api/v1/admin/projects')).status).toBe(403);
  });
});
