import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext } from './helpers.js';

let ctx;
let editor;
let builder;
let investor;

beforeAll(async () => {
  ctx = await createTestContext();
  [editor, builder, investor] = await Promise.all([
    ctx.loginAs('editor'),
    ctx.loginAs('builder'),
    ctx.loginAs('investor'),
  ]);
});
afterAll(() => ctx.close());

const pub = (path) => request(ctx.app).get(`/api/v1${path}`);
const HIDDEN = /DRAFT|should never appear/i;

/** The seeded builder's goal — re-picked so a test never depends on the one before it. */
const pickGoal = (roleSlug, target = {}) =>
  builder.put('/api/v1/builder/roadmap').send({ roleSlug, ...target });
const myPlan = async () => (await builder.get('/api/v1/builder/roadmap')).body.data.plan;

describe('public roadmap templates', () => {
  it('lists only published roles with pagination meta and light cards', async () => {
    const res = await pub('/roadmaps?pageSize=50');
    expect(res.status).toBe(200);
    // Full-Stack Engineer + Data Scientist (featured) + Product Designer; the draft stays hidden.
    expect(res.body.meta.total).toBe(3);
    expect(JSON.stringify(res.body)).not.toMatch(HIDDEN);
    const card = res.body.data[0];
    expect(card).toMatchObject({
      id: expect.any(String),
      role: expect.any(String),
      slug: expect.any(String),
      summary: expect.any(String),
      stepCount: expect.any(Number),
      featured: expect.any(Boolean),
    });
    expect(card.description).toBeUndefined(); // the list view is lightweight
    expect(card.steps).toBeUndefined();
    expect(card.stepCounts.CORE).toBeGreaterThan(0);
  });

  it('is cacheable by browsers/CDNs', async () => {
    const res = await pub('/roadmaps');
    expect(res.headers['cache-control']).toMatch(/public, max-age=\d+/);
    expect(res.headers.etag).toBeDefined();
  });

  it('filters by role family and featured, and lists the families on offer', async () => {
    const data = (await pub('/roadmaps?roleFamily=Engineering&pageSize=50')).body.data;
    expect(data.length).toBe(1);
    expect(data[0].slug).toBe('full-stack-engineer');

    const featured = (await pub('/roadmaps?featured=true&pageSize=50')).body.data;
    expect(featured.length).toBe(2);
    expect(featured.every((r) => r.featured)).toBe(true);

    const families = (await pub('/roadmaps/role-families')).body.data;
    expect(families).toEqual(['Data', 'Design', 'Engineering']);
  });

  it('serves a role with its steps in priority order', async () => {
    const res = await pub('/roadmaps/full-stack-engineer');
    expect(res.status).toBe(200);
    const role = res.body.data;
    expect(role).toMatchObject({ role: 'Full-Stack Engineer', roleFamily: 'Engineering' });
    expect(role.description).toMatch(/full-stack work/i);
    expect(role.steps.length).toBe(8);
    expect(role.steps.map((s) => s.priority)).toEqual([
      'CORE', 'CORE', 'CORE', 'CORE',
      'IMPORTANT', 'IMPORTANT', 'IMPORTANT',
      'OPTIONAL',
    ]);
    expect(role.steps[0]).toMatchObject({
      skillSlug: expect.any(String),
      skillName: expect.any(String),
      rationale: expect.any(String),
    });
  });

  it('rejects an invalid filter and 404s an unknown or unpublished role', async () => {
    const bad = await pub('/roadmaps?sort=popular&pageSize=500');
    expect(bad.status).toBe(400);
    expect(bad.body.error.details.map((d) => d.field)).toEqual(expect.arrayContaining(['sort', 'pageSize']));

    expect((await pub('/roadmaps/not-a-role')).status).toBe(404);
    // The draft role exists but is not published, so a stranger must not be able to read it.
    expect((await pub('/roadmaps/internal-draft-platform-engineer')).status).toBe(404);
  });
});

