import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  candidates, ROLES, SKILLS, LOCATIONS, AVAILABILITY,
  EXPERIENCE, GITHUB_ACTIVITY, EVAL_BANDS, HACKATHON_BANDS,
  evalBand, hackathonBand,
} from '../../data/mock/talent'
import { useSession } from '../../context/SessionContext'
import { Card, Tag, Button, Avatar, PageTitle, EmptyState } from '../../components/ui/primitives'
import { FilterBar } from '../../components/ui/FilterBar'

const GROUPS = [
  { key: 'role', label: 'Role', options: ROLES },
  { key: 'skills', label: 'Skills', options: SKILLS },
  { key: 'location', label: 'Location', options: LOCATIONS },
  { key: 'availability', label: 'Availability', options: AVAILABILITY },
  { key: 'experience', label: 'Experience', options: EXPERIENCE },
  { key: 'github', label: 'GitHub activity', options: GITHUB_ACTIVITY },
  { key: 'evaluation', label: 'Project evaluation', options: EVAL_BANDS },
  { key: 'hackathons', label: 'Hackathons', options: HACKATHON_BANDS },
]

const EMPTY = { role: [], skills: [], location: [], availability: [], experience: [], github: [], evaluation: [], hackathons: [] }

/**
 * HR Talent Discovery — filter builders by role, skills, location, availability
 * and evidence. Shortlist toggling persists into the hiring pipeline.
 */
export default function HrTalent() {
  const { shortlist, toggleShortlist } = useSession()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(EMPTY)

  const toggle = (key, opt) =>
    setSelected((s) => ({ ...s, [key]: s[key].includes(opt) ? s[key].filter((v) => v !== opt) : [...s[key], opt] }))
  const clear = () => setSelected(EMPTY)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return candidates.filter((c) => {
      if (q && !`${c.name} ${c.role} ${c.summary}`.toLowerCase().includes(q)) return false
      if (selected.role.length && !selected.role.includes(c.role)) return false
      if (selected.location.length && !selected.location.includes(c.location)) return false
      if (selected.availability.length && !selected.availability.includes(c.availability)) return false
      if (selected.skills.length && !selected.skills.some((s) => c.skills.includes(s))) return false
      if (selected.experience.length && !selected.experience.includes(c.experience)) return false
      if (selected.github.length && !selected.github.includes(c.githubActivity)) return false
      if (selected.evaluation.length && !selected.evaluation.includes(evalBand(c.topEvaluation))) return false
      if (selected.hackathons.length && !selected.hackathons.includes(hackathonBand(c.hackathons))) return false
      return true
    })
  }, [query, selected])

  return (
    <>
      <PageTitle eyebrow="Talent Discovery" title="Discover builders" />

      <div className="grid lg:grid-cols-4 gap-6">
        <aside className="lg:col-span-1">
          <Card className="p-5 lg:sticky lg:top-24">
            <FilterBar query={query} onQuery={setQuery} groups={GROUPS} selected={selected} onToggle={toggle} onClear={clear} placeholder="Search builders…" />
          </Card>
        </aside>

        <div className="lg:col-span-3">
          <p className="text-sm text-bone2 mb-4">{results.length} builders match</p>
          {results.length === 0 ? (
            <EmptyState title="No builders match" sub="Loosen a filter to widen your search." />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
              {results.map((c) => {
                const listed = shortlist.includes(c.id)
                return (
                  <Card key={c.id} hover className="p-6 flex flex-col">
                    <div className="flex items-start gap-3">
                      <Avatar src={c.avatar} name={c.name} size={52} />
                      <div className="flex-1 min-w-0">
                        <Link to={`/hr/candidate/${c.id}`} data-cursor="hover"><h3 className="font-display text-lg text-bone tracking-crush hover:text-acid transition-colors">{c.name}</h3></Link>
                        <p className="text-[11px] text-bone2">{c.role} · {c.location} · {c.availability}</p>
                      </div>
                      <div className="text-center shrink-0"><span className="font-display text-xl text-acid leading-none">{c.topEvaluation}</span><span className="block text-[9px] text-bone2">EVAL</span></div>
                    </div>
                    <p className="text-sm text-bone2 mt-3 flex-1">{c.summary}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">{c.skills.map((s) => <Tag key={s}>{s}</Tag>)}</div>
                    <div className="flex items-center gap-3 mt-4 text-[11px] text-bone2">
                      <span>◇ GitHub: {c.githubActivity}</span><span>◇ {c.hackathons} hackathons</span>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button to={`/hr/candidate/${c.id}`} variant="ghost" size="sm">View profile</Button>
                      <Button size="sm" variant={listed ? 'ghost' : 'primary'} onClick={() => toggleShortlist(c.id)}>
                        {listed ? '✓ Shortlisted' : 'Shortlist'}
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
