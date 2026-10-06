import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext } from './helpers.js';

let ctx;
let editor;
beforeAll(async () => {
  ctx = await createTestContext();
  editor = await ctx.loginAs('editor');
});
afterAll(() => ctx.close());

const pub = (path) => request(ctx.app).get(`/api/v1${path}`);

describe('NoSQL operator injection', () => {
  it('rejects query operators smuggled into JSON bodies', async () => {
    for (const body of [
      { email: { $gt: '' }, password: 'x' },
      { email: 'builder@studlyf.local', password: { $ne: null } },
    ]) {
      const res = await request(ctx.app).post('/api/v1/auth/login').send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
    const token = await request(ctx.app).post('/api/v1/auth/verify-email').send({ token: { $regex: '.*' } });
    expect(token.status).toBe(400);
  });

  it('treats bracketed query-string keys as plain text, never operators', async () => {
    const res = await pub('/opportunities?category[$ne]=x&status[$exists]=true');
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(9); // filters ignored, drafts still hidden
    expect((await pub('/opportunities/%7B%22%24ne%22%3Anull%7D')).status).toBe(404);
  });

  it('rejects malformed ObjectIds with a field error', async () => {
    const res = await editor.get('/api/v1/admin/opportunities/not-an-id');
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('id');
  });
});

describe('indexes created by migrate()', () => {
  const indexes = async (collection) =>
    await ctx.deps.db.connection.db.collection(collection).indexes();

  it('enforces uniqueness at the database level', async () => {
    expect((await indexes('users')).find((i) => i.key.email)?.unique).toBe(true);
    expect((await indexes('opportunities')).find((i) => i.key.slug)?.unique).toBe(true);
    expect((await indexes('categories')).find((i) => i.key.scope && i.key.slug)?.unique).toBe(true);
    await expect(
      ctx.deps.db.User.create({ name: 'Dup', email: 'builder@studlyf.local', passwordHash: 'x' }),
    ).rejects.toMatchObject({ code: 11000 });
  });

  it('expires sessions and auth tokens via TTL indexes', async () => {
    expect((await indexes('sessions')).find((i) => i.key.expiresAt)?.expireAfterSeconds).toBe(0);
    expect((await indexes('auth_tokens')).find((i) => i.key.expiresAt)?.expireAfterSeconds).toBe(0);
  });

  it('never stores or returns password hashes by default', async () => {
    const user = await ctx.deps.db.User.findOne({ email: 'builder@studlyf.local' }).lean();
    expect(user).not.toHaveProperty('passwordHash');
  });

  it('records applied data migrations once', async () => {
    const again = await (await import('../src/database/migrations/runner.js')).runMigrations(ctx.deps.db);
    expect(again).toEqual([]);
  });
});

describe('reference integrity without foreign keys', () => {
  it('deleting a category detaches it from content', async () => {
    const cat = await editor.post('/api/v1/admin/categories').send({ scope: 'RESOURCE', name: 'Temp Category' });
    const created = await editor.post('/api/v1/admin/resources').send({
      title: 'Categorised Piece', type: 'ARTICLE', description: 'd', categoryId: cat.body.data.id, status: 'PUBLISHED',
    });
    expect(created.body.data.category.slug).toBe('temp-category');

    await editor.delete(`/api/v1/admin/categories/${cat.body.data.id}`).expect(200);
    const after = await pub('/resources/categorised-piece');
    expect(after.body.data.category).toBeNull();
  });

  it('deleting a tag removes it from every document embedding it', async () => {
    const tags = (await editor.get('/api/v1/admin/tags?q=figma')).body.data;
    await editor.delete(`/api/v1/admin/tags/${tags[0].id}`).expect(200);
    const opp = (await pub('/opportunities/design-sprint-challenge-campus-commute')).body.data;
    expect(opp.skills.map((s) => s.slug)).toEqual(['ui-ux']);
  });

  it('deleting media clears references so pages render without broken images', async () => {
    const media = await editor.post('/api/v1/admin/media/external').send({ url: 'https://example.com/logo.png', mimeType: 'image/png', purpose: 'LOGO' });
    const partner = await editor.post('/api/v1/admin/partners').send({ name: 'Logo Partner', logoId: media.body.data.id, active: true });
    expect(partner.body.data.logo.url).toBe('https://example.com/logo.png');

    await editor.delete(`/api/v1/admin/media/${media.body.data.id}`).expect(200);
    const stored = await ctx.deps.db.Partner.findById(partner.body.data.id).lean();
    expect(stored.logoId).toBeNull();
  });
});

describe('search terms stay in sync with content', () => {
  it('re-indexes search words when an opportunity is edited', async () => {
    const list = (await editor.get('/api/v1/admin/opportunities?type=internship')).body.data;
    expect((await pub('/search?q=xylophone')).body.data.opportunities.total).toBe(0);
    await editor.patch(`/api/v1/admin/opportunities/${list[0].id}`).send({ title: 'Xylophone Platform Intern', skills: ['Kubernetes'] }).expect(200);

    const byTitle = (await pub('/search?q=xylo')).body.data.opportunities.items;
    expect(byTitle.map((o) => o.title)).toEqual(['Xylophone Platform Intern']);
    expect((await pub('/search?q=kube')).body.data.opportunities.total).toBe(1);
    // old skill words are gone from the index
    expect((await pub('/opportunities?skill=go')).body.meta.total).toBe(0);
  });

  it('ranks title matches above body-only matches', async () => {
    const make = (title, description, publishedAt) =>
      editor.post('/api/v1/admin/resources').send({ title, type: 'ARTICLE', description, status: 'PUBLISHED', publishedAt }).expect(201);
    await make('Zeppelin Engineering Basics', 'Title match, published earlier.', '2026-01-01T00:00:00Z');
    await make('Airships Overview', 'Mentions zeppelin only in the body, published later.', '2026-02-01T00:00:00Z');

    const items = (await pub('/resources?q=zeppelin')).body.data.map((r) => r.title);
    expect(items).toEqual(['Zeppelin Engineering Basics', 'Airships Overview']); // newest-first would invert this
    const newest = (await pub('/resources?q=zeppelin&sort=newest')).body.data.map((r) => r.title);
    expect(newest).toEqual(['Airships Overview', 'Zeppelin Engineering Basics']);
  });
});
