import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext } from './helpers.js';

let ctx;
let builder;
let editor;
let investor;

beforeAll(async () => {
  ctx = await createTestContext();
  [builder, editor, investor] = await Promise.all([ctx.loginAs('builder'), ctx.loginAs('editor'), ctx.loginAs('investor')]);
});
afterAll(() => ctx.close());

const pub = (path) => request(ctx.app).get(`/api/v1${path}`);

async function idOfSlug(path, slug) {
  return (await pub(`${path}/${slug}`)).body.data.id;
}

describe('cross-ecosystem search (§56)', () => {
  it('finds every public builder, and never a private profile', async () => {
    const res = await pub('/search?q=&scope=builders');
    expect(res.status).toBe(200);
    const items = res.body.data.builders.items;
    // Exactly the two PUBLIC profiles — `zephyr` is seeded PRIVATE and must stay out of
    // discovery whatever the query, so an exact match is the assertion, not a substring check.
    expect(items.map((b) => b.username).sort()).toEqual(['nova', 'sample-builder']);
    // The card is a card: a username and a headline, not the profile document.
    for (const b of items) {
      expect(b).toMatchObject({ username: expect.any(String), skills: expect.any(Array) });
      expect(b.bio).toBeUndefined();
      expect(b.userId).toBeUndefined();
    }
  });

  it('finds a startup by its name and links it to its public page', async () => {
    const res = await pub('/search?q=soilsense&scope=founders');
    const [startup] = res.body.data.founders.items;
    expect(startup.startup.name).toBe('SoilSense');
    expect(startup.slug).toBe('soilsense');
    // The public card carries no workspace, traction numbers or contact details.
    expect(startup.workspace).toBeUndefined();
    expect(startup.founder).toBeUndefined();
  });

  it('finds verified organizations by name, and publishes no contact email', async () => {
    const res = await pub('/search?q=campus%20builders&scope=organizations');
    const [org] = res.body.data.organizations.items;
    expect(org).toMatchObject({ slug: 'campus-builders-collective', type: 'COMMUNITY', city: 'Bengaluru' });
    expect(org.contactEmail).toBeUndefined();
  });

  it('finds exactly the discoverable projects, and nothing else', async () => {
    const res = await pub('/search?q=&scope=projects&pageSize=50');
    expect(res.status).toBe(200);
    const items = res.body.data.projects.items;
    expect(items.length).toBeGreaterThan(0);

    // The scope is the community feed's own discovery rule, so it must agree with the DB exactly:
    // every discoverable project, and no private, unlisted, archived or moderated one.
    const visible = await ctx.deps.db.Project.find({ visibility: 'PUBLIC', publishedAt: { $ne: null } })
      .select({ slug: 1 })
      .lean();
    const expected = visible.map((p) => p.slug).sort();
    expect(items.map((p) => p.slug).sort()).toEqual(expected);
    expect(res.body.data.projects.total).toBe(expected.length);
    expect(items.every((p) => p.title)).toBe(true);
  });

  it('hands every result the id a bookmark needs, and never the raw document', async () => {
    const probes = [
      ['builders', ''],
      ['founders', 'soilsense'],
      ['organizations', 'campus builders'],
      ['projects', ''],
    ];
    for (const [scope, q] of probes) {
      const res = await pub(`/search?q=${encodeURIComponent(q)}&scope=${scope}`);
      expect(res.status).toBe(200);
      const items = res.body.data[scope].items;
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) expect(item.id).toMatch(/^[a-f0-9]{24}$/);
    }
  });

  it('answers every scope at once under "all", and reports which ones matched', async () => {
    const res = await pub('/search?q=a&scope=all');
    expect(res.status).toBe(200);
    const keys = ['opportunities', 'resources', 'builders', 'founders', 'organizations', 'projects'];
    for (const k of keys) expect(res.body.data[k]).toMatchObject({ items: expect.any(Array), total: expect.any(Number) });
    expect(res.body.meta.scopes).toEqual(expect.arrayContaining(['opportunities']));
    expect(res.body.meta.total).toBe(keys.reduce((n, k) => n + res.body.data[k].total, 0));
  });

  it('a type filter keeps the entity scopes out of the way', async () => {
    const res = await pub('/search?q=a&type=GUIDE');
    expect(res.body.data.builders.total).toBe(0);
    expect(res.body.data.founders.total).toBe(0);
    expect(res.body.data.resources.items.every((r) => r.type === 'GUIDE')).toBe(true);
  });

  it('rejects an unknown scope', async () => {
    expect((await pub('/search?q=a&scope=aliens')).status).toBe(400);
  });
});

