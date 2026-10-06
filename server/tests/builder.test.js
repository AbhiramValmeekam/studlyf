import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext, uniqueEmail } from './helpers.js';

let ctx;
let editor;
let admin;

let unameCounter = 0;
const nextUsername = () => `tester-${Date.now().toString(36)}-${unameCounter++}`;

beforeAll(async () => {
  ctx = await createTestContext();
  [editor, admin] = await Promise.all([ctx.loginAs('editor'), ctx.loginAs('superAdmin')]);
});
afterAll(() => ctx.close());

const pub = (path) => request(ctx.app).get(`/api/v1${path}`);

/** Register a fresh account and grant it the BUILDER role via onboarding. */
async function makeBuilder() {
  const agent = request.agent(ctx.app);
  await agent.post('/api/v1/auth/register').send({ name: 'Builder', email: uniqueEmail('builder'), password: 'goodpass123' }).expect(201);
  const res = await agent.post('/api/v1/onboarding').send({ intent: 'BUILDER' });
  expect(res.body.data.roles).toEqual(expect.arrayContaining(['BUILDER']));
  return agent;
}

/** Register a fresh account with only the default USER role (no builder onboarding). */
async function makePlainUser() {
  const agent = request.agent(ctx.app);
  await agent.post('/api/v1/auth/register').send({ name: 'Plain', email: uniqueEmail('plain'), password: 'goodpass123' }).expect(201);
  return agent;
}

/** Create a profile for a builder agent and return the chosen username. */
async function createProfile(agent, extra = {}) {
  const username = nextUsername();
  const res = await agent.post('/api/v1/builder/profile').send({ username, ...extra });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return { username, profile: res.body.data };
}

const oppDetail = async (slug) => (await pub(`/opportunities/${slug}`)).body.data;

describe('skills', () => {
  it('lists and searches the public skill vocabulary', async () => {
    const all = await pub('/skills');
    expect(all.status).toBe(200);
    expect(all.body.data.length).toBeGreaterThanOrEqual(10);
    expect(all.body.data[0]).toMatchObject({ id: expect.any(String), name: expect.any(String), slug: expect.any(String) });

    const react = await pub('/skills?q=react');
    expect(react.body.data.map((s) => s.slug)).toContain('react');
  });

  it('supports admin CRUD, hides deactivated skills, and records audit entries', async () => {
    const created = await editor.post('/api/v1/admin/skills').send({ name: 'Rust Lang', category: 'Programming' });
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    expect(created.body.data.slug).toBe('rust-lang');
    expect((await pub('/skills?q=rust')).body.data.map((s) => s.slug)).toContain('rust-lang');

    await editor.patch(`/api/v1/admin/skills/${id}`).send({ category: 'Systems' }).expect(200);

    await editor.post(`/api/v1/admin/skills/${id}/deactivate`).expect(200);
    expect((await pub('/skills?q=rust')).body.data.map((s) => s.slug)).not.toContain('rust-lang');

    await editor.delete(`/api/v1/admin/skills/${id}`).expect(200);
    expect((await editor.get(`/api/v1/admin/skills/${id}`)).status).toBe(404);

    const logs = (await admin.get('/api/v1/admin/audit-logs?entityType=skill&pageSize=100')).body.data;
    expect(logs.map((l) => l.action)).toEqual(
      expect.arrayContaining(['skill.create', 'skill.update', 'skill.deactivate', 'skill.delete']),
    );
  });

  it('rejects non-admins from skill management', async () => {
    const builder = await makeBuilder();
    expect((await builder.get('/api/v1/admin/skills')).status).toBe(403);
    expect((await builder.post('/api/v1/admin/skills').send({ name: 'Nope' })).status).toBe(403);
  });
});

