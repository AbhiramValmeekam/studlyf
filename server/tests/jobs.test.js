import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext, uniqueEmail } from './helpers.js';

let ctx;
let hr;
let admin;

beforeAll(async () => {
  ctx = await createTestContext();
  hr = await ctx.loginAs('hr');
  admin = await ctx.loginAs('superAdmin');
});
afterAll(() => ctx.close());

const newJob = (over = {}) => ({
  title: `Backend Engineer ${Math.random().toString(36).slice(2, 8)}`,
  summary: 'Own APIs and data models for a platform used by students across the country.',
  employmentType: 'FULL_TIME',
  workMode: 'REMOTE',
  experienceLevel: 'MID',
  location: 'Remote (India)',
  skills: ['Node.js', 'MongoDB'],
  description: '<p>Design and ship the services behind our application flows.</p>',
  responsibilities: '<p>Design REST APIs and model data in MongoDB.</p>',
  requirements: '<p>Two or more years writing Node.js in production.</p>',
  perks: ['Fully remote', 'Learning budget'],
  contactEmail: 'talent@northwind.example.com',
  ...over,
});

/** Create then publish, so the job is on the public board. */
async function publishJob(over = {}) {
  const res = await hr.post('/api/v1/hr/jobs').send(newJob(over));
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  await hr.post(`/api/v1/hr/jobs/${res.body.data.id}/publish`).expect(200);
  return res.body.data;
}

/** A second, freshly verified HR account — for the ownership checks. */
async function makeVerifiedHr() {
  const agent = request.agent(ctx.app);
  await agent
    .post('/api/v1/auth/register')
    .send({ name: 'Second Recruiter', email: uniqueEmail('hr2'), password: 'goodpass123' })
    .expect(201);
  const email = `talent.${Date.now()}@rival.example`;
  await agent
    .put('/api/v1/hr/access-request')
    .send({ companyName: 'Rival Labs', designation: 'Talent Lead', workEmail: email })
    .expect(201);
  const queue = await admin.get('/api/v1/admin/access-requests?ecosystem=HR&status=PENDING');
  const mine = queue.body.data.find((r) => r.details?.workEmail === email);
  expect(mine, JSON.stringify(queue.body)).toBeTruthy();
  await admin.post(`/api/v1/admin/access-requests/HR/${mine.id}/status`).send({ status: 'ACTIVE' }).expect(200);
  return agent;
}

