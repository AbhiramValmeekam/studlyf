import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext, uniqueEmail } from './helpers.js';

let ctx;
let admin;
let editor;
let builder;

beforeAll(async () => {
  ctx = await createTestContext();
  [admin, editor, builder] = await Promise.all([ctx.loginAs('superAdmin'), ctx.loginAs('editor'), ctx.loginAs('builder')]);
});
afterAll(() => ctx.close());

const pub = (path) => request(ctx.app).get(`/api/v1${path}`);

describe('admin authorisation', () => {
  const adminPaths = ['/opportunities', '/resources', '/stats', '/partners', '/testimonials', '/path-cards', '/homepage', '/media', '/categories', '/users', '/audit-logs'];

  it('rejects unauthenticated callers with 401', async () => {
    for (const p of adminPaths) {
      const res = await request(ctx.app).get(`/api/v1/admin${p}`);
      expect(res.status, p).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    }
  });

  it('rejects signed-in non-admin users with 403 on reads and writes', async () => {
    for (const p of adminPaths) expect((await builder.get(`/api/v1/admin${p}`)).status, p).toBe(403);
    const write = await builder.post('/api/v1/admin/stats').send({ key: 'x_y', label: 'X', value: 1 });
    expect(write.status).toBe(403);
    expect(write.body.error.code).toBe('FORBIDDEN');
  });

  it('lets editors manage content but not users or audit logs', async () => {
    expect((await editor.get('/api/v1/admin/opportunities')).status).toBe(200);
    expect((await editor.get('/api/v1/admin/users')).status).toBe(403);
    expect((await editor.get('/api/v1/admin/audit-logs')).status).toBe(403);
    expect((await admin.get('/api/v1/admin/users')).status).toBe(200);
  });

  it('exposes admin status on /me only as a flag', async () => {
    const me = (await editor.get('/api/v1/me')).body.data;
    expect(me.admin).toEqual({ level: 'EDITOR' });
  });
});