describe('builder profiles', () => {
  it('requires the BUILDER role for owned profile routes', async () => {
    const plain = await makePlainUser();
    expect((await plain.get('/api/v1/builder/profile')).status).toBe(403);
    expect((await plain.get('/api/v1/builder/applications')).status).toBe(403);
    expect((await plain.get('/api/v1/builder/dashboard')).status).toBe(403);
  });

  it('404s until a profile is created, then creates one that defaults to PRIVATE', async () => {
    const builder = await makeBuilder();
    expect((await builder.get('/api/v1/builder/profile')).status).toBe(404);

    const username = nextUsername();
    const res = await builder.post('/api/v1/builder/profile').send({
      username,
      headline: 'Full-stack builder',
      bio: 'I build web apps and love shipping small useful tools every week.',
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ username, visibility: 'PRIVATE', headline: 'Full-stack builder' });

    // A second create attempt conflicts (1:1 with the user).
    expect((await builder.post('/api/v1/builder/profile').send({ username: nextUsername() })).status).toBe(409);
  });

  it('enforces username uniqueness across builders', async () => {
    const a = await makeBuilder();
    const { username } = await createProfile(a);
    const b = await makeBuilder();
    const clash = await b.post('/api/v1/builder/profile').send({ username });
    expect(clash.status).toBe(409);
    expect(clash.body.error.details[0].field).toBe('username');
  });

  it('computes a weighted completion score that rises as the profile fills in', async () => {
    const builder = await makeBuilder();
    await createProfile(builder, {
      headline: 'Frontend engineer',
      bio: 'I care about accessible interfaces and have shipped several production React apps.',
    });
    const first = (await builder.get('/api/v1/builder/profile/completion')).body.data;
    // Unified score (see modules/profile/completion.js): headline (10) + bio ≥40 chars (15) of 100.
    expect(first.score).toBe(25);
    expect(first.missing).toEqual(expect.arrayContaining(['skills', 'location', 'links', 'education', 'phone']));

    const set = await builder.put('/api/v1/builder/profile/skills').send({
      skills: [{ slug: 'react' }, { slug: 'node-js', proficiency: 'ADVANCED' }, { slug: 'python' }],
    });
    expect(set.status).toBe(200);
    expect(set.body.data.skills).toHaveLength(3);
    expect(set.body.data.completion.score).toBe(40); // + skills (15)

    const unknown = await builder.put('/api/v1/builder/profile/skills').send({ skills: [{ slug: 'not-a-real-skill' }] });
    expect(unknown.status).toBe(400);
    expect(unknown.body.error.details[0].field).toBe('skills');
  });

  it('serves public profiles by username only when visibility is PUBLIC', async () => {
    const builder = await makeBuilder();
    const { username } = await createProfile(builder, { headline: 'Hidden by default' });
    expect((await pub(`/builders/${username}`)).status).toBe(404); // PRIVATE

    await builder.patch('/api/v1/builder/profile').send({ visibility: 'PUBLIC' }).expect(200);
    const seen = await pub(`/builders/${username}`);
    expect(seen.status).toBe(200);
    expect(seen.body.data).toMatchObject({ username, headline: 'Hidden by default' });
    expect(seen.body.data.userId).toBeUndefined(); // public serializer withholds identity fields
    expect(JSON.stringify(seen.body)).not.toMatch(/email|visibility/);

    // Seeded fixtures: one PUBLIC, one PRIVATE.
    expect((await pub('/builders/sample-builder')).status).toBe(200);
    expect((await pub('/builders/zephyr')).status).toBe(404);
  });
});

