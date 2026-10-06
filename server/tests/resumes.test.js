import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext, uniqueEmail } from './helpers.js';

let ctx;

beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());

/** Register a fresh account and return an authenticated agent. */
async function makeUser() {
  const agent = request.agent(ctx.app);
  await agent.post('/api/v1/auth/register').send({ name: 'Resume User', email: uniqueEmail('resume'), password: 'goodpass123' }).expect(201);
  return agent;
}

const sample = {
  title: 'Backend Engineer',
  fullName: 'Ada Lovelace',
  headline: 'Systems & distributed backends',
  email: 'ada@example.com',
  phone: '+1 555 0100',
  location: 'London, UK',
  links: { github: 'https://github.com/ada', linkedin: 'https://linkedin.com/in/ada' },
  summary: 'Backend engineer with a love for correctness.',
  experience: [{ company: 'Analytical Engines', role: 'Engineer', startDate: '2024', current: true, description: 'Built things.' }],
  education: [{ school: 'Cambridge', program: 'Mathematics', year: '1842' }],
  projects: [{ name: 'Note G', description: 'First algorithm', url: 'https://example.com/g', skills: ['Math'] }],
  skills: ['Go', 'Postgres'],
  certifications: [{ name: 'CKA', issuer: 'CNCF', year: '2025' }],
};

describe('resumes — auth', () => {
  it('rejects unauthenticated access', async () => {
    await request(ctx.app).get('/api/v1/me/resumes').expect(401);
    await request(ctx.app).post('/api/v1/me/resumes').send(sample).expect(401);
  });
});

describe('resumes — CRUD', () => {
  it('creates, lists (summary), reads (full), updates and deletes', async () => {
    const user = await makeUser();

    const create = await user.post('/api/v1/me/resumes').send(sample);
    expect(create.status, JSON.stringify(create.body)).toBe(201);
    const id = create.body.data.id;
    expect(create.body.data).toMatchObject({ title: 'Backend Engineer', skills: ['Go', 'Postgres'] });
    expect(create.body.data.links.github).toBe('https://github.com/ada');
    expect(create.body.data.links.portfolio).toBeNull();

    const list = await user.get('/api/v1/me/resumes');
    expect(list.status).toBe(200);
    expect(list.body.meta.total).toBe(1);
    // List is a light summary — no heavy sections.
    expect(list.body.data[0]).toMatchObject({ id, title: 'Backend Engineer', headline: 'Systems & distributed backends' });
    expect(list.body.data[0].experience).toBeUndefined();
    expect(list.body.data[0].skills).toBeUndefined();

    const get = await user.get(`/api/v1/me/resumes/${id}`);
    expect(get.status).toBe(200);
    expect(get.body.data.experience).toHaveLength(1);
    expect(get.body.data.certifications[0]).toMatchObject({ name: 'CKA', issuer: 'CNCF' });

    const patch = await user.patch(`/api/v1/me/resumes/${id}`).send({ title: 'Staff Engineer', skills: ['Rust'] });
    expect(patch.status).toBe(200);
    expect(patch.body.data).toMatchObject({ title: 'Staff Engineer', skills: ['Rust'] });

    const del = await user.delete(`/api/v1/me/resumes/${id}`);
    expect(del.status).toBe(200);
    expect(del.body.data).toEqual({ id });

    await user.get(`/api/v1/me/resumes/${id}`).expect(404);
  });

  it('paginates a users own resumes newest-first', async () => {
    const user = await makeUser();
    await user.post('/api/v1/me/resumes').send({ title: 'One' }).expect(201);
    await user.post('/api/v1/me/resumes').send({ title: 'Two' }).expect(201);
    const list = await user.get('/api/v1/me/resumes?pageSize=1');
    expect(list.body.meta.total).toBe(2);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].title).toBe('Two');
  });
});

describe('resumes — ownership isolation', () => {
  it('never exposes or mutates another users resume (404, not 403 — existence is hidden)', async () => {
    const alice = await makeUser();
    const bob = await makeUser();

    const created = await alice.post('/api/v1/me/resumes').send(sample);
    const id = created.body.data.id;

    await bob.get(`/api/v1/me/resumes/${id}`).expect(404);
    await bob.patch(`/api/v1/me/resumes/${id}`).send({ title: 'Hijacked' }).expect(404);
    await bob.delete(`/api/v1/me/resumes/${id}`).expect(404);

    // Bob's list must not include Alice's resume.
    const bobList = await bob.get('/api/v1/me/resumes');
    expect(bobList.body.meta.total).toBe(0);

    // Alice's resume is untouched.
    const still = await alice.get(`/api/v1/me/resumes/${id}`);
    expect(still.status).toBe(200);
    expect(still.body.data.title).toBe('Backend Engineer');
  });
});

describe('resumes — validation', () => {
  it('requires a title on create', async () => {
    const user = await makeUser();
    await user.post('/api/v1/me/resumes').send({ fullName: 'No Title' }).expect(400);
  });

  it('rejects unknown fields (strict)', async () => {
    const user = await makeUser();
    await user.post('/api/v1/me/resumes').send({ title: 'X', bogus: true }).expect(400);
  });

  it('rejects a non-http link', async () => {
    const user = await makeUser();
    await user.post('/api/v1/me/resumes').send({ title: 'X', links: { github: 'ftp://nope' } }).expect(400);
  });

  it('rejects an empty title on update', async () => {
    const user = await makeUser();
    const created = await user.post('/api/v1/me/resumes').send({ title: 'Keeper' });
    await user.patch(`/api/v1/me/resumes/${created.body.data.id}`).send({ title: '' }).expect(400);
  });
});