describe('opportunity lifecycle via admin', () => {
  it('create (draft) → invisible → publish → visible → unpublish → invisible → delete', async () => {
    const created = await editor.post('/api/v1/admin/opportunities').send({
      title: 'Robotics Grand Challenge',
      organizationName: 'Sample Robotics Club',
      type: 'COMPETITION',
      mode: 'OFFLINE',
      location: 'Mumbai',
      shortDescription: 'Build an autonomous rover.',
      description: '<p onclick="steal()">Rules</p><script>alert(1)</script><a href="javascript:alert(1)">x</a>',
      applicationDeadline: new Date(Date.now() + 10 * 86_400_000).toISOString(),
      skills: ['Robotics', 'C++'],
      featured: true,
    });
    expect(created.status).toBe(201);
    const opp = created.body.data;
    expect(opp).toMatchObject({ slug: 'robotics-grand-challenge', status: 'DRAFT', publishedAt: null });
    // XSS: rich text is sanitised on write
    expect(opp.description).toBe('<p>Rules</p><a rel="noopener noreferrer nofollow">x</a>');
    expect(opp.skills.map((s) => s.slug).sort()).toEqual(['c', 'robotics']);

    expect((await pub('/opportunities/robotics-grand-challenge')).status).toBe(404);

    await pub('/home'); // warm the cache
    const published = await editor.post(`/api/v1/admin/opportunities/${opp.id}/publish`);
    expect(published.body.data.status).toBe('PUBLISHED');
    expect((await pub('/opportunities/robotics-grand-challenge')).status).toBe(200);
    const home = (await pub('/home')).body.data;
    expect(home.featuredOpportunities.map((o) => o.slug)).toContain('robotics-grand-challenge');

    await editor.post(`/api/v1/admin/opportunities/${opp.id}/unpublish`).expect(200);
    expect((await pub('/opportunities/robotics-grand-challenge')).status).toBe(404);
    expect(JSON.stringify((await pub('/home')).body)).not.toContain('robotics-grand-challenge');

    await editor.delete(`/api/v1/admin/opportunities/${opp.id}`).expect(200);
    expect((await editor.get(`/api/v1/admin/opportunities/${opp.id}`)).status).toBe(404);
  });

  it('validates admin input', async () => {
    const res = await editor.post('/api/v1/admin/opportunities').send({
      title: '',
      type: 'PARTY',
      mode: 'ONLINE',
      organizationName: 'X',
      shortDescription: 'x',
      externalUrl: 'javascript:alert(1)',
      startDate: '2026-12-10',
      endDate: '2026-12-01',
      unknownField: true,
    });
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['title', 'type', 'externalUrl']));
  });

  it('checks date order against stored values on update and refuses taken slugs', async () => {
    const list = (await editor.get('/api/v1/admin/opportunities?type=internship')).body.data;
    const id = list[0].id;
    const bad = await editor.patch(`/api/v1/admin/opportunities/${id}`).send({ endDate: '2000-01-01' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.details[0].field).toBe('endDate');

    const taken = await editor.patch(`/api/v1/admin/opportunities/${id}`).send({ slug: 'loophacks-2026-ai-for-bharat' });
    expect(taken.status).toBe(409);
    expect(taken.body.error.code).toBe('SLUG_TAKEN');
  });

  it('admin list includes drafts and supports filters', async () => {
    const drafts = (await editor.get('/api/v1/admin/opportunities?status=draft')).body;
    expect(drafts.data.map((o) => o.title)).toContain('Unannounced Quantum Challenge');
  });

  it('rejects category ids from the wrong scope', async () => {
    const cats = (await pub('/categories?scope=RESOURCE')).body.data;
    const res = await editor.post('/api/v1/admin/opportunities').send({
      title: 'Wrong Category',
      organizationName: 'X',
      type: 'CHALLENGE',
      mode: 'ONLINE',
      shortDescription: 'x',
      categoryId: cats[0].id,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('categoryId');
  });
});

describe('other content via admin', () => {
  it('stats edits reach the public API immediately (cache invalidation)', async () => {
    expect((await pub('/stats')).body.data[0].value).toBe(100000);
    const stats = (await editor.get('/api/v1/admin/stats')).body.data;
    const reach = stats.find((s) => s.key === 'student_reach');
    await editor.patch(`/api/v1/admin/stats/${reach.id}`).send({ value: 150000 }).expect(200);
    expect((await pub('/stats')).body.data[0].value).toBe(150000);
    expect((await pub('/home')).body.data.stats[0].value).toBe(150000);

    await editor.post(`/api/v1/admin/stats/${reach.id}/unpublish`).expect(200);
    expect((await pub('/stats')).body.data.map((s) => s.key)).not.toContain('student_reach');
    await editor.post(`/api/v1/admin/stats/${reach.id}/publish`).expect(200);
  });

  it('hero content is editable with per-field validation', async () => {
    const bad = await editor.put('/api/v1/admin/homepage/hero').send({
      content: { headline: '', subheadline: 'x', primaryCta: { label: 'Go', url: 'javascript:alert(1)' } },
    });
    expect(bad.status).toBe(400);
    const fields = bad.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['content.headline', 'content.primaryCta.url']));

    const good = await editor.put('/api/v1/admin/homepage/hero').send({
      content: {
        headline: 'Build. Prove. Get Discovered.',
        subheadline: 'Updated subheadline',
        primaryCta: { label: 'Explore Opportunities', url: '/builder/opportunities' },
        secondaryCta: { label: 'Create Your Profile', url: '/join' },
      },
    });
    expect(good.status).toBe(200);
    expect((await pub('/home')).body.data.hero.subheadline).toBe('Updated subheadline');

    expect((await editor.put('/api/v1/admin/homepage/not_a_section').send({ content: {} })).status).toBe(400);
  });

  it('path cards, partners and testimonials support CRUD + publish', async () => {
    const card = await editor.post('/api/v1/admin/path-cards').send({
      key: 'investors', title: 'Investors', description: 'Meet founders.', ctaLabel: 'Explore', ctaUrl: '/investor/login', displayOrder: 9,
    });
    expect(card.status).toBe(201);
    expect((await pub('/paths')).body.data).toHaveLength(4);
    await editor.post(`/api/v1/admin/path-cards/${card.body.data.id}/publish`).expect(200);
    expect((await pub('/paths')).body.data).toHaveLength(5);
    await editor.delete(`/api/v1/admin/path-cards/${card.body.data.id}`).expect(200);

    const partner = await editor.post('/api/v1/admin/partners').send({ name: 'New Partner Org', website: 'https://example.org' });
    expect(partner.body.data).toMatchObject({ slug: 'new-partner-org', active: false });
    await editor.post(`/api/v1/admin/partners/${partner.body.data.id}/publish`).expect(200);
    expect((await pub('/partners')).body.data.map((p) => p.slug)).toContain('new-partner-org');

    const t = await editor.post('/api/v1/admin/testimonials').send({ personName: 'Sam', quote: 'Great', active: true, featured: true });
    expect(t.status).toBe(201);
    expect((await pub('/testimonials')).body.data.map((x) => x.personName)).toContain('Sam');
  });

  it('resources: create with tags, publish, search finds it', async () => {
    const res = await editor.post('/api/v1/admin/resources').send({
      title: 'Zebra Striping Your Database',
      type: 'ARTICLE',
      description: 'Rare keyword for search testing.',
      content: '<p>Hello</p>',
      tags: ['Databases'],
      status: 'PUBLISHED',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.publishedAt).toBeTruthy();
    const found = (await pub('/search?q=zebra')).body.data.resources.items;
    expect(found.map((r) => r.slug)).toEqual(['zebra-striping-your-database']);
    const video = await editor.post('/api/v1/admin/resources').send({ title: 'V', type: 'VIDEO', description: 'd' });
    expect(video.status).toBe(400);
    expect(video.body.error.details[0].field).toBe('externalUrl');
  });
});

