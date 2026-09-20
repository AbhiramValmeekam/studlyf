import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { opportunities, OPP_TYPES, OPP_SKILLS, OPP_MODES } from '../../data/mock/opportunities'
import { useSession } from '../../context/SessionContext'
import { Card, Tag, Badge, PageTitle, EmptyState } from '../../components/ui/primitives'
import { FilterBar } from '../../components/ui/FilterBar'

const GROUPS = [
  { key: 'type', label: 'Type', options: OPP_TYPES },
  { key: 'skills', label: 'Skills', options: OPP_SKILLS },
  { key: 'mode', label: 'Mode', options: OPP_MODES },
]

/**
 * Opportunities — searchable, filterable list of hackathons, competitions,
 * internships, jobs, challenges and fellowships. Save toggling persists in
 * session so it shows on the dashboard.
 */
export default function Opportunities() {
  const { saved, toggleSave } = useSession()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState({ type: [], skills: [], mode: [] })

  const toggle = (key, opt) =>
    setSelected((s) => ({
      ...s,
      [key]: s[key].includes(opt) ? s[key].filter((v) => v !== opt) : [...s[key], opt],
    }))
  const clear = () => setSelected({ type: [], skills: [], mode: [] })

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return opportunities.filter((o) => {
      if (q && !`${o.title} ${o.org} ${o.type}`.toLowerCase().includes(q)) return false
      if (selected.type.length && !selected.type.includes(o.type)) return false
      if (selected.mode.length && !selected.mode.includes(o.mode)) return false
      if (selected.skills.length && !selected.skills.some((s) => o.skills.includes(s))) return false
      return true
    })
  }, [query, selected])

  return (
    <>
      <PageTitle eyebrow="Opportunities" title="Find your next build" />

      <div className="grid lg:grid-cols-4 gap-6">
        {/* filters */}
        <aside className="lg:col-span-1">
          <Card className="p-5 lg:sticky lg:top-24">
            <FilterBar
              query={query}
              onQuery={setQuery}
              groups={GROUPS}
              selected={selected}
              onToggle={toggle}
              onClear={clear}
              placeholder="Search opportunities…"
            />
          </Card>
        </aside>

        {/* results */}
        <div className="lg:col-span-3 space-y-4">
          <p className="text-sm text-bone2">{results.length} opportunities</p>
          {results.length === 0 ? (
            <EmptyState title="Nothing matches" sub="Try clearing a filter or broadening your search." />
          ) : (
            results.map((o) => (
              <Card key={o.id} hover className="p-6">
                <div className="flex items-start gap-4">
                  <img src={o.orgLogo} alt={o.org} className="h-11 w-11 rounded-lg bg-white object-contain p-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Tag tone="acid">{o.type}</Tag>
                      {o.recommended && <Tag tone="violet">Recommended</Tag>}
                    </div>
                    <Link to={`/builder/opportunities/${o.id}`} data-cursor="hover">
                      <h3 className="font-display text-xl text-bone tracking-crush hover:text-acid transition-colors">{o.title}</h3>
                    </Link>
                    <p className="text-sm text-bone2 mt-1">{o.org} · {o.location} · {o.mode}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {o.skills.map((s) => <Tag key={s}>{s}</Tag>)}
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-2">
                    <span className="text-sm text-acid font-medium">{o.prize}</span>
                    <span className="text-[11px] text-bone2">Closes {new Date(o.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    <button
                      onClick={() => toggleSave(o.id)}
                      data-cursor="hover"
                      className={`text-xs mt-1 transition-colors ${saved.includes(o.id) ? 'text-acid' : 'text-bone2 hover:text-bone'}`}
                    >
                      {saved.includes(o.id) ? '★ Saved' : '☆ Save'}
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </>
  )
}