describe("a builder's roadmap", () => {
  it('computes the plan from the seeded goal, the profile skills and the hand-marked steps', async () => {
    const res = await builder.get('/api/v1/builder/roadmap');
    expect(res.status).toBe(200);
    const { plan } = res.body.data;
    expect(plan.goal).toMatchObject({ roleSlug: 'full-stack-engineer', role: 'Full-Stack Engineer' });
    expect(plan.goal.startedAt).toBeTruthy();
    expect(plan.progress.total).toBe(8);
    // 3 from the profile (React, Node.js, UI/UX) + 2 marked by hand (Git, SQL).
    expect(plan.progress.complete).toBe(5);
    expect(plan.progress.percent).toBe(63);
    expect(plan.progress.byPriority.CORE).toEqual({ total: 4, complete: 3 });
    expect(plan.progress.nextSteps.map((s) => s.skillSlug)).toEqual(['javascript']);

    const by = Object.fromEntries(plan.steps.map((s) => [s.skillSlug, s]));
    expect(by.react).toMatchObject({ done: true, source: 'PROFILE' });
    expect(by.git).toMatchObject({ done: true, source: 'MARKED' });
    expect(by.javascript).toMatchObject({ done: false, source: null });
  });

  it('ticks a step by hand, and unticking it puts it back', async () => {
    await pickGoal('full-stack-engineer');
    expect((await myPlan()).progress.complete).toBe(5);

    const marked = await builder.patch('/api/v1/builder/roadmap/steps/javascript').send({ done: true });
    expect(marked.status).toBe(200);
    const after = marked.body.data.plan;
    expect(after.progress.complete).toBe(6);
    expect(after.steps.find((s) => s.skillSlug === 'javascript')).toMatchObject({ done: true, source: 'MARKED' });

    const undone = await builder.patch('/api/v1/builder/roadmap/steps/javascript').send({ done: false });
    expect(undone.body.data.plan.progress.complete).toBe(5);
    expect(undone.body.data.plan.steps.find((s) => s.skillSlug === 'javascript').done).toBe(false);
  });

  it('never lets a checkbox contradict the profile', async () => {
    await pickGoal('full-stack-engineer');
    const res = await builder.patch('/api/v1/builder/roadmap/steps/react').send({ done: false });
    expect(res.status).toBe(200);
    // React is on the builder's profile, so the step stays done — evidence outranks the tick.
    expect(res.body.data.plan.steps.find((s) => s.skillSlug === 'react')).toMatchObject({ done: true, source: 'PROFILE' });
    expect(res.body.data.plan.progress.complete).toBe(5);
  });

  it('starts a clean plan when the goal changes, and 404s a role nobody published', async () => {
    await pickGoal('full-stack-engineer');
    const res = await pickGoal('data-scientist', { targetDate: '2027-01-31' });
    expect(res.status).toBe(200);
    const plan = res.body.data.plan;
    expect(plan.goal).toMatchObject({ roleSlug: 'data-scientist', role: 'Data Scientist' });
    expect(plan.goal.targetDate).toBe('2027-01-31T00:00:00.000Z');
    expect(plan.steps.length).toBe(6);
    // Only Machine Learning carries over from the profile; the old hand-ticks do not.
    expect(plan.progress.complete).toBe(1);
    expect(plan.steps.find((s) => s.skillSlug === 'sql')).toMatchObject({ done: false, source: null });

    const missing = await pickGoal('internal-draft-platform-engineer');
    expect(missing.status).toBe(404);

    await pickGoal('full-stack-engineer'); // leave the goal as the seed had it
  });

  it('rejects a skill that is not a step in the current roadmap', async () => {
    await pickGoal('full-stack-engineer');
    const res = await builder.patch('/api/v1/builder/roadmap/steps/astrophysics').send({ done: true });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([{ field: 'skillSlug', message: expect.stringMatching(/not a step/i) }]);
  });

  it('clears the goal, leaving the role catalog to start again from', async () => {
    await pickGoal('full-stack-engineer');
    const res = await builder.delete('/api/v1/builder/roadmap');
    expect(res.status).toBe(200);
    expect(res.body.data.plan).toBeNull();
    expect(res.body.data.suggestedRoles.length).toBeGreaterThan(0);
    expect(res.body.data.suggestedRoles.every((r) => r.featured)).toBe(true);

    await pickGoal('full-stack-engineer');
  });

  it('needs a session, and a builder one at that', async () => {
    expect((await request(ctx.app).get('/api/v1/builder/roadmap')).status).toBe(401);
    expect((await investor.get('/api/v1/builder/roadmap')).status).toBe(403);
    expect((await investor.put('/api/v1/builder/roadmap').send({ roleSlug: 'full-stack-engineer' })).status).toBe(403);
  });
});

describe('admin roadmap authoring', () => {
  const draft = {
    role: 'Site Reliability Engineer',
    roleFamily: 'Engineering',
    summary: 'Keep production up: observe it, automate it, and stay calm when it breaks.',
    steps: [
      { skillSlug: 'cloud', skillName: 'Cloud', priority: 'CORE', rationale: 'Where production lives.' },
      { skillSlug: 'node-js', skillName: 'Node.js', priority: 'IMPORTANT' },
    ],
  };

  it('creates a draft, publishes it into the public catalog, then unpublishes it', async () => {
    const created = await editor.post('/api/v1/admin/roadmaps').send(draft);
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ slug: 'site-reliability-engineer', status: 'DRAFT', stepCount: 2 });
    const { id } = created.body.data;
    expect((await pub('/roadmaps/site-reliability-engineer')).status).toBe(404);

    const published = await editor.post(`/api/v1/admin/roadmaps/${id}/publish`).send({});
    expect(published.status).toBe(200);
    expect(published.body.data.status).toBe('PUBLISHED');
    const live = await pub('/roadmaps/site-reliability-engineer');
    expect(live.status).toBe(200);
    expect(live.body.data.steps.map((s) => s.skillSlug)).toEqual(['cloud', 'node-js']);

    const off = await editor.post(`/api/v1/admin/roadmaps/${id}/unpublish`).send({});
    expect(off.status).toBe(200);
    expect((await pub('/roadmaps/site-reliability-engineer')).status).toBe(404);
  });

  it('validates the steps it is given', async () => {
    const dupe = await editor.post('/api/v1/admin/roadmaps').send({
      ...draft,
      role: 'Duplicate Skills Role',
      steps: [{ skillSlug: 'cloud', skillName: 'Cloud' }, { skillSlug: 'cloud', skillName: 'Cloud again' }],
    });
    expect(dupe.status).toBe(400);
    expect(dupe.body.error.details[0].message).toMatch(/only once/i);

    const empty = await editor.post('/api/v1/admin/roadmaps').send({ ...draft, role: 'No Steps Role', steps: [] });
    expect(empty.status).toBe(400);

    const missingSummary = await editor.post('/api/v1/admin/roadmaps').send({ role: 'Bare Role', steps: draft.steps });
    expect(missingSummary.status).toBe(400);
    expect(missingSummary.body.error.details.map((d) => d.field)).toContain('summary');
  });

  it('will not let a stranger write the catalog', async () => {
    expect((await request(ctx.app).post('/api/v1/admin/roadmaps').send(draft)).status).toBe(401);
    expect((await builder.post('/api/v1/admin/roadmaps').send(draft)).status).toBe(403);
    expect((await pub('/admin/roadmaps')).status).toBe(401); // the admin tree is gated, not public
  });
});