describe('media uploads', () => {
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]),
    Buffer.from('IHDR'),
    Buffer.from([0, 0, 0, 64, 0, 0, 0, 32, 8, 6, 0, 0, 0]),
    Buffer.alloc(32),
  ]);

  it('accepts a real image, records metadata and serves it', async () => {
    const res = await editor.post('/api/v1/admin/media').field('purpose', 'logo').attach('file', png, { filename: 'logo.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ driver: 'LOCAL', mimeType: 'image/png', width: 64, height: 32, purpose: 'LOGO', sizeBytes: png.length });
    const path = new URL(res.body.data.url).pathname;
    const file = await request(ctx.app).get(path);
    expect(file.status).toBe(200);
    expect(file.headers['x-content-type-options']).toBe('nosniff');
  });

  it('rejects files whose bytes are not an allowed image, whatever they claim to be', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    const res = await editor.post('/api/v1/admin/media').attach('file', svg, { filename: 'evil.png', contentType: 'image/png' });
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
    expect((await editor.post('/api/v1/admin/media').field('purpose', 'logo')).status).toBe(400);
  });

  it('rejects oversized files', async () => {
    const big = Buffer.concat([png, Buffer.alloc(6 * 1024 * 1024)]);
    const res = await editor.post('/api/v1/admin/media').attach('file', big, { filename: 'big.png', contentType: 'image/png' });
    expect(res.status).toBe(413);
  });
});

describe('user management + audit log', () => {
  it('super admin can list and search users without seeing password hashes', async () => {
    const res = await admin.get('/api/v1/admin/users?q=builder');
    expect(res.status).toBe(200);
    expect(res.body.data.map((u) => u.email)).toContain('builder@studlyf.local');
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|scrypt/);
  });

  it('cannot deactivate yourself', async () => {
    const me = (await admin.get('/api/v1/me')).body.data;
    const res = await admin.patch(`/api/v1/admin/users/${me.id}`).send({ status: 'SUSPENDED' });
    expect(res.status).toBe(400);
  });

  it('records every admin mutation with actor and entity', async () => {
    const editorId = (await editor.get('/api/v1/me')).body.data.id;
    const logs = (await admin.get('/api/v1/admin/audit-logs?entityType=opportunity&pageSize=100')).body.data;
    const actions = logs.map((l) => l.action);
    expect(actions).toEqual(expect.arrayContaining(['opportunity.create', 'opportunity.publish', 'opportunity.unpublish', 'opportunity.delete']));
    expect(logs.every((l) => l.actorUserId === editorId)).toBe(true);
    expect(logs[0].requestId).toBeTruthy();
  });

  it('admin-created users flow: register → admin sees them', async () => {
    const email = uniqueEmail('listed');
    await request(ctx.app).post('/api/v1/auth/register').send({ name: 'Listed', email, password: 'goodpass123' }).expect(201);
    const res = await admin.get(`/api/v1/admin/users?q=${encodeURIComponent(email)}`);
    expect(res.body.meta.total).toBe(1);
  });
});

// Regression: `guidelines` is authored in a plain textarea but rendered as HTML in the public
// opportunity page's prose block. It must cross the same sanitising boundary as description,
// eligibility and prizeInformation — before this it was stored raw, so any organizer could run
// script in every visitor's browser.
describe('submission guidelines are sanitised on write', () => {
  const OPTS = {
    organizationName: 'Sample Robotics Club',
    type: 'COMPETITION',
    mode: 'OFFLINE',
    shortDescription: 'Checks the guidelines field.',
  };

  it('strips script and event handlers on create', async () => {
    const res = await editor.post('/api/v1/admin/opportunities').send({
      ...OPTS,
      title: 'Guidelines Create Check',
      submissionSettings: {
        acceptsProjects: true,
        guidelines: '<p>Submit a repo.</p><img src=x onerror="alert(1)"><script>alert(1)</script>',
      },
    });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const guidelines = res.body.data.submissionSettings.guidelines;
    expect(guidelines).toContain('<p>Submit a repo.</p>');
    expect(guidelines).not.toMatch(/<script|onerror/i);
  });

  it('strips script on update, and leaves honest plain text alone', async () => {
    const created = await editor
      .post('/api/v1/admin/opportunities')
      .send({ ...OPTS, title: 'Guidelines Update Check', submissionSettings: { guidelines: 'Plain text to start.' } });
    expect(created.status).toBe(201);
    const { id } = created.body.data;

    const patched = await editor
      .patch(`/api/v1/admin/opportunities/${id}`)
      .send({ submissionSettings: { guidelines: '<script>alert(2)</script>Keep this line.' } });
    expect(patched.status).toBe(200);
    const guidelines = patched.body.data.submissionSettings.guidelines;
    expect(guidelines).not.toMatch(/<script/i);
    expect(guidelines).toContain('Keep this line.');
  });
});