describe('applications — builder flow', () => {
  it('applies, validates required answers at submit time, and blocks duplicate applications', async () => {
    const builder = await makeBuilder();
    await createProfile(builder, { headline: 'Applicant' });

    const workshop = await oppDetail('intro-to-machine-learning-workshop');
    const q = workshop.applicationQuestions[0]; // required SINGLE_SELECT
    expect(q.type).toBe('SINGLE_SELECT');

    const applied = await builder.post('/api/v1/builder/applications').send({ opportunityId: workshop.id });
    expect(applied.status).toBe(201);
    expect(applied.body.data.status).toBe('DRAFT');
    const appId = applied.body.data.id;

    // Required question unanswered → submit is rejected.
    const early = await builder.post(`/api/v1/builder/applications/${appId}/submit`);
    expect(early.status).toBe(400);

    const edited = await builder.patch(`/api/v1/builder/applications/${appId}`).send({
      answers: [{ questionId: q.id, choices: [q.options[0]] }],
    });
    expect(edited.status).toBe(200);
    expect(edited.body.data.answers[0].choices).toEqual([q.options[0]]);

    const submitted = await builder.post(`/api/v1/builder/applications/${appId}/submit`);
    expect(submitted.status).toBe(200);
    expect(submitted.body.data.status).toBe('SUBMITTED');
    expect(submitted.body.data.submittedAt).toBeTruthy();

    // One application per opportunity.
    const dup = await builder.post('/api/v1/builder/applications').send({ opportunityId: workshop.id });
    expect(dup.status).toBe(409);
  });

  it('validates answers against the opportunity questions on apply', async () => {
    const builder = await makeBuilder();
    await createProfile(builder);
    const workshop = await oppDetail('intro-to-machine-learning-workshop');
    const q = workshop.applicationQuestions[0];

    const bad = await builder.post('/api/v1/builder/applications').send({
      opportunityId: workshop.id,
      answers: [{ questionId: q.id, choices: ['Not An Option'] }],
    });
    expect(bad.status).toBe(400);

    const unknown = await builder.post('/api/v1/builder/applications').send({
      opportunityId: workshop.id,
      answers: [{ questionId: '0'.repeat(24), text: 'x' }],
    });
    expect(unknown.status).toBe(400);
  });

  it('requires a builder profile before applying', async () => {
    const builder = await makeBuilder(); // no profile
    const workshop = await oppDetail('intro-to-machine-learning-workshop');
    const res = await builder.post('/api/v1/builder/applications').send({ opportunityId: workshop.id });
    expect(res.status).toBe(400);
  });

  it('lets a builder withdraw a draft and refuses to withdraw twice', async () => {
    const builder = await makeBuilder();
    await createProfile(builder);
    const loop = await oppDetail('loophacks-2026-ai-for-bharat');
    const applied = await builder.post('/api/v1/builder/applications').send({ opportunityId: loop.id });
    const appId = applied.body.data.id;

    const withdrawn = await builder.post(`/api/v1/builder/applications/${appId}/withdraw`);
    expect(withdrawn.status).toBe(200);
    expect(withdrawn.body.data.status).toBe('WITHDRAWN');
    expect((await builder.post(`/api/v1/builder/applications/${appId}/withdraw`)).status).toBe(409);
  });

  it('scopes applications to their owner', async () => {
    const a = await makeBuilder();
    await createProfile(a);
    const loop = await oppDetail('loophacks-2026-ai-for-bharat');
    const appId = (await a.post('/api/v1/builder/applications').send({ opportunityId: loop.id })).body.data.id;

    const b = await makeBuilder();
    await createProfile(b);
    expect((await b.get(`/api/v1/builder/applications/${appId}`)).status).toBe(404);
    expect((await b.patch(`/api/v1/builder/applications/${appId}`).send({ answers: [] })).status).toBe(404);
  });
});

describe('applications — admin review', () => {
  it('reviews a submitted application, enforces the status machine, and notifies the builder', async () => {
    const builder = await makeBuilder();
    await createProfile(builder);
    const workshop = await oppDetail('intro-to-machine-learning-workshop');
    const q = workshop.applicationQuestions[0];

    const appId = (await builder.post('/api/v1/builder/applications').send({
      opportunityId: workshop.id,
      answers: [{ questionId: q.id, choices: [q.options[0]] }],
    })).body.data.id;
    await builder.post(`/api/v1/builder/applications/${appId}/submit`).expect(200);

    // Admin sees it under the opportunity.
    const listed = await editor.get(`/api/v1/admin/opportunities/${workshop.id}/applications`);
    expect(listed.status).toBe(200);
    expect(listed.body.data.map((a) => a.id)).toContain(appId);
    expect(listed.body.data.find((a) => a.id === appId).builder).toMatchObject({ email: expect.any(String) });

    const review = await editor.post(`/api/v1/admin/applications/${appId}/status`).send({
      status: 'UNDER_REVIEW',
      reviewerNote: 'Looks promising.',
    });
    expect(review.status).toBe(200);
    expect(review.body.data.status).toBe('UNDER_REVIEW');

    // Notification reaches the builder.
    const notifs = await builder.get('/api/v1/me/notifications');
    expect(notifs.status).toBe(200);
    expect(notifs.body.meta.unreadCount).toBeGreaterThanOrEqual(1);
    const status = notifs.body.data.find((n) => n.type === 'APPLICATION_STATUS');
    expect(status).toBeTruthy();
    expect(status.data).toMatchObject({ applicationId: appId, status: 'UNDER_REVIEW' });

    // Mark read clears the unread count.
    await builder.post(`/api/v1/me/notifications/${status.id}/read`).expect(200);

    // Legal onward transition, then a terminal state that refuses further moves.
    await editor.post(`/api/v1/admin/applications/${appId}/status`).send({ status: 'SELECTED' }).expect(200);
    const blocked = await editor.post(`/api/v1/admin/applications/${appId}/status`).send({ status: 'REJECTED' });
    expect(blocked.status).toBe(409);
  });

  it('refuses to review an application that has not been submitted', async () => {
    const builder = await makeBuilder();
    await createProfile(builder);
    const loop = await oppDetail('loophacks-2026-ai-for-bharat');
    const appId = (await builder.post('/api/v1/builder/applications').send({ opportunityId: loop.id })).body.data.id;

    const res = await editor.post(`/api/v1/admin/applications/${appId}/status`).send({ status: 'SELECTED' });
    expect(res.status).toBe(409); // DRAFT has no legal admin transition
  });
});

