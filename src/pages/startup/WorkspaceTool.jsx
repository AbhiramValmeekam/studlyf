import { useParams, Link } from 'react-router-dom'
import { myStartup } from '../../data/mock/startups'
import { Card, Tag, Button, PageTitle, EmptyState } from '../../components/ui/primitives'
import { ProgressRing, ProgressBar } from '../../components/ui/ProgressRing'
import { DonutChart } from '../../components/ui/charts'

/**
 * WorkspaceTool — renders one structured founder tool by :tool param. Each is a
 * purpose-built workflow (NOT a generic AI chat): pitch deck outline, market
 * analysis with TAM/SAM/SOM, SWOT grid, GTM stages, readiness scorecard.
 */
const META = {
  'pitch-deck': { label: 'Pitch Deck', eyebrow: 'Narrative' },
  market: { label: 'Market Analysis', eyebrow: 'Market' },
  swot: { label: 'SWOT', eyebrow: 'Position' },
  gtm: { label: 'GTM Strategy', eyebrow: 'Go-to-market' },
  readiness: { label: 'Startup Readiness', eyebrow: 'Score' },
}

export default function WorkspaceTool() {
  const { tool } = useParams()
  const meta = META[tool]
  if (!meta) return <EmptyState title="Tool not found" action={<Button to="/startup" size="sm">Back to workspace</Button>} />

  return (
    <>
      <Link to="/startup" className="text-sm text-bone2 hover:text-bone transition-colors" data-cursor="hover">← Workspace</Link>
      <div className="mt-3">
        <PageTitle eyebrow={meta.eyebrow} title={meta.label} />
      </div>
      {tool === 'pitch-deck' && <PitchDeck />}
      {tool === 'market' && <Market />}
      {tool === 'swot' && <Swot />}
      {tool === 'gtm' && <Gtm />}
      {tool === 'readiness' && <Readiness />}
    </>
  )
}

/* ---- Pitch Deck: structured slide outline ---- */
function PitchDeck() {
  const slides = [
    { n: 1, t: 'Problem', d: myStartup.problem, done: true },
    { n: 2, t: 'Solution', d: myStartup.solution, done: true },
    { n: 3, t: 'Product', d: myStartup.product, done: true },
    { n: 4, t: 'Market', d: 'Field sales software — ₹40,000Cr TAM in India.', done: true },
    { n: 5, t: 'Business model', d: myStartup.businessModel, done: true },
    { n: 6, t: 'Traction', d: myStartup.traction, done: true },
    { n: 7, t: 'Team', d: `${myStartup.teamSize} people, led by ${myStartup.founder.name}.`, done: false },
    { n: 8, t: 'Ask', d: 'Raising ₹12Cr to expand GTM and ship the analytics suite.', done: false },
  ]
  const complete = Math.round((slides.filter((s) => s.done).length / slides.length) * 100)
  return (
    <>
      <Card className="p-5 mb-6 flex items-center gap-4">
        <ProgressRing value={complete} label="DONE" color="var(--violet)" size={72} stroke={7} />
        <p className="text-sm text-bone2">Your deck is {complete}% structured. Fill the remaining slides to make it investor-ready.</p>
      </Card>
      <div className="grid sm:grid-cols-2 gap-4">
        {slides.map((s) => (
          <Card key={s.n} className="p-5">
            <div className="flex items-center justify-between">
              <span className="font-display text-xl text-violet">{String(s.n).padStart(2, '0')}</span>
              {s.done ? <Tag tone="acid">Ready</Tag> : <Tag>Draft</Tag>}
            </div>
            <h3 className="font-display text-lg text-bone tracking-crush mt-2">{s.t}</h3>
            <p className="text-sm text-bone2 mt-1">{s.d}</p>
          </Card>
        ))}
      </div>
    </>
  )
}

