import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext } from './helpers.js';

let ctx;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());
const get = (path) => request(ctx.app).get(`/api/v1${path}`);

// Seed markers: every non-public seed row has one of these in its text.
const HIDDEN = /DRAFT|must never appear|Hidden Partner|Hidden Person|Internal Metric|scheduled/i;

describe('GET /home', () => {
  it('returns every homepage section in one call, unauthenticated', async () => {
    const res = await get('/home');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const d = res.body.data;
    expect(Object.keys(d)).toEqual(
      expect.arrayContaining(['hero', 'paths', 'featuredOpportunities', 'stats', 'featuredResources', 'testimonials', 'partners']),
    );
    expect(d.hero).toMatchObject({
      headline: 'Build. Prove. Get Discovered.',
      subheadline: 'One ecosystem for builders, founders, opportunities and the people looking for what they can build.',
      primaryCta: { label: 'Explore Opportunities' },
      secondaryCta: { label: 'Create Your Profile' },
    });
    expect(d.paths.map((p) => p.title)).toEqual(['Builders', 'Founders', 'Organizations', 'HR & Talent']);
    expect(d.paths[0]).toMatchObject({ description: expect.any(String), icon: expect.any(String), cta: { label: expect.any(String), url: expect.any(String) } });
    expect(d.stats[0]).toMatchObject({ label: 'Student Reach', value: 100000, suffix: '+' });
  });

  it('contains only published / active content', async () => {
    const d = (await get('/home')).body.data;
    expect(JSON.stringify(d)).not.toMatch(HIDDEN);
    expect(d.stats).toHaveLength(4);
    expect(d.sections.pathsIntro).toBeDefined();
    expect(d.sections.joinCta).toBeUndefined(); // seeded as DRAFT
    // featured opportunities exclude closed ones
    expect(d.featuredOpportunities.every((o) => o.applicationStatus === 'OPEN')).toBe(true);
    expect(d.featuredOpportunities.length).toBeGreaterThan(0);
  });

  it('is cacheable by browsers/CDNs', async () => {
    const res = await get('/home');
    expect(res.headers['cache-control']).toMatch(/public, max-age=\d+/);
    expect(res.headers.etag).toBeDefined();
  });
});

describe('opportunities', () => {
  it('lists published opportunities with pagination meta', async () => {
    const res = await get('/opportunities?pageSize=2');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({ page: 1, pageSize: 2, total: 9, totalPages: 5 });
  });

  it('never exposes drafts, scheduled items or internal columns', async () => {
    const res = await get('/opportunities?pageSize=50');
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(HIDDEN);
    expect(body).not.toMatch(/createdBy|updatedBy|searchVector|search_vector|"status":"(DRAFT|PUBLISHED)"/);
    const item = res.body.data[0];
    expect(item).toMatchObject({
      id: expect.any(String),
      slug: expect.any(String),
      type: expect.any(String),
      mode: expect.any(String),
      organization: { name: expect.any(String), logo: { url: expect.stringMatching(/^http/) } },
      skills: expect.any(Array),
    });
    expect(item.description).toBeUndefined(); // list view is lightweight
  });

  it('filters by type, mode, location, lifecycle status, skill and category', async () => {
    const hack = (await get('/opportunities?type=hackathon')).body.data;
    expect(hack.length).toBe(2);
    expect(hack.every((o) => o.type === 'HACKATHON')).toBe(true);

    const online = (await get('/opportunities?mode=ONLINE')).body.data;
    expect(online.every((o) => o.mode === 'ONLINE')).toBe(true);

    // Case-insensitive substring match on location.
    const inBengaluru = (await get('/opportunities?location=bengaluru')).body.data;
    expect(inBengaluru.map((o) => o.title)).toEqual(['LoopHacks 2026 — AI for Bharat']);

    const closed = (await get('/opportunities?status=closed')).body.data;
    expect(closed.map((o) => o.slug)).toEqual(['spring-build-sprint-2026']);
    const open = (await get('/opportunities?status=open')).body;
    expect(open.meta.total).toBe(8);

    const go = (await get('/opportunities?skill=go')).body.data;
    expect(go.map((o) => o.title)).toEqual(['SDE Intern — Platform Team']);

    const design = (await get('/opportunities?category=design')).body.data;
    expect(design).toHaveLength(1);
    expect(design[0].category.slug).toBe('design');
  });

  it('rejects invalid filter values with field errors', async () => {
    const res = await get('/opportunities?type=party&pageSize=500');
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['type', 'pageSize']));
  });

  it('returns full details by slug', async () => {
    const res = await get('/opportunities/loophacks-2026-ai-for-bharat');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      title: 'LoopHacks 2026 — AI for Bharat',
      description: expect.stringContaining('<p>'),
      organization: { partner: { slug: 'loopwise' } },
      applicationStatus: 'OPEN',
    });
  });

  it('404s for draft and scheduled slugs', async () => {
    for (const slug of ['unannounced-quantum-challenge', 'winter-ai-residency-scheduled', 'nope']) {
      const res = await get(`/opportunities/${slug}`);
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ success: false, error: { code: 'NOT_FOUND', message: 'Opportunity not found' } });
    }
  });
});

