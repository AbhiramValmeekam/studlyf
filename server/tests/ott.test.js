import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext } from './helpers.js';
import { DEV_CREDENTIALS } from '../src/database/seeds/dev-seed.js';

let ctx;
let editor;
let builder;
let nova;

beforeAll(async () => {
  ctx = await createTestContext();
  [editor, builder] = await Promise.all([ctx.loginAs('editor'), ctx.loginAs('builder')]);
  // The second seeded builder shares the builder password and holds shelf progress of her own.
  nova = request.agent(ctx.app);
  const login = await nova.post('/api/v1/auth/login').send({ email: 'nova@studlyf.local', password: DEV_CREDENTIALS.builder.password });
  if (login.status !== 200) throw new Error(`login as nova failed: ${login.status}`);
});
afterAll(() => ctx.close());

const pub = (path) => request(ctx.app).get(`/api/v1${path}`);
const HIDDEN = /DRAFT|should never appear/i;

/** Published ids, read the way a client would — no privileged access needed. */
async function ids() {
  const slugs = [
    'system-design-from-nothing',
    'how-to-read-a-research-paper',
    'founders-who-shipped-it',
    'ship-your-first-full-stack-app',
  ];
  const rows = await Promise.all(slugs.map((s) => pub(`/ott/${s}`)));
  return Object.fromEntries(rows.map((r, i) => [slugs[i], r.body.data.id]));
}

describe('public STUD OTT shelf', () => {
  it('lists only published titles with pagination meta and light cards', async () => {
    const res = await pub('/ott?pageSize=50');
    expect(res.status).toBe(200);
    // The video, the article, the series and the course; the draft stays hidden.
    expect(res.body.meta.total).toBe(4);
    expect(JSON.stringify(res.body)).not.toMatch(HIDDEN);
    const card = res.body.data[0];
    expect(card).toMatchObject({
      id: expect.any(String),
      title: expect.any(String),
      slug: expect.any(String),
      kind: expect.any(String),
      summary: expect.any(String),
      episodeCount: expect.any(Number),
      skills: expect.any(Array),
    });
    // The list view is a strip: no body copy, no episode list, no playback URL.
    expect(card.description).toBeUndefined();
    expect(card.episodes).toBeUndefined();
    expect(card.sourceUrl).toBeUndefined();
  });

  it('is cacheable by browsers/CDNs', async () => {
    const res = await pub('/ott');
    expect(res.headers['cache-control']).toMatch(/public, max-age=\d+/);
    expect(res.headers.etag).toBeDefined();
  });

  it('filters by kind, category, skill and featured', async () => {
    const series = (await pub('/ott?kind=SERIES&pageSize=50')).body.data;
    expect(series.length).toBe(1);
    expect(series[0].kind).toBe('SERIES');
    expect(series[0].episodeCount).toBe(3);

    const engineering = (await pub('/ott?category=engineering&pageSize=50')).body.data;
    expect(engineering.length).toBe(2);
    expect(engineering.every((t) => t.category?.slug === 'engineering')).toBe(true);

    const withNode = (await pub('/ott?skill=node-js&pageSize=50')).body.data;
    expect(withNode.length).toBe(2);

    const featured = (await pub('/ott?featured=true&pageSize=50')).body.data;
    expect(featured.length).toBe(3);
    expect(featured.every((t) => t.featured)).toBe(true);

    // A category nobody holds filters everything out rather than being ignored.
    expect((await pub('/ott?category=nonexistent')).body.data.length).toBe(0);
  });

  it('serves a title with its episodes and playback details', async () => {
    const res = await pub('/ott/ship-your-first-full-stack-app');
    expect(res.status).toBe(200);
    const course = res.body.data;
    expect(course).toMatchObject({ kind: 'COURSE', level: 'BEGINNER', byline: 'STUDLYF Academy', episodeCount: 4 });
    expect(course.description).toMatch(/each lesson ends with something running/i);
    expect(course.episodes.map((e) => e.key)).toEqual(['the-skeleton', 'data-that-persists', 'an-api-worth-calling', 'put-it-on-the-internet']);
    expect(course.episodes[0].sourceUrl).toContain('/fullstack/1');
  });

  it('rejects an invalid filter and 404s an unknown or unpublished title', async () => {
    const bad = await pub('/ott?kind=PODCAST&pageSize=500');
    expect(bad.status).toBe(400);
    expect(bad.body.error.details.map((d) => d.field)).toEqual(expect.arrayContaining(['kind', 'pageSize']));

    expect((await pub('/ott/not-a-title')).status).toBe(404);
    expect((await pub('/ott/internal-draft-design-critiques')).status).toBe(404);
  });
});

