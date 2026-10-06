import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { StatusPill } from '../../components/ecosystem/EcosystemSelector'
import { Panel, ProductPage, QueryState, Stat, label } from '../../components/ecosystem/product'
import { useOrgRole } from './Onboarding'

// The organizer journey, surfaced as the dashboard's checklist.
const JOURNEY = [
  ['Create a program', '/organizations/opportunities/new'],
  ['Publish it', '/organizations/opportunities'],
  ['Review participants', '/organizations/participants'],
  ['Collect submissions', '/organizations/submissions'],
  ['Assign evaluators', '/organizations/evaluators'],
  ['Rank & pick winners', '/organizations/rankings'],
  ['Issue certificates', '/organizations/certificates'],
]

export function OrgAnalytics({ embedded = false }) {
  const q = useQuery({ queryKey: ['organization', 'analytics'], queryFn: () => api.orgAnalytics().then((r) => r.data) })
  const rows = q.data ?? []
  const max = Math.max(1, ...rows.map((r) => r.participants + r.submissions))
  const body = (
    <QueryState query={q} empty={!rows.length} emptyTitle="No programs yet" emptyHint="Analytics appear once you run a program.">
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.opportunity.id} className="card-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold text-bone">{r.opportunity.title}</p>
              <span className="text-xs text-mute">{label(r.opportunity.type)} · {label(r.opportunity.status)}</span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-4">
              {[['Participants', r.participants], ['Submissions', r.submissions], ['Evaluated', r.evaluationsCompleted], ['Winners', r.winners]].map(([k, v]) => (
                <div key={k}>
                  <div className="h-1.5 overflow-hidden rounded-full bg-line/10">
                    <div className="h-full rounded-full bg-amber-300/80" style={{ width: `${(v / max) * 100}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-mute"><span className="text-bone">{v}</span> {k.toLowerCase()}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </QueryState>
  )
  if (embedded) return body
  return (
    <ProductPage eco="ORGANIZER" title="Analytics" subtitle="The funnel of every program: registrations → submissions → evaluations → winners.">
      {body}
    </ProductPage>
  )
}

export default function OrgDashboard() {
  const { role, canManagePrograms } = useOrgRole()
  const q = useQuery({ queryKey: ['organization', 'dashboard'], queryFn: () => api.orgDashboard().then((r) => r.data) })
  const d = q.data
  return (
    <ProductPage
      eco="ORGANIZER"
      title={d?.organization.name ?? 'Organization'}
      subtitle={`Build programs. Bring people together. Measure what they create.${role ? ` · Your role: ${label(role)}` : ''}`}
      actions={canManagePrograms && <Button to="/organizations/opportunities/new" magnetic={false}>Create program</Button>}
    >
      <QueryState query={q}>
        {d && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <Stat label="Live programs" value={d.counts.published} accent="text-amber-300" />
              <Stat label="Drafts" value={d.counts.drafts} />
              <Stat label="Participants" value={d.counts.participants} />
              <Stat label="Submissions" value={d.counts.submissions} />
              <Stat label="Evaluated" value={d.counts.evaluationsCompleted} />
              <Stat label="Certificates" value={d.counts.certificates} />
            </div>
            <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
              <Panel title="Programs" action={<Link to="/organizations/opportunities" className="text-sm text-amber-300 hover:underline">All programs</Link>}>
                {d.recentOpportunities.length ? (
                  <ul className="divide-y divide-line/10">
                    {d.recentOpportunities.map((o) => (
                      <li key={o.id}>
                        <Link to={`/organizations/opportunities/${o.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-amber-300">
                          <span>
                            <span className="block font-medium text-bone">{o.title}</span>
                            <span className="block text-xs text-mute">{label(o.type)} · {o.applications} participants · {o.submissions} submissions</span>
                          </span>
                          <StatusPill status={o.status === 'PUBLISHED' ? 'ACTIVE' : 'ONBOARDING'} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-mute">No programs yet — create your first hackathon or challenge.</p>
                )}
              </Panel>
              <Panel title="Program journey">
                <ol className="space-y-2">
                  {JOURNEY.map(([t, to], i) => (
                    <li key={t}>
                      <Link to={to} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm hover:bg-line/[0.05]">
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-amber-300/15 font-mono text-[11px] text-amber-300">{i + 1}</span>
                        <span className="text-bone">{t}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </Panel>
            </div>
            <h2 className="pt-4 text-lg font-semibold text-bone">Analytics</h2>
            <OrgAnalytics embedded />
          </div>
        )}
      </QueryState>
    </ProductPage>
  )
}
