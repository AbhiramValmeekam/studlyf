import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext, uniqueEmail } from './helpers.js';

/**
 * The founder strategy workspace, structured (spec §38–43) plus the dated traction series (§45).
 * These fields were added *alongside* the original free-text ones, so every test here also pins the
 * fallback behaviour: an old founder who only ever wrote free text must still score the same.
 */
let ctx;

beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());

/** A fresh founder with a startup — the minimum that makes the workspace reachable. */
async function founder() {
  const agent = request.agent(ctx.app);
  const res = await agent.post('/api/v1/auth/register').send({ name: 'Workspace Tester', email: uniqueEmail('founder'), password: 'goodpass123', intent: 'FOUNDER' });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  const created = await agent.post('/api/v1/founder/profile').send({ headline: 'Founder', startup: { name: 'GreenBox', oneLiner: 'Reusable packaging for cloud kitchens.' } });
  expect(created.status, JSON.stringify(created.body)).toBe(201);
  return agent;
}

const patch = async (agent, body) => {
  const res = await agent.patch('/api/v1/founder/profile').send(body);
  expect(res.status, JSON.stringify(res.body)).toBe(200);
  return res.body.data;
};
const long = (label) => `${label} — ${'detail '.repeat(10)}`;

describe('founder workspace: structured builders', () => {
  it('round-trips every group, null-filling the keys that were not set', async () => {
    const agent = await founder();
    const data = await patch(agent, {
      workspace: {
        market: { market: long('Soil-health testing'), tam: '₹4,000 Cr' },
        businessModelCanvas: { valueProposition: long('Cheap soil intelligence'), revenueStreams: long('SaaS per hectare') },
        gtm: { positioning: long('The default soil layer for FPOs') },
        pitchDeck: { problem: long('Farmers guess at soil health') },
      },
    });
    // Keys arrive even when unset, so the client can render a stable form.
    expect(Object.keys(data.workspace.market)).toEqual(['market', 'customerSegment', 'tam', 'sam', 'som', 'trends', 'customerProblem', 'opportunity']);
    expect(data.workspace.market.market).toContain('Soil-health testing');
    expect(data.workspace.market.tam).toBe('₹4,000 Cr');
    expect(data.workspace.market.sam).toBeNull();
    expect(data.workspace.businessModelCanvas.valueProposition).toContain('Cheap soil intelligence');
    expect(data.workspace.businessModelCanvas.channels).toBeNull();
    expect(data.workspace.gtm.positioning).toContain('default soil layer');
    expect(data.workspace.pitchDeck.problem).toContain('Farmers guess');
    expect(data.workspace.pitchDeck.team).toBeNull();
  });

  it('merges group by group, so saving one field never clears its siblings', async () => {
    const agent = await founder();
    await patch(agent, { workspace: { market: { market: long('Original market read') } } });
    const data = await patch(agent, { workspace: { market: { tam: '₹4,000 Cr' } } });
    expect(data.workspace.market.market).toContain('Original market read');
    expect(data.workspace.market.tam).toBe('₹4,000 Cr');

    const more = await patch(agent, { workspace: { businessModelCanvas: { costStructure: long('Sensor hardware and field ops') } } });
    expect(more.workspace.market.market).toContain('Original market read');
    expect(more.workspace.businessModelCanvas.costStructure).toContain('Sensor hardware');
  });

  it('replaces competitorAnalysis wholesale — it is a list, not a mergeable object', async () => {
    const agent = await founder();
    const two = await patch(agent, {
      workspace: {
        competitorAnalysis: [
          { name: 'Cropin', description: long('Satellite-based crop monitoring'), pricing: 'Enterprise' },
          { name: 'SoilCares', description: long('Lab-based soil testing kits') },
        ],
      },
    });
    expect(two.workspace.competitorAnalysis).toHaveLength(2);
    expect(two.workspace.competitorAnalysis[0].name).toBe('Cropin');

    const one = await patch(agent, { workspace: { competitorAnalysis: [{ name: 'Cropin', differentiation: long('Sensor + camera, not satellite') }] } });
    expect(one.workspace.competitorAnalysis).toHaveLength(1);
    expect(one.workspace.competitorAnalysis[0].differentiation).toContain('Sensor + camera');
    expect(one.workspace.competitorAnalysis[0].pricing).toBeNull();
  });

  it('rejects unknown keys inside a group rather than dropping them', async () => {
    const agent = await founder();
    const res = await agent.patch('/api/v1/founder/profile').send({ workspace: { market: { satellite: 'not a field' } } });
    expect(res.status).toBe(400);
  });

  it('keeps the free-text fields working alongside the structured ones', async () => {
    const agent = await founder();
    const data = await patch(agent, { workspace: { marketAnalysis: long('Legacy market analysis'), competitors: long('Legacy competitor notes') } });
    expect(data.workspace.marketAnalysis).toContain('Legacy market analysis');
    expect(data.workspace.competitors).toContain('Legacy competitor notes');
    expect(data.workspace.market.market).toBeNull();
    expect(data.workspace.competitorAnalysis).toEqual([]);
  });
});

