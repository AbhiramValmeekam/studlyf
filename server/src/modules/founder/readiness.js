/**
 * Startup readiness — a transparent assessment across eight areas (Problem, Market, Product, Team,
 * Traction, Business Model, GTM, Pitch). Not a black-box score: every area lists the checks it
 * needs, which ones pass, and where in the founder workspace to fix the rest. The score is the
 * weighted share of passed checks (0–100). Kept pure so founders and investors see the same result.
 */
const filled = (v) => (typeof v === 'string' ? v.trim().length >= 2 : v !== null && v !== undefined);
const rich = (v, min = 40) => typeof v === 'string' && v.trim().length >= min;
const PAST_IDEA = ['VALIDATION', 'MVP', 'EARLY_TRACTION', 'GROWTH', 'SCALING'];

// The structured workspace builders (spec §38–43) and the older free-text fields both count.
// Each check below reads the structured value first and falls back to the free text, so a
// founder who wrote everything before the builders existed scores exactly as they did before.
const someRich = (o, min = 40) => !!o && Object.values(o).some((v) => rich(v, min));
const someFilled = (o, n, min = 2) => !!o && Object.values(o).filter((v) => rich(v, min)).length >= n;
const anyCompetitor = (rows = []) => rows.some((c) => rich(c?.description) || rich(c?.name, 2));

export const READINESS_AREAS = [
  {
    key: 'problem',
    label: 'Problem',
    weight: 15,
    section: 'workspace',
    checks: [
      ['Problem statement written', (p) => rich(p.workspace?.problem)],
      ['Target customer defined', (p) => rich(p.workspace?.targetCustomer, 20)],
    ],
  },
  {
    key: 'market',
    label: 'Market',
    weight: 15,
    section: 'workspace',
    checks: [
      ['Market analysis', (p) => rich(p.workspace?.market?.market) || rich(p.workspace?.marketAnalysis)],
      ['Competitor analysis', (p) => anyCompetitor(p.workspace?.competitorAnalysis) || rich(p.workspace?.competitors)],
      ['SWOT', (p) => ['strengths', 'weaknesses', 'opportunities', 'threats'].filter((k) => filled(p.workspace?.swot?.[k])).length >= 3],
    ],
  },
  {
    key: 'product',
    label: 'Product',
    weight: 10,
    section: 'startup',
    checks: [
      ['What the product does', (p) => rich(p.startup?.description)],
      ['Beyond the idea stage', (p) => PAST_IDEA.includes(p.startup?.stage)],
    ],
  },
  {
    key: 'team',
    label: 'Team',
    weight: 10,
    section: 'startup',
    checks: [
      ['Founder headline and bio', (p) => filled(p.headline) && rich(p.bio, 20)],
      ['Team described', (p) => rich(p.startup?.teamDescription, 20) && filled(p.startup?.teamSize)],
    ],
  },
  {
    key: 'traction',
    label: 'Traction',
    weight: 15,
    section: 'startup',
    checks: [
      ['Users or customers', (p) => filled(p.startup?.traction?.users)],
      ['Revenue, growth or highlights', (p) => ['revenue', 'growth', 'highlights'].some((k) => filled(p.startup?.traction?.[k]))],
    ],
  },
  {
    key: 'businessModel',
    label: 'Business Model',
    weight: 15,
    section: 'workspace',
    checks: [['Business model', (p) => someFilled(p.workspace?.businessModelCanvas, 3) || rich(p.workspace?.businessModel)]],
  },
  {
    key: 'gtm',
    label: 'GTM',
    weight: 10,
    section: 'workspace',
    checks: [
      ['Go-to-market strategy', (p) => someRich(p.workspace?.gtm) || rich(p.workspace?.gtmStrategy)],
      ['Marketing strategy', (p) => rich(p.workspace?.marketingStrategy, 30)],
    ],
  },
  {
    key: 'pitch',
    label: 'Pitch',
    weight: 10,
    section: 'workspace',
    checks: [
      ['Pitch deck link', (p) => filled(p.workspace?.pitchDeckUrl)],
      ['Pitch narrative', (p) => someFilled(p.workspace?.pitchDeck, 5) || rich(p.workspace?.pitchNotes)],
    ],
  },
];

export function readiness(profile) {
  const p = profile ?? {};
  let score = 0;
  const areas = READINESS_AREAS.map((a) => {
    const checks = a.checks.map(([label, test]) => ({ label, done: !!test(p) }));
    const passed = checks.filter((c) => c.done).length;
    const areaScore = Math.round((passed / checks.length) * a.weight * 10) / 10;
    score += areaScore;
    return { key: a.key, label: a.label, weight: a.weight, section: a.section, score: areaScore, complete: passed === checks.length, checks };
  });
  score = Math.round(score);
  const level = score >= 85 ? 'INVESTOR_READY' : score >= 60 ? 'TAKING_SHAPE' : score >= 30 ? 'EARLY' : 'GETTING_STARTED';
  return { score, level, areas };
}