describe('saved items (§57)', () => {
  const save = (agent, body) => agent.post('/api/v1/me/saved').send(body);
  const unsave = (agent, query) => agent.delete(`/api/v1/me/saved?${new URLSearchParams(query)}`);

  it('needs a session', async () => {
    expect((await request(ctx.app).get('/api/v1/me/saved')).status).toBe(401);
    expect((await request(ctx.app).post('/api/v1/me/saved').send({ entityType: 'OPPORTUNITY', entityId: '507f1f77bcf86cd799439011' })).status).toBe(401);
  });

  it('saves an opportunity and lists it with a real link', async () => {
    const opportunityId = await idOfSlug('/opportunities', 'frontend-engineer-early-careers');
    const created = await save(builder, { entityType: 'OPPORTUNITY', entityId: opportunityId });
    expect(created.status).toBe(201);
    expect(created.body.data).toEqual({ entityType: 'OPPORTUNITY', entityId: opportunityId, saved: true });

    const list = await builder.get('/api/v1/me/saved');
    const row = list.body.data.find((r) => r.entityId === opportunityId);
    expect(row).toMatchObject({ entityType: 'OPPORTUNITY', href: '/opportunities/frontend-engineer-early-careers' });
    expect(row.item.title).toBeTruthy();
    expect(list.body.meta.counts.OPPORTUNITY).toBeGreaterThanOrEqual(1);
  });

  it('saving twice is one row, and unsaving twice is not an error', async () => {
    const opportunityId = await idOfSlug('/opportunities', 'loophacks-2026-ai-for-bharat');
    await save(builder, { entityType: 'OPPORTUNITY', entityId: opportunityId });
    expect((await save(builder, { entityType: 'OPPORTUNITY', entityId: opportunityId })).status).toBe(201);

    const mine = () => ctx.deps.db.SavedItem.countDocuments({ entityType: 'OPPORTUNITY', entityId: opportunityId });
    expect(await mine()).toBe(1);

    expect((await unsave(builder, { entityType: 'OPPORTUNITY', entityId: opportunityId })).body.data).toMatchObject({ saved: false, removed: 1 });
    const again = await unsave(builder, { entityType: 'OPPORTUNITY', entityId: opportunityId });
    expect(again.status).toBe(200);
    expect(again.body.data.removed).toBe(0);
  });

  it('will not save something nobody can see', async () => {
    const draft = await ctx.deps.db.Opportunity.findOne({ status: 'DRAFT' }).select({ _id: 1 }).lean();
    expect((await save(builder, { entityType: 'OPPORTUNITY', entityId: String(draft._id) })).status).toBe(404);
    // A well-formed id that exists nowhere in the collection.
    expect((await save(builder, { entityType: 'OPPORTUNITY', entityId: '507f1f77bcf86cd799439011' })).status).toBe(404);
  });

  it('rejects an unknown type or a malformed id', async () => {
    const unknown = await save(builder, { entityType: 'ALIEN', entityId: '507f1f77bcf86cd799439011' });
    expect(unknown.status).toBe(400);
    expect((await save(builder, { entityType: 'OPPORTUNITY', entityId: 'not-an-id' })).status).toBe(400);
    expect((await save(builder, { entityType: 'OPPORTUNITY', entityId: '507f1f77bcf86cd799439011', extra: 1 })).status).toBe(400);
  });

  it('keeps one user out of another user’s list', async () => {
    const opportunityId = await idOfSlug('/opportunities', 'sde-intern-platform-team');
    await save(builder, { entityType: 'OPPORTUNITY', entityId: opportunityId });

    const theirs = await investor.get('/api/v1/me/saved');
    expect(theirs.body.data.map((r) => r.entityId)).not.toContain(opportunityId);
  });

  it('drops a saved item from the list when its target stops being publishable', async () => {
    const id = (await editor.post('/api/v1/admin/ott').send({
      title: 'Saved Then Pulled',
      kind: 'VIDEO',
      summary: 'A talk that gets unpublished.',
      sourceUrl: 'https://example.com/ott/pulled',
    })).body.data.id;
    await editor.post(`/api/v1/admin/ott/${id}/publish`).send({});

    await save(builder, { entityType: 'OTT', entityId: id });
    const before = await builder.get('/api/v1/me/saved?entityType=OTT');
    expect(before.body.data.map((r) => r.entityId)).toContain(id);

    await editor.post(`/api/v1/admin/ott/${id}/unpublish`).send({});
    const after = await builder.get('/api/v1/me/saved?entityType=OTT');
    expect(after.body.data.map((r) => r.entityId)).not.toContain(id);
    // The row survives, so republishing brings it back rather than losing the bookmark.
    expect(await ctx.deps.db.SavedItem.countDocuments({ entityId: id })).toBe(1);

    await editor.post(`/api/v1/admin/ott/${id}/publish`).send({});
    expect((await builder.get('/api/v1/me/saved?entityType=OTT')).body.data.map((r) => r.entityId)).toContain(id);
    await editor.delete(`/api/v1/admin/ott/${id}`);
  });

  it('filters by entity type and paginates', async () => {
    const onlyOtt = await builder.get('/api/v1/me/saved?entityType=OTT&pageSize=5');
    expect(onlyOtt.body.meta.pageSize).toBe(5);
    expect(onlyOtt.body.data.every((r) => r.entityType === 'OTT')).toBe(true);
    expect((await builder.get('/api/v1/me/saved?entityType=ALIEN')).status).toBe(400);
  });

  it('is one mechanism: the investor shortlist is the same table', async () => {
    const founder = await ctx.deps.db.FounderProfile.findOne({ discoverable: true, onboardingCompletedAt: { $ne: null } })
      .select({ _id: 1 })
      .lean();
    await investor.put(`/api/v1/investor/saved/${founder._id}`).expect(200);

    const rows = await ctx.deps.db.SavedItem.find({ entityType: 'FOUNDER', entityId: founder._id }).lean();
    expect(rows).toHaveLength(1);

    const mine = await investor.get('/api/v1/me/saved?entityType=FOUNDER');
    expect(mine.body.data.map((r) => r.entityId)).toContain(String(founder._id));

    await investor.delete(`/api/v1/investor/saved/${founder._id}`).expect(200);
    expect((await investor.get('/api/v1/me/saved?entityType=FOUNDER')).body.data.map((r) => r.entityId)).not.toContain(String(founder._id));
  });
});