describe('founder workspace: readiness reads the structured fields first', () => {
  it('passes Market, Business Model, GTM and Pitch from structured input alone', async () => {
    const agent = await founder();
    const data = await patch(agent, {
      workspace: {
        market: { market: long('Market read') },
        competitorAnalysis: [{ name: 'Cropin', description: long('Satellite crop monitoring') }],
        swot: { strengths: 'Sensors', weaknesses: 'Hardware cost', opportunities: 'FPO deals' },
        businessModelCanvas: { customerSegments: long('FPOs'), valueProposition: long('Cheap soil data'), revenueStreams: long('SaaS per hectare') },
        gtm: { positioning: long('Default soil layer for FPOs') },
        pitchDeck: { problem: long('Farmers guess'), solution: long('Sensor plus camera'), market: long('₹4000 Cr'), team: long('Two agronomists'), traction: long('12 FPO pilots') },
        pitchDeckUrl: 'https://example.com/deck',
        marketingStrategy: long('Field agents and FPO partnerships'),
      },
    });
    const done = (key) => data.readiness.areas.find((a) => a.key === key).checks.filter((c) => c.done).map((c) => c.label);
    expect(done('market')).toContain('Market analysis');
    expect(done('market')).toContain('Competitor analysis');
    expect(done('businessModel')).toEqual(['Business model']);
    expect(done('gtm')).toContain('Go-to-market strategy');
    expect(done('pitch')).toEqual(['Pitch deck link', 'Pitch narrative']);
  });

  it('a founder who only wrote free text still scores exactly as before', async () => {
    const agent = await founder();
    const data = await patch(agent, {
      workspace: {
        marketAnalysis: long('Legacy market analysis'),
        competitors: long('Legacy competitor notes'),
        businessModel: long('Legacy business model, three streams'),
        gtmStrategy: long('Legacy go-to-market plan'),
        pitchNotes: long('Legacy pitch narrative'),
      },
    });
    const area = (key) => data.readiness.areas.find((a) => a.key === key);
    expect(area('market').checks.find((c) => c.label === 'Market analysis').done).toBe(true);
    expect(area('market').checks.find((c) => c.label === 'Competitor analysis').done).toBe(true);
    expect(area('businessModel').checks[0].done).toBe(true);
    expect(area('gtm').checks.find((c) => c.label === 'Go-to-market strategy').done).toBe(true);
    expect(area('pitch').checks.find((c) => c.label === 'Pitch narrative').done).toBe(true);
  });
});

describe('founder startup: dated traction history', () => {
  it('stores snapshots and returns them oldest first, whatever order they were saved', async () => {
    const agent = await founder();
    const data = await patch(agent, {
      startup: {
        tractionHistory: [
          { date: '2026-06-01', users: '2,400', revenue: '₹1.2L MRR', note: 'FPO pilot two' },
          { date: '2026-01-15', users: '400', revenue: '₹0' },
        ],
      },
    });
    expect(data.startup.tractionHistory).toHaveLength(2);
    expect(data.startup.tractionHistory.map((p) => p.note)).toEqual([null, 'FPO pilot two']);
    expect(new Date(data.startup.tractionHistory[0].date) < new Date(data.startup.tractionHistory[1].date)).toBe(true);
    expect(data.startup.tractionHistory[0].users).toBe('400');
  });

  it('updating the traction summary does not wipe the history', async () => {
    const agent = await founder();
    await patch(agent, { startup: { tractionHistory: [{ date: '2026-01-15', users: '400' }] } });
    const data = await patch(agent, { startup: { traction: { users: '2,400', revenue: '₹1.2L MRR' } } });
    expect(data.startup.traction.users).toBe('2,400');
    expect(data.startup.tractionHistory).toHaveLength(1);
    expect(data.startup.tractionHistory[0].users).toBe('400');
  });

  it('rejects an unknown key inside a snapshot', async () => {
    const agent = await founder();
    const res = await agent.patch('/api/v1/founder/profile').send({ startup: { tractionHistory: [{ date: '2026-01-15', mrr: '10' }] } });
    expect(res.status).toBe(400);
  });
});