describe('opportunity extension', () => {
  it('exposes the new detail fields and embedded questions on public detail', async () => {
    const loop = await oppDetail('loophacks-2026-ai-for-bharat');
    expect(loop.eligibility).toEqual(expect.stringContaining('<p>'));
    expect(loop.prizeInformation).toEqual(expect.stringContaining('<p>'));
    expect(loop.applicationQuestions).toHaveLength(3);
    expect(loop.applicationQuestions[0]).toMatchObject({ id: expect.any(String), type: 'LONG_TEXT', required: true });
  });

  it('accepts the new opportunity types and round-trips questions through admin create', async () => {
    expect((await pub('/opportunities?type=job')).body.data.map((o) => o.slug)).toContain('frontend-engineer-early-careers');
    expect((await pub('/opportunities?type=workshop')).body.data.map((o) => o.type)).toContain('WORKSHOP');
    expect((await pub('/opportunities?type=program')).body.data.map((o) => o.type)).toContain('PROGRAM');

    const created = await editor.post('/api/v1/admin/opportunities').send({
      title: 'Data Engineering Bootcamp',
      organizationName: 'Sample Org',
      type: 'PROGRAM',
      mode: 'ONLINE',
      shortDescription: 'A cohort program.',
      eligibility: '<p>Open to all students.</p>',
      applicationQuestions: [
        { label: 'Why this program?', type: 'LONG_TEXT', required: true },
        { label: 'Pick a track', type: 'SINGLE_SELECT', required: true, options: ['Batch', 'Streaming'] },
      ],
    });
    expect(created.status).toBe(201);
    await editor.post(`/api/v1/admin/opportunities/${created.body.data.id}/publish`).expect(200);

    const detail = await oppDetail('data-engineering-bootcamp');
    expect(detail.eligibility).toEqual(expect.stringContaining('Open to all'));
    expect(detail.applicationQuestions.map((q) => q.type)).toEqual(['LONG_TEXT', 'SINGLE_SELECT']);
    expect(detail.applicationQuestions[1].options).toEqual(['Batch', 'Streaming']);
  });
});

describe('builder dashboard & recommendations', () => {
  it('aggregates profile, application counts, notifications and skill-ranked recommendations', async () => {
    const builder = await makeBuilder();
    const { username } = await createProfile(builder, { headline: 'Backend builder' });
    await builder.put('/api/v1/builder/profile/skills').send({
      skills: [{ slug: 'go' }, { slug: 'cloud' }, { slug: 'node-js' }],
    }).expect(200);

    const res = await builder.get('/api/v1/builder/dashboard');
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.profile).toMatchObject({ exists: true, username });
    expect(d.applications.total).toBe(0);
    expect(d.applications.byStatus.SUBMITTED).toBe(0);
    expect(Array.isArray(d.recommendations)).toBe(true);
    expect(d.recommendations.length).toBeGreaterThan(0);
    // The SDE internship shares all three skill slugs, so it ranks first.
    expect(d.recommendations[0].slug).toBe('sde-intern-platform-team');
    expect(d.notifications).toMatchObject({ unreadCount: expect.any(Number), recent: expect.any(Array) });
  });
});

