import { Link } from 'react-router-dom'
import { myStartup } from '../../data/mock/startups'
import { Card, StatCard, Button, Tag, PageTitle } from '../../components/ui/primitives'
import { ProgressRing } from '../../components/ui/ProgressRing'

/**
 * Founder Workspace — the home of the startup ecosystem. Startup snapshot,
 * readiness, and the structured tools that improve the venture.
 */
const TOOLS = [
  { to: '/startup/workspace/pitch-deck', name: 'Pitch Deck', desc: 'Structure a compelling narrative.' },
  { to: '/startup/workspace/market', name: 'Market Analysis', desc: 'TAM / SAM / SOM, customers, competitors.' },
  { to: '/startup/workspace/swot', name: 'SWOT', desc: 'Strengths, weaknesses, opportunities, threats.' },
  { to: '/startup/workspace/gtm', name: 'GTM Strategy', desc: 'Channels, motion and milestones.' },
  { to: '/startup/workspace/marketing', name: 'Marketing Plan', desc: 'Channels, budget split and funnel targets.' },
  { to: '/startup/workspace/competitors', name: 'Competitor Analysis', desc: 'Position against rivals on the axes that matter.' },
  { to: '/startup/workspace/readiness', name: 'Startup Readiness', desc: 'Score your investor-readiness.' },
  { to: '/startup/workspace/intelligence', name: 'Startup / VC Intelligence', desc: 'Active investors, cheque sizes and market signals.' },
]

export default function FounderWorkspace() {
  const s = myStartup
  return (
    <>
      <PageTitle eyebrow={`Welcome, ${s.founder.name.split(' ')[0]}`} title="Founder workspace">
        <Button to="/startup/investors" size="sm">Discover investors ↗</Button>
      </PageTitle>

      {/* startup snapshot */}
      <Card className="p-7 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <img src={s.logo} alt={s.name} className="h-16 w-16 rounded-xl bg-white object-contain p-2" />
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-3xl text-bone tracking-crush">{s.name}</h2>
              <Tag tone="violet">{s.stage}</Tag>
            </div>
            <p className="text-bone2 mt-1">{s.tagline}</p>
            <div className="flex flex-wrap gap-2 mt-3"><Tag>{s.industry}</Tag><Tag>{s.location}</Tag><Tag>{s.teamSize} people</Tag></div>
          </div>
          <div className="flex items-center gap-4">
            <ProgressRing value={s.readiness} label="READY" color="var(--violet)" />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
        {s.metrics.map((m) => <StatCard key={m.label} label={m.label} value={m.value} accent="violet" />)}
      </div>

      {/* tools */}
      <h2 className="font-display text-2xl text-bone tracking-crush mb-4">Founder tools</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {TOOLS.map((t, i) => (
          <Link key={t.to} to={t.to} data-cursor="hover">
            <Card hover className="p-6 h-full">
              <span className="font-display giant-num text-violet leading-none" style={{ fontSize: 'clamp(2rem,4vw,3rem)' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="font-display text-xl text-bone tracking-crush mt-3">{t.name}</h3>
              <p className="text-sm text-bone2 mt-1">{t.desc}</p>
              <span className="text-sm text-violet mt-4 inline-block">Open ↗</span>
            </Card>
          </Link>
        ))}
      </div>
    </>
  )
}
