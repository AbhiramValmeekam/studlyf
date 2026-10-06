import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { Button } from '../../components/ui/Button'
import { Chip } from '../../components/ui/atoms'
import { StatusPill } from '../../components/ecosystem/EcosystemSelector'
import { Panel, ProductPage, QueryState, Stat, label } from '../../components/ecosystem/product'

function Bars({ rows, max }) {
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[8rem_1fr_2rem] items-center gap-3 text-sm">
          <span className="truncate text-bone">{label(r.key)}</span>
          <span className="h-2 overflow-hidden rounded-full bg-line/10">
            <span className="block h-full rounded-full bg-flare/80" style={{ width: `${(r.count / Math.max(1, max)) * 100}%` }} />
          </span>
          <span className="text-right font-mono text-xs text-mute">{r.count}</span>
        </li>
      ))}
    </ul>
  )
}

export function InvestorIntelligence({ embedded = false }) {
  const q = useQuery({ queryKey: ['investor', 'intelligence'], queryFn: () => api.investorIntelligence().then((r) => r.data) })
  const d = q.data
  const body = (
    <QueryState query={q}>
      {d && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Discoverable startups" value={d.total} />
            <Stat label="Match your preferences" value={d.matchingPreferences} accent="text-flare" hint="funding stage · industry · type" />
            <Stat label="Updated in 14 days" value={d.updatedLast14Days} />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="By industry"><Bars rows={d.byIndustry} max={d.total} /></Panel>
            <Panel title="By stage"><Bars rows={d.byStage} max={d.total} /></Panel>
            <Panel title="By startup type"><Bars rows={d.byStartupType} max={d.total} /></Panel>
          </div>
          <Panel title="Your preferences" action={<Link to="/investors/preferences" className="text-sm text-flare hover:underline">Edit</Link>}>
            <p className="text-sm text-mute">
              Stages: <span className="text-bone">{d.preferences.stages.map(label).join(', ') || 'any'}</span> · Industries:{' '}
              <span className="text-bone">{d.preferences.sectors.join(', ') || 'any'}</span> · Types:{' '}
              <span className="text-bone">{d.preferences.startupTypes.map(label).join(', ') || 'any'}</span> · Ticket:{' '}
              <span className="text-bone">{d.preferences.checkSize || 'not set'}</span>
            </p>
          </Panel>
        </div>
      )}
    </QueryState>
  )
  if (embedded) return body
  return (
    <ProductPage eco="INVESTOR" title="Investor intelligence" subtitle="Where the discoverable pipeline sits against your preferences. Aggregates only.">
      {body}
    </ProductPage>
  )
}

export default function InvestorDashboard() {
  const q = useQuery({ queryKey: ['investor', 'dashboard'], queryFn: () => api.investorDashboard().then((r) => r.data) })
  const d = q.data
  return (
    <ProductPage
      eco="INVESTOR"
      title={d?.profile ? d.profile.firmName : 'Investor dashboard'}
      subtitle="Discover founders beyond the pitch."
      actions={<Button to="/investors/discover" magnetic={false}>Discover startups</Button>}
    >
      <QueryState query={q}>
        {d && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Stat label="Discoverable" value={d.discoverableStartups} />
              <Stat label="Match you" value={d.intelligence.matchingPreferences} accent="text-flare" />
              <Stat label="Saved" value={d.saved} />
              <Stat label="Pending requests" value={d.connections.pending} />
              <Stat label="Connected" value={d.connections.accepted} />
            </div>
            <Panel title="Recently updated startups" action={<Link to="/investors/startups" className="text-sm text-flare hover:underline">All startups</Link>}>
              <ul className="divide-y divide-line/10">
                {d.recentStartups.map((f) => (
                  <li key={f.id}>
                    <Link to={`/investors/founders/${f.id}`} className="flex items-center justify-between gap-4 py-3 hover:text-flare">
                      <span>
                        <span className="block font-medium text-bone">{f.startup.name}</span>
                        <span className="block text-xs text-mute">{[f.startup.industry, label(f.startup.stage), f.startup.location].filter(Boolean).join(' · ')}</span>
                      </span>
                      <span className="font-mono text-sm text-flare">{f.readiness.score}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
            <InvestorIntelligence embedded />
          </div>
        )}
      </QueryState>
    </ProductPage>
  )
}

export function InvestorConnections() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('')
  const q = useQuery({ queryKey: ['investor', 'connections', status], queryFn: () => api.investorConnections({ status: status || undefined, pageSize: 50 }).then((r) => r.data) })
  const withdraw = async (id) => {
    await api.withdrawConnection(id)
    qc.invalidateQueries({ queryKey: ['investor'] })
  }
  const TONE = { PENDING: 'PENDING', ACCEPTED: 'ACTIVE', DECLINED: 'REJECTED', WITHDRAWN: 'NONE' }
  return (
    <ProductPage eco="INVESTOR" title="Connections" subtitle="Requests you’ve sent and founders who accepted.">
      <div className="mb-6 flex flex-wrap gap-2">
        {['', 'PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN'].map((s) => (
          <Chip key={s || 'all'} active={status === s} onClick={() => setStatus(s)}>
            {s ? label(s) : 'All'}
          </Chip>
        ))}
      </div>
      <QueryState query={q} empty={q.data?.length === 0} emptyTitle="No connections yet" emptyHint="Open a startup in discovery and request a connection.">
        <div className="space-y-3">
          {(q.data ?? []).map((c) => (
            <article key={c.id} className="card-surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Link to={`/investors/founders/${c.founder?.id}`} className="font-semibold text-bone hover:text-flare">
                  {c.founder?.startup.name ?? 'Startup no longer available'}
                </Link>
                <p className="text-sm text-mute">
                  {c.founder?.founder.name} · requested {formatDate(c.createdAt)}
                  {c.contactEmail && (
                    <>
                      {' '}· <a href={`mailto:${c.contactEmail}`} className="text-flare hover:underline">{c.contactEmail}</a>
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill status={TONE[c.status]} />
                {c.status === 'PENDING' && (
                  <button type="button" onClick={() => withdraw(c.id)} className="text-sm text-mute hover:text-flare">
                    Withdraw
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </QueryState>
    </ProductPage>
  )
}