describe('jobs — public board', () => {
  let frontend;

  beforeAll(async () => {
    frontend = await publishJob({
      title: 'Frontend Engineer Intern',
      employmentType: 'INTERNSHIP',
      workMode: 'HYBRID',
      experienceLevel: 'ENTRY',
      salaryMin: 25000,
      salaryMax: 35000,
      salaryCurrency: 'INR',
      salaryPeriod: 'MONTH',
      rounds: [
        { title: 'Portfolio review', description: 'We read your work first.', mode: 'ONLINE' },
        { title: 'Team conversation', description: 'Meet the engineers.', mode: 'ONLINE' },
      ],
      faqs: [{ question: 'Is the internship paid?', answer: '<p>Yes — a monthly stipend.</p>' }],
    });
  });

  it('lists published jobs without authentication and never leaks internals', async () => {
    const res = await request(ctx.app).get('/api/v1/jobs');
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, total: expect.any(Number) });
    const card = res.body.data.find((j) => j.slug === frontend.slug);
    expect(card).toMatchObject({
      id: expect.any(String),
      title: 'Frontend Engineer Intern',
      company: { name: 'Loopwise', verified: true },
      employmentType: 'INTERNSHIP',
      workMode: 'HYBRID',
      salary: { disclosed: true, min: 25000, max: 35000, currency: 'INR', period: 'MONTH' },
    });
    // The card shape is the list shape — detail-only blocks and every internal field stay behind.
    expect(card.description).toBeUndefined();
    expect(card.status).toBeUndefined();
    expect(card.hrUserId).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/searchTerms|titleTerms|hrProfileId|createdBy/);
  });

  it('returns the structured detail blocks on the slug page', async () => {
    const res = await request(ctx.app).get(`/api/v1/jobs/${frontend.slug}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      title: 'Frontend Engineer Intern',
      contactEmail: 'talent@northwind.example.com',
      salary: { disclosed: true, min: 25000 },
    });
    expect(res.body.data.rounds).toHaveLength(2);
    expect(res.body.data.faqs).toHaveLength(1);
    expect(res.body.data.perks.length).toBeGreaterThan(0);
    expect(res.body.data.responsibilities).toMatch(/^<p>/);
    expect(res.body.data.status).toBeUndefined();
  });

  it('filters by the job-specific facets', async () => {
    const res = await request(ctx.app).get('/api/v1/jobs?employmentType=INTERNSHIP&workMode=HYBRID');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const j of res.body.data) {
      expect(j.employmentType).toBe('INTERNSHIP');
      expect(j.workMode).toBe('HYBRID');
    }
  });

  it('404s an unknown slug', async () => {
    expect((await request(ctx.app).get('/api/v1/jobs/no-such-job-here')).status).toBe(404);
  });
});

describe('jobs — HR authoring', () => {
  it('refuses a non-HR account', async () => {
    const builder = await ctx.loginAs('builder');
    expect((await builder.get('/api/v1/hr/jobs')).status).toBe(403);
    expect((await builder.post('/api/v1/hr/jobs').send(newJob())).status).toBe(403);
  });

  it('creates a draft that is not publicly visible until it is published', async () => {
    const payload = newJob({ title: 'Draft Only Role' });
    const res = await hr.post('/api/v1/hr/jobs').send(payload);
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const job = res.body.data;
    expect(job).toMatchObject({ status: 'DRAFT', company: { name: 'Loopwise' }, pipelineCount: 0 });

    expect((await request(ctx.app).get(`/api/v1/jobs/${job.slug}`)).status).toBe(404);
    const board = await request(ctx.app).get('/api/v1/jobs?q=Draft%20Only%20Role');
    expect(board.body.data).toHaveLength(0);

    const published = await hr.post(`/api/v1/hr/jobs/${job.id}/publish`);
    expect(published.status).toBe(200);
    expect(published.body.data.status).toBe('PUBLISHED');

    const live = await request(ctx.app).get(`/api/v1/jobs/${job.slug}`);
    expect(live.status).toBe(200);
    expect(live.body.data.title).toBe(payload.title);

    // Unpublishing hides it again.
    await hr.post(`/api/v1/hr/jobs/${job.id}/unpublish`).expect(200);
    expect((await request(ctx.app).get(`/api/v1/jobs/${job.slug}`)).status).toBe(404);
  });

  it('sanitizes rich text and rejects an inverted salary range', async () => {
    const res = await hr
      .post('/api/v1/hr/jobs')
      .send(newJob({ description: '<p>Safe</p><script>alert(1)</script>' }))
      .expect(201);
    expect(res.body.data.description).toContain('<p>Safe</p>');
    expect(res.body.data.description).not.toContain('<script');

    const bad = await hr.post('/api/v1/hr/jobs').send(newJob({ salaryMin: 900, salaryMax: 100 }));
    expect(bad.status).toBe(400);
    expect(JSON.stringify(bad.body)).toMatch(/salaryMax/);
  });

  it('masks an undisclosed salary on the public page but keeps it for the owner', async () => {
    const res = await hr
      .post('/api/v1/hr/jobs')
      .send(newJob({ salaryDisclosed: false, salaryMin: 500000, salaryMax: 900000, salaryCurrency: 'INR', salaryPeriod: 'YEAR' }))
      .expect(201);
    const job = res.body.data;
    await hr.post(`/api/v1/hr/jobs/${job.id}/publish`).expect(200);

    const live = await request(ctx.app).get(`/api/v1/jobs/${job.slug}`);
    expect(live.body.data.salary).toEqual({ disclosed: false, min: null, max: null, currency: 'INR', period: 'YEAR' });

    const own = await hr.get(`/api/v1/hr/jobs/${job.id}`);
    expect(own.body.data.salary).toMatchObject({ min: 500000, max: 900000 });
  });

  it('keeps one HR account’s posts out of another’s reach', async () => {
    const other = await makeVerifiedHr();
    const created = await hr.post('/api/v1/hr/jobs').send(newJob());
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    const job = created.body.data;

    expect((await other.get(`/api/v1/hr/jobs/${job.id}`)).status).toBe(404);
    expect((await other.post(`/api/v1/hr/jobs/${job.id}/publish`)).status).toBe(404);
    expect((await other.delete(`/api/v1/hr/jobs/${job.id}`)).status).toBe(404);
    const theirList = await other.get('/api/v1/hr/jobs');
    expect(theirList.body.data.every((j) => j.id !== job.id)).toBe(true);
    // An empty list would satisfy `every` vacuously and hide a broken owner filter, so the count
    // must agree with the rows: `pagedList` aggregates, and an aggregation skips Mongoose casting.
    expect(theirList.body.data).toHaveLength(theirList.body.meta.total);

    // The owner can still delete it.
    expect((await hr.delete(`/api/v1/hr/jobs/${job.id}`)).status).toBe(200);
    expect((await hr.get(`/api/v1/hr/jobs/${job.id}`)).status).toBe(404);
  });

  it('lists the owner’s own posts, with rows that agree with the count', async () => {
    const created = await hr.post('/api/v1/hr/jobs').send(newJob({ title: 'Listed Role' }));
    expect(created.status, JSON.stringify(created.body)).toBe(201);

    const list = await hr.get('/api/v1/hr/jobs?pageSize=50');
    expect(list.status).toBe(200);
    expect(list.body.meta.total).toBe(list.body.data.length);
    const mine = list.body.data.find((j) => j.id === created.body.data.id);
    expect(mine, JSON.stringify(list.body)).toBeTruthy();
    // The row carries what the list page renders, including the private pipeline count.
    expect(mine).toMatchObject({ title: 'Listed Role', status: 'DRAFT', company: { name: 'Loopwise' } });
    expect(mine.pipelineCount).toBe(0);

    // Filtering by publication status is what the Jobs page's chips drive.
    const drafts = await hr.get('/api/v1/hr/jobs?status=DRAFT&pageSize=50');
    expect(drafts.body.data.every((j) => j.status === 'DRAFT')).toBe(true);
    expect(drafts.body.data.find((j) => j.id === created.body.data.id)).toBeTruthy();
    const published = await hr.get('/api/v1/hr/jobs?status=PUBLISHED&pageSize=50');
    expect(published.body.data.some((j) => j.id === created.body.data.id)).toBe(false);

    await hr.delete(`/api/v1/hr/jobs/${created.body.data.id}`).expect(200);
  });

  it('ties a shortlist to a job post, so the pipeline counts against it', async () => {
    const created = await hr.post('/api/v1/hr/jobs').send(newJob({ title: 'Pipeline Role' }));
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    const job = created.body.data;

    // The dev seed already puts the sample builder in the HR account's talent pool, and the
    // pipeline holds one row per builder — free it so the add below starts from a clean slate.
    const existing = await hr.get('/api/v1/hr/candidates?pageSize=50');
    const prior = existing.body.data.find((c) => c.builder.username === 'sample-builder');
    if (prior) await hr.delete(`/api/v1/hr/candidates/${prior.id}`).expect(200);

    const added = await hr.post('/api/v1/hr/candidates').send({ username: 'sample-builder', jobId: job.id });
    expect(added.status, JSON.stringify(added.body)).toBe(201);
    // The role label comes from the job title rather than from the caller — one pipeline, one
    // front door (§96), not a second application model.
    expect(added.body.data).toMatchObject({ role: 'Pipeline Role', job: { id: job.id, title: 'Pipeline Role' } });

    const list = await hr.get('/api/v1/hr/jobs?pageSize=50');
    expect(list.body.data.find((j) => j.id === job.id).pipelineCount).toBe(1);

    // Another HR account's job id is a 404 here, exactly as it is on every other job read.
    const other = await makeVerifiedHr();
    expect((await other.post('/api/v1/hr/candidates').send({ username: 'sample-builder', jobId: job.id })).status).toBe(404);

    await hr.delete(`/api/v1/hr/candidates/${added.body.data.id}`).expect(200);
    await hr.delete(`/api/v1/hr/jobs/${job.id}`).expect(200);
  });
});