describe("a viewer's own shelf", () => {
  it('needs a session', async () => {
    expect((await request(ctx.app).get('/api/v1/me/ott')).status).toBe(401);
  });

  it('reports what is in progress and what is finished', async () => {
    const res = await builder.get('/api/v1/me/ott');
    expect(res.status).toBe(200);
    const { continueWatching, completed, stats } = res.body.data;

    // The course is underway — one of four lessons done, stopped inside lesson two.
    expect(continueWatching.length).toBe(1);
    const course = continueWatching[0];
    expect(course).toMatchObject({ slug: 'ship-your-first-full-stack-app', episodesDone: 1, episodeCount: 4, percent: 25, completed: false });
    expect(course.episodeKey).toBe('data-that-persists');
    expect(course.episodeTitle).toBe('Data that persists');
    // The keys travel with the count so a title page can tick the right instalments.
    expect(course.completedEpisodeKeys).toEqual(['the-skeleton']);

    // The single-subject video was watched to the end.
    expect(completed.length).toBe(1);
    expect(completed[0]).toMatchObject({ slug: 'system-design-from-nothing', percent: 100, completed: true });
    expect(stats).toEqual({ inProgress: 1, completed: 1 });
  });

  it('keeps one viewer out of another viewer’s shelf', async () => {
    // Nova is watching the founders series; the sample builder has never opened it.
    const hers = (await nova.get('/api/v1/me/ott')).body.data.continueWatching.map((t) => t.slug);
    expect(hers).toContain('founders-who-shipped-it');

    const mine = (await builder.get('/api/v1/me/ott')).body.data;
    const all = [...mine.continueWatching, ...mine.completed].map((t) => t.slug);
    expect(all).not.toContain('founders-who-shipped-it');
  });

  it('records a position, finishes at 95%, and treats a later heartbeat as still finished', async () => {
    const { 'how-to-read-a-research-paper': articleId } = await ids();

    const started = await builder.put(`/api/v1/me/ott/${articleId}/progress`).send({ percent: 30, positionSeconds: 160 });
    expect(started.status).toBe(200);
    expect(started.body.data).toMatchObject({ percent: 30, completed: false, episodeKey: null });

    const shelf = (await builder.get('/api/v1/me/ott')).body.data;
    expect(shelf.continueWatching.map((t) => t.slug)).toContain('how-to-read-a-research-paper');

    const finished = await builder.put(`/api/v1/me/ott/${articleId}/progress`).send({ percent: 96 });
    expect(finished.body.data.completed).toBe(true);

    // A player that then reports only a position must not un-finish the title.
    const heartbeat = await builder.put(`/api/v1/me/ott/${articleId}/progress`).send({ positionSeconds: 520 });
    expect(heartbeat.body.data).toMatchObject({ completed: true, percent: 96, positionSeconds: 520 });

    const after = (await builder.get('/api/v1/me/ott')).body.data;
    expect(after.completed.map((t) => t.slug)).toContain('how-to-read-a-research-paper');
    expect(after.continueWatching.map((t) => t.slug)).not.toContain('how-to-read-a-research-paper');
  });

  it('requires an episode for an episodic title, and only a real one', async () => {
    const { 'founders-who-shipped-it': seriesId } = await ids();

    const unnamed = await builder.put(`/api/v1/me/ott/${seriesId}/progress`).send({ percent: 10 });
    expect(unnamed.status).toBe(400);
    expect(unnamed.body.error.details[0]).toMatchObject({ field: 'episodeKey' });

    const invented = await builder.put(`/api/v1/me/ott/${seriesId}/progress`).send({ episodeKey: 'episode-99', percent: 10 });
    expect(invented.status).toBe(400);

    const real = await builder.put(`/api/v1/me/ott/${seriesId}/progress`).send({ episodeKey: 'the-first-no', percent: 100 });
    expect(real.status).toBe(200);
    expect(real.body.data).toMatchObject({ episodeKey: 'the-first-no', completed: true });

    const shelf = (await builder.get('/api/v1/me/ott')).body.data;
    const series = shelf.continueWatching.find((t) => t.slug === 'founders-who-shipped-it');
    expect(series).toMatchObject({ episodesDone: 1, episodeCount: 3, percent: 33, episodeKey: 'the-first-user' });
    expect(series.completedEpisodeKeys).toEqual(['the-first-no']);
  });

  it('will not track progress on something nobody can watch', async () => {
    const draft = await ctx.deps.db.Ott.findOne({ slug: 'internal-draft-design-critiques' }).select({ _id: 1 }).lean();
    const res = await builder.put(`/api/v1/me/ott/${draft._id}/progress`).send({ percent: 50 });
    expect(res.status).toBe(404);
    expect((await builder.put('/api/v1/me/ott/not-an-id/progress').send({ percent: 50 })).status).toBe(400);
  });

  it('clears one episode, then the whole title, and 404s when there is nothing to clear', async () => {
    const { 'ship-your-first-full-stack-app': courseId } = await ids();

    const one = await builder.delete(`/api/v1/me/ott/${courseId}/progress?episodeKey=the-skeleton`);
    expect(one.status).toBe(200);
    expect(one.body.data).toMatchObject({ episodeKey: 'the-skeleton', cleared: 1 });
    // With the first lesson un-done the course restarts from it.
    const back = (await builder.get('/api/v1/me/ott')).body.data.continueWatching.find((t) => t.slug === 'ship-your-first-full-stack-app');
    expect(back).toMatchObject({ episodesDone: 0, percent: 0, episodeKey: 'the-skeleton' });

    const all = await builder.delete(`/api/v1/me/ott/${courseId}/progress`);
    expect(all.body.data.cleared).toBe(1);
    const shelf = (await builder.get('/api/v1/me/ott')).body.data;
    expect([...shelf.continueWatching, ...shelf.completed].map((t) => t.slug)).not.toContain('ship-your-first-full-stack-app');

    expect((await builder.delete(`/api/v1/me/ott/${courseId}/progress`)).status).toBe(404);
  });
});

