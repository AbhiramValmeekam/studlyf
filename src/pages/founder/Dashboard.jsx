import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { Button } from '../../components/ui/Button'
import { Panel, ProductPage, QueryState, Stat, label } from '../../components/ecosystem/product'
import { AREA_LINK, ReadinessMeter } from './shared'
import { ConnectionCard } from './Investors'

export default function FounderDashboard() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['founder', 'dashboard'], queryFn: () => api.founderDashboard().then((r) => r.data) })
  const d = q.data
  const p = d?.profile
  const next = p?.readiness.areas.find((a) => !a.complete)

  return (
    <ProductPage
      eco="FOUNDER"
      title={p ? p.startup.name : 'Founder dashboard'}
      subtitle={p?.startup.oneLiner}
      actions={
        <>
          <Button to="/founders/workspace" magnetic={false}>Open workspace</Button>
          <Button to="/founders/updates" variant="outline" magnetic={false}>Post an update</Button>
        </>
      }
    >
      <QueryState query={q}>
        {d && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Readiness" value={`${p.readiness.score}`} hint="out of 100" accent="text-violet" />
              <Stat label="Stage" value={label(p.startup.stage)} hint={label(p.startup.fundingStage)} />
              <Stat label="Investor requests" value={d.connections.pending} hint="waiting for you" />
              <Stat label="Connected investors" value={d.connections.accepted} />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
              <Panel title="Startup readiness" action={<Link to="/founders/readiness" className="text-sm text-violet hover:underline">Full assessment</Link>}>
                <ReadinessMeter readiness={p.readiness} />
                {next && (
                  <Link to={AREA_LINK[next.key]} className="mt-6 block rounded-xl border border-violet/30 bg-violet/[0.07] p-4 text-sm hover:border-violet/60">
                    <span className="block font-medium text-bone">Next best step: {next.label}</span>
                    <span className="text-mute">{next.checks.filter((c) => !c.done).map((c) => c.label).join(' · ')}</span>
                  </Link>
                )}
              </Panel>

              <div className="space-y-6">
                <Panel title="Investor requests" action={<Link to="/founders/investors" className="text-sm text-violet hover:underline">All requests</Link>}>
                  {d.connections.recentPending.length ? (
                    <div className="space-y-3">
                      {d.connections.recentPending.map((c) => (
                        <ConnectionCard key={c.id} c={c} onDone={() => qc.invalidateQueries({ queryKey: ['founder'] })} compact />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-mute">
                      {p.discoverable
                        ? 'No pending requests. Verified investors can find you while your profile is discoverable.'
                        : 'Your startup is hidden from investors. Turn on discovery in your founder profile.'}
                    </p>
                  )}
                </Panel>
                <Panel title="Latest update" action={<Link to="/founders/updates" className="text-sm text-violet hover:underline">Updates</Link>}>
                  {p.updates[0] ? (
                    <div>
                      <p className="font-medium text-bone">{p.updates[0].title}</p>
                      <p className="mt-1 line-clamp-3 text-sm text-mute">{p.updates[0].body}</p>
                      <p className="mt-2 text-xs text-mute">{formatDate(p.updates[0].createdAt)}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-mute">Share progress with investors — a new pilot, a hire, a milestone.</p>
                  )}
                </Panel>
              </div>
            </div>
          </div>
        )}
      </QueryState>
    </ProductPage>
  )
}
