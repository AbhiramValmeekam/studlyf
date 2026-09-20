import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  startups, INDUSTRIES, STAGES, STARTUP_LOCATIONS,
  REVENUE_BANDS, FUNDING_STAGES, TEAM_SIZES, TRACTION_LEVELS,
  teamSizeBucket, tractionLevel,
} from '../../data/mock/startups'
import { useSession } from '../../context/SessionContext'
import { Card, Tag, Button, PageTitle, EmptyState } from '../../components/ui/primitives'
import { FilterBar } from '../../components/ui/FilterBar'

const GROUPS = [
  { key: 'industry', label: 'Industry', options: INDUSTRIES },
  { key: 'stage', label: 'Stage', options: STAGES },
  { key: 'location', label: 'Location', options: STARTUP_LOCATIONS },
  { key: 'revenue', label: 'Revenue', options: REVENUE_BANDS },
  { key: 'funding', label: 'Funding stage', options: FUNDING_STAGES },
  { key: 'team', label: 'Team size', options: TEAM_SIZES },
  { key: 'traction', label: 'Traction', options: TRACTION_LEVELS },
]

const EMPTY = { industry: [], stage: [], location: [], revenue: [], funding: [], team: [], traction: [] }

/**
 * Investor Founder Discovery — filter startup/founder cards by industry, stage,
 * location, revenue and metrics. Connect toggles persist in session.
 */
export default function InvestorDiscover() {
  const { connections, toggleConnect } = useSession()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(EMPTY)

  const toggle = (key, opt) =>
    setSelected((s) => ({ ...s, [key]: s[key].includes(opt) ? s[key].filter((v) => v !== opt) : [...s[key], opt] }))
  const clear = () => setSelected(EMPTY)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return startups.filter((s) => {
      if (q && !`${s.name} ${s.tagline} ${s.industry}`.toLowerCase().includes(q)) return false
      if (selected.industry.length && !selected.industry.includes(s.industry)) return false
      if (selected.stage.length && !selected.stage.includes(s.stage)) return false
      if (selected.location.length && !selected.location.includes(s.location)) return false
      if (selected.revenue.length && !selected.revenue.includes(s.revenueBand)) return false
      if (selected.funding.length && !selected.funding.includes(s.fundingStage)) return false
      if (selected.team.length && !selected.team.includes(teamSizeBucket(s.teamSize))) return false
      if (selected.traction.length && !selected.traction.includes(tractionLevel(s))) return false
      return true
    })
  }, [query, selected])

  return (
    <>
      <PageTitle eyebrow="Founder Discovery" title="Find your next investment" />

      <div className="grid lg:grid-cols-4 gap-6">
        <aside className="lg:col-span-1">
          <Card className="p-5 lg:sticky lg:top-24">
            <FilterBar query={query} onQuery={setQuery} groups={GROUPS} selected={selected} onToggle={toggle} onClear={clear} placeholder="Search startups…" />
          </Card>
        </aside>

        <div className="lg:col-span-3">
          <p className="text-sm text-bone2 mb-4">{results.length} startups match your thesis</p>
          {results.length === 0 ? (
            <EmptyState title="No matches" sub="Broaden your filters to see more founders." />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
              {results.map((s) => {
                const connected = connections.includes(s.id)
                return (
                  <Card key={s.id} hover className="p-6 flex flex-col">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <img src={s.logo} alt={s.name} className="h-11 w-11 rounded-lg bg-white object-contain p-1.5" />
                        <div>
                          <Link to={`/investor/founder/${s.id}`} data-cursor="hover"><h3 className="font-display text-xl text-bone tracking-crush hover:text-acid transition-colors">{s.name}</h3></Link>
                          <p className="text-[11px] text-bone2">{s.industry} · {s.stage} · {s.location}</p>
                          <p className="text-[11px] text-bone2/80 mt-0.5">{s.revenueBand} rev · {s.teamSize} team · {s.funding}</p>
                        </div>
                      </div>
                      <div className="text-center shrink-0"><span className="font-display text-2xl text-acid leading-none">{s.readiness}</span><span className="block text-[10px] text-bone2">READY</span></div>
                    </div>
                    <p className="text-sm text-bone2 mt-3 flex-1">{s.tagline}</p>
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      {s.metrics.slice(0, 3).map((m) => (
                        <div key={m.label} className="rounded-lg bg-bone/5 p-2 text-center">
                          <p className="text-sm text-bone font-display leading-none">{m.value}</p>
                          <p className="text-[9px] text-bone2 mt-1">{m.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-5">
                      <Button to={`/investor/founder/${s.id}`} variant="ghost" size="sm">View profile</Button>
                      <Button size="sm" variant={connected ? 'ghost' : 'primary'} onClick={() => toggleConnect(s.id)}>
                        {connected ? '✓ Connected' : 'Connect'}
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