/* ---- Market Analysis: TAM/SAM/SOM + competitors ---- */
function Market() {
  const funnel = [
    { label: 'TAM', value: '₹40,000Cr', w: 100, note: 'All field-sales teams in India' },
    { label: 'SAM', value: '₹6,500Cr', w: 62, note: 'Mid-market B2B with field reps' },
    { label: 'SOM', value: '₹480Cr', w: 30, note: 'Reachable in 3 years' },
  ]
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <h3 className="font-display text-xl text-bone tracking-crush mb-5">Market size</h3>
        <div className="space-y-4">
          {funnel.map((f) => (
            <div key={f.label}>
              <div className="flex justify-between text-sm mb-1"><span className="text-bone">{f.label} · {f.value}</span><span className="text-bone2 text-xs">{f.note}</span></div>
              <div className="h-8 rounded-lg bg-bone/8 overflow-hidden"><div className="h-full rounded-lg bg-violet" style={{ width: `${f.w}%` }} /></div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-6">
        <h3 className="font-display text-xl text-bone tracking-crush mb-5">Customer segments</h3>
        <DonutChart data={[{ label: 'BFSI field teams', value: 40 }, { label: 'Pharma reps', value: 30 }, { label: 'FMCG distribution', value: 20 }, { label: 'Other', value: 10 }]} />
      </Card>
      <Card className="p-6 lg:col-span-2">
        <h3 className="font-display text-xl text-bone tracking-crush mb-4">Competitors</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-bone2 text-xs border-b border-bone/10">
              <th className="py-2 pr-4">Competitor</th><th className="py-2 pr-4">Focus</th><th className="py-2 pr-4">Weakness</th><th className="py-2">Our edge</th>
            </tr></thead>
            <tbody className="text-bone2">
              {[
                ['Legacy CRM', 'Data entry', 'No mobile-first flow', 'Voice-first logging'],
                ['Generic AI notes', 'Transcription', 'No sales context', 'Next-best-action'],
                ['Spreadsheets', 'Free', 'Zero automation', 'End-to-end copilot'],
              ].map((r) => (
                <tr key={r[0]} className="border-b border-bone/5"><td className="py-3 pr-4 text-bone">{r[0]}</td><td className="py-3 pr-4">{r[1]}</td><td className="py-3 pr-4">{r[2]}</td><td className="py-3 text-acid">{r[3]}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

/* ---- SWOT quadrant ---- */
function Swot() {
  const q = [
    { t: 'Strengths', tone: 'acid', items: ['Founder domain expertise', 'Voice-first UX moat', '128% net retention'] },
    { t: 'Weaknesses', tone: 'flare', items: ['Small GTM team', 'Single-region traction', 'Enterprise sales cycle'] },
    { t: 'Opportunities', tone: 'violet', items: ['Analytics upsell', 'Expand to pharma', 'Partner channels'] },
    { t: 'Threats', tone: 'default', items: ['Incumbent CRMs adding AI', 'Budget freezes', 'Copycat startups'] },
  ]
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {q.map((s) => (
        <Card key={s.t} className="p-6">
          <Tag tone={s.tone}>{s.t}</Tag>
          <ul className="mt-4 space-y-2">
            {s.items.map((i) => <li key={i} className="flex gap-2 text-sm text-bone2"><span className="text-bone2/50">—</span>{i}</li>)}
          </ul>
        </Card>
      ))}
    </div>
  )
}

/* ---- GTM stages ---- */
function Gtm() {
  const stages = [
    { t: 'Land', d: 'Founder-led outbound to 50 target BFSI accounts.', m: 'Q1' },
    { t: 'Expand', d: 'Seat expansion within accounts + case studies.', m: 'Q2' },
    { t: 'Channel', d: 'System-integrator partnerships for distribution.', m: 'Q3' },
    { t: 'Scale', d: 'Inbound engine + self-serve for mid-market.', m: 'Q4' },
  ]
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stages.map((s, i) => (
        <Card key={s.t} className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-display text-2xl text-violet">{String(i + 1).padStart(2, '0')}</span>
            <Tag>{s.m}</Tag>
          </div>
          <h3 className="font-display text-lg text-bone tracking-crush">{s.t}</h3>
          <p className="text-sm text-bone2 mt-1">{s.d}</p>
        </Card>
      ))}
    </div>
  )
}

/* ---- Readiness scorecard ---- */
function Readiness() {
  const dims = [
    { label: 'Team', value: 88 },
    { label: 'Product', value: 82 },
    { label: 'Traction', value: 79 },
    { label: 'Market', value: 90 },
    { label: 'Financials', value: 74 },
    { label: 'Story / Deck', value: 85 },
  ]
  const overall = Math.round(dims.reduce((a, d) => a + d.value, 0) / dims.length)
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="p-6 flex flex-col items-center justify-center text-center">
        <ProgressRing value={overall} label="READY" color="var(--violet)" size={140} stroke={12} />
        <p className="text-bone2 text-sm mt-4">Investor-readiness score</p>
        <Button to="/startup/investors" size="sm" variant="violet" className="mt-4">Discover investors ↗</Button>
      </Card>
      <Card className="p-6 lg:col-span-2">
        <h3 className="font-display text-xl text-bone tracking-crush mb-5">By dimension</h3>
        <div className="space-y-4">
          {dims.map((d) => (
            <div key={d.label}>
              <div className="flex justify-between text-sm mb-1"><span className="text-bone">{d.label}</span><span className="text-bone2">{d.value}</span></div>
              <ProgressBar value={d.value} color="var(--violet)" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