describe('resources', () => {
  it('lists published resources and filters by type and tag', async () => {
    const all = await get('/resources?pageSize=50');
    expect(all.body.meta.total).toBe(6);
    expect(JSON.stringify(all.body)).not.toMatch(HIDDEN);

    const videos = (await get('/resources?type=video')).body.data;
    expect(videos).toHaveLength(1);
    expect(videos[0].externalUrl).toMatch(/^https:/);

    const tagged = (await get('/resources?tag=mvp')).body.data;
    expect(tagged.map((r) => r.slug)).toEqual(['from-idea-to-mvp-in-30-days']);
  });

  it('returns content on the detail endpoint and 404s for drafts', async () => {
    const res = await get('/resources/how-to-win-your-first-hackathon');
    expect(res.status).toBe(200);
    expect(res.body.data.content).toContain('<h2>');
    expect(res.body.data.tags.map((t) => t.slug)).toContain('hackathons');
    expect((await get('/resources/internal-draft-q4-content-plan')).status).toBe(404);
  });
});

describe('partners, testimonials, stats, paths, categories', () => {
  it('only return active items', async () => {
    const partners = (await get('/partners')).body.data;
    expect(partners.map((p) => p.slug)).not.toContain('hidden-partner');
    expect(partners).toHaveLength(4);

    const featured = (await get('/partners?featured=true')).body.data;
    expect(featured).toHaveLength(3);

    const testimonials = (await get('/testimonials')).body.data;
    expect(testimonials).toHaveLength(3);
    expect((await get('/testimonials?category=founder')).body.data).toHaveLength(1);

    expect((await get('/stats')).body.data).toHaveLength(4);
    expect((await get('/paths')).body.data).toHaveLength(4);
    const cats = (await get('/categories?scope=resource')).body.data;
    expect(cats.every((c) => c.scope === 'RESOURCE')).toBe(true);
  });
});

describe('search', () => {
  it('searches opportunities and resources by keyword with prefix matching', async () => {
    const res = await get('/search?q=hack');
    expect(res.status).toBe(200);
    const { opportunities, resources } = res.body.data;
    expect(opportunities.items.map((o) => o.slug)).toContain('loophacks-2026-ai-for-bharat');
    expect(resources.items.map((r) => r.slug)).toContain('how-to-win-your-first-hackathon');
    expect(res.body.meta.query).toBe('hack');
  });

  it('matches skills/tags and never returns hidden content', async () => {
    const res = await get('/search?q=quantum');
    expect(res.body.data.opportunities.total).toBe(0);
    const skill = await get('/search?q=figma');
    expect(skill.body.data.opportunities.items[0].slug).toBe('design-sprint-challenge-campus-commute');
  });

  it('narrows by type, category and status', async () => {
    const byType = (await get('/search?type=GUIDE')).body.data;
    expect(byType.opportunities.total).toBe(0);
    expect(byType.resources.items.every((r) => r.type === 'GUIDE')).toBe(true);

    const byStatus = (await get('/search?status=closed')).body.data;
    expect(byStatus.resources.total).toBe(0);
    expect(byStatus.opportunities.total).toBe(1);

    const byCategory = (await get('/search?category=career&scope=resources')).body.data;
    expect(byCategory.resources.total).toBe(3);
    expect(byCategory.opportunities.total).toBe(0);
  });

  it('treats hostile input as plain text', async () => {
    for (const q of ["'; drop table users; --", 'a & | ! :* (', '<script>alert(1)</script>']) {
      const res = await get(`/search?q=${encodeURIComponent(q)}`);
      expect(res.status).toBe(200);
    }
    expect((await get('/stats')).status).toBe(200); // tables still intact
  });
});