describe('admin OTT authoring', () => {
  const draft = {
    title: 'Internal Notes On Debugging',
    kind: 'VIDEO',
    summary: 'A short talk on reading a stack trace.',
    byline: 'STUDLYF Sessions',
    durationMinutes: 18,
    sourceUrl: 'https://example.com/ott/debugging',
  };

  it('creates a draft, publishes it onto the shelf, then removes it', async () => {
    const created = await editor.post('/api/v1/admin/ott').send(draft);
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ slug: 'internal-notes-on-debugging', status: 'DRAFT', kind: 'VIDEO' });
    const { id } = created.body.data;
    expect((await pub('/ott/internal-notes-on-debugging')).status).toBe(404);

    await editor.post(`/api/v1/admin/ott/${id}/publish`).send({});
    const live = await pub('/ott/internal-notes-on-debugging');
    expect(live.status).toBe(200);
    expect(live.body.data).toMatchObject({ kind: 'VIDEO', byline: 'STUDLYF Sessions', sourceUrl: 'https://example.com/ott/debugging' });

    await editor.delete(`/api/v1/admin/ott/${id}`);
    expect((await pub('/ott/internal-notes-on-debugging')).status).toBe(404);
  });

  it('insists an episodic title actually has episodes', async () => {
    const noEpisodes = await editor.post('/api/v1/admin/ott').send({ ...draft, title: 'Episode-less Series', kind: 'SERIES' });
    expect(noEpisodes.status).toBe(400);
    expect(noEpisodes.body.error.details[0].message).toMatch(/at least one episode/i);

    const dupes = await editor.post('/api/v1/admin/ott').send({
      ...draft,
      title: 'Repeated Keys',
      kind: 'COURSE',
      episodes: [{ key: 'intro', title: 'Intro' }, { key: 'intro', title: 'Intro again' }],
    });
    expect(dupes.status).toBe(400);
    expect(dupes.body.error.details[0].message).toMatch(/unique/i);

    const missingSummary = await editor.post('/api/v1/admin/ott').send({ title: 'Bare Title', kind: 'VIDEO' });
    expect(missingSummary.status).toBe(400);
    expect(missingSummary.body.error.details.map((d) => d.field)).toContain('summary');
  });

  it('rejects an unknown category and an unknown kind', async () => {
    const noSuchCategory = await editor.post('/api/v1/admin/ott').send({ ...draft, title: 'Bad Category', categoryId: '507f1f77bcf86cd799439011' });
    expect(noSuchCategory.status).toBe(400);
    expect(noSuchCategory.body.error.details[0].field).toBe('categoryId');

    const noSuchKind = await editor.post('/api/v1/admin/ott').send({ ...draft, title: 'Bad Kind', kind: 'PODCAST' });
    expect(noSuchKind.status).toBe(400);
  });

  it('will not let a stranger write the shelf', async () => {
    expect((await request(ctx.app).post('/api/v1/admin/ott').send(draft)).status).toBe(401);
    expect((await builder.post('/api/v1/admin/ott').send(draft)).status).toBe(403);
    expect((await pub('/admin/ott')).status).toBe(401);
  });
});
