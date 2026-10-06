import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { FUNDING_STAGES, STARTUP_STAGES, STARTUP_TYPES } from '../../lib/enums'
import { Avatar } from '../../components/ui/atoms'
import { Input, Select } from '../../components/ui/Field'
import { Pagination } from '../../components/ui/Pagination'
import { StatusPill } from '../../components/ecosystem/EcosystemSelector'
import { ProductPage, QueryState, label } from '../../components/ecosystem/product'

const CONNECTION_TONE = { PENDING: 'PENDING', ACCEPTED: 'ACTIVE', DECLINED: 'REJECTED', WITHDRAWN: 'NONE' }
const CONNECTION_TEXT = { PENDING: 'Request sent', ACCEPTED: 'Connected', DECLINED: 'Declined', WITHDRAWN: 'Withdrawn' }

export function SaveButton({ founder, onChange }) {
  const [busy, setBusy] = useState(false)
  const toggle = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api.saveFounder(founder.id, !founder.saved)
      onChange?.()
    } finally {
      setBusy(false)
    }
  }
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={!!founder.saved}
      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${founder.saved ? 'border-flare/50 bg-flare/10 text-flare' : 'border-line/15 text-mute hover:text-bone'}`}
    >
      {founder.saved ? '★ Saved' : '☆ Save'}
    </button>
  )
}

function Meta({ f }) {
  const s = f.startup
  return (
    <p className="text-xs text-mute">
      {[s.industry, label(s.type) !== '—' ? label(s.type) : null, s.location, label(s.stage), label(s.fundingStage)].filter((x) => x && x !== '—').join(' · ')}
    </p>
  )
}

function StartupCard({ f, onChange }) {
  return (
    <Link to={`/investors/founders/${f.id}`} className="card-surface group flex h-full flex-col p-5 transition-colors hover:border-line/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-bone group-hover:text-flare">{f.startup.name}</p>
          <Meta f={f} />
        </div>
        <span className="text-right">
          <span className="block font-mono text-sm text-flare">{f.readiness.score}</span>
          <span className="block text-[10px] text-mute">readiness</span>
        </span>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-mute">{f.startup.oneLiner}</p>
      {f.startup.traction?.users && <p className="mt-3 text-sm text-bone">▲ {f.startup.traction.users}</p>}
      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <span className="flex items-center gap-2 text-sm text-mute">
          <Avatar src={f.founder.photo?.url} name={f.founder.name} size={24} /> {f.founder.name}
        </span>
        <span className="flex items-center gap-2">
          {f.connection && <StatusPill status={CONNECTION_TONE[f.connection.status]} />}
          <SaveButton founder={f} onChange={onChange} />
        </span>
      </div>
    </Link>
  )
}

function FounderRow({ f, onChange }) {
  return (
    <Link to={`/investors/founders/${f.id}`} className="card-surface flex flex-col gap-4 p-5 transition-colors hover:border-line/30 sm:flex-row sm:items-center">
      <Avatar src={f.founder.photo?.url} name={f.founder.name} size={48} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-bone">{f.founder.name}</p>
        <p className="text-sm text-mute">{f.founder.headline || 'Founder'}</p>
        <p className="mt-1 text-xs text-mute">
          Building <span className="text-bone">{f.startup.name}</span> · {f.founder.location || f.startup.location || 'Location not shared'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {f.connection && <span className="text-xs text-mute">{CONNECTION_TEXT[f.connection.status]}</span>}
        <SaveButton founder={f} onChange={onChange} />
      </div>
    </Link>
  )
}

function StartupTable({ items }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line/12">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-line/[0.04] text-xs uppercase tracking-[0.1em] text-mute">
          <tr>
            {['Startup', 'Industry', 'Type', 'Stage', 'Funding', 'Traction', 'Readiness'].map((h) => (
              <th key={h} className="px-4 py-3 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((f) => (
            <tr key={f.id} className="border-t border-line/10 hover:bg-line/[0.03]">
              <td className="px-4 py-3">
                <Link to={`/investors/founders/${f.id}`} className="font-medium text-bone hover:text-flare">{f.startup.name}</Link>
              </td>
              <td className="px-4 py-3 text-mute">{f.startup.industry || '—'}</td>
              <td className="px-4 py-3 text-mute">{label(f.startup.type)}</td>
              <td className="px-4 py-3 text-mute">{label(f.startup.stage)}</td>
              <td className="px-4 py-3 text-mute">{label(f.startup.fundingStage)}</td>
              <td className="max-w-[16rem] truncate px-4 py-3 text-mute">{f.startup.traction?.users || f.startup.traction?.revenue || '—'}</td>
              <td className="px-4 py-3 font-mono text-flare">{f.readiness.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const VARIANTS = {
  discover: { title: 'Discover startups', subtitle: 'Filter by industry, geography, stage, funding stage and startup type.' },
  founders: { title: 'Founder discovery', subtitle: 'The people behind the startups — backgrounds, headlines and what they’re building.' },
  startups: { title: 'Startup discovery', subtitle: 'Every discoverable startup side by side.' },
  saved: { title: 'Saved startups', subtitle: 'Your private shortlist. Founders are never told you saved them.' },
}

/** Investor discovery: one data source, four views (discover / founders / startups / saved). */
export default function InvestorDiscover({ variant = 'discover' }) {
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const f = Object.fromEntries(['q', 'industry', 'stage', 'fundingStage', 'startupType', 'location'].map((k) => [k, params.get(k) || '']))
  const page = Number(params.get('page') || 1)
  const query = { ...f, page, pageSize: variant === 'startups' ? 25 : 12, saved: variant === 'saved' ? 'true' : undefined }
  const facets = useQuery({ queryKey: ['investor', 'facets'], queryFn: () => api.investorFacets().then((r) => r.data) })
  const q = useQuery({
    queryKey: ['investor', 'founders', variant, query],
    queryFn: async () => {
      const { data, meta } = await api.investorFounders(query)
      return { items: data ?? [], meta }
    },
    placeholderData: keepPreviousData,
  })
  const set = (k) => (e) => {
    const next = new URLSearchParams(params)
    if (e.target.value) next.set(k, e.target.value)
    else next.delete(k)
    next.delete('page')
    setParams(next, { replace: true })
  }
  const refresh = () => qc.invalidateQueries({ queryKey: ['investor'] })
  const items = q.data?.items ?? []

  return (
    <ProductPage eco="INVESTOR" title={VARIANTS[variant].title} subtitle={VARIANTS[variant].subtitle}>
      {variant !== 'saved' && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Input aria-label="Search" placeholder="Search startups, founders…" value={f.q} onChange={set('q')} className="lg:col-span-2" />
          <Select aria-label="Industry" value={f.industry} onChange={set('industry')}>
            <option value="">All industries</option>
            {(facets.data?.industries ?? []).map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </Select>
          <Select aria-label="Stage" value={f.stage} onChange={set('stage')}>
            <option value="">Any stage</option>
            {STARTUP_STAGES.map((s) => (
              <option key={s} value={s}>{label(s)}</option>
            ))}
          </Select>
          <Select aria-label="Funding stage" value={f.fundingStage} onChange={set('fundingStage')}>
            <option value="">Any funding</option>
            {FUNDING_STAGES.map((s) => (
              <option key={s} value={s}>{label(s)}</option>
            ))}
          </Select>
          <Select aria-label="Startup type" value={f.startupType} onChange={set('startupType')}>
            <option value="">Any type</option>
            {STARTUP_TYPES.map((s) => (
              <option key={s} value={s}>{label(s)}</option>
            ))}
          </Select>
          <Input aria-label="Geography" placeholder="City or region" value={f.location} onChange={set('location')} className="lg:col-span-2" />
        </div>
      )}
      <QueryState
        query={q}
        empty={!items.length}
        emptyTitle={variant === 'saved' ? 'No saved startups yet' : 'No startups match'}
        emptyHint={variant === 'saved' ? 'Use ☆ Save on any startup to build your shortlist.' : 'Try removing a filter.'}
      >
        {variant === 'startups' ? (
          <StartupTable items={items} />
        ) : variant === 'founders' ? (
          <div className="space-y-3">
            {items.map((x) => (
              <FounderRow key={x.id} f={x} onChange={refresh} />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((x) => (
              <StartupCard key={x.id} f={x} onChange={refresh} />
            ))}
          </div>
        )}
        {q.data?.meta?.totalPages > 1 && (
          <div className="mt-8">
            <Pagination
              page={page}
              totalPages={q.data.meta.totalPages}
              onChange={(p) => {
                const next = new URLSearchParams(params)
                next.set('page', String(p))
                setParams(next)
              }}
            />
          </div>
        )}
      </QueryState>
    </ProductPage>
  )
}
