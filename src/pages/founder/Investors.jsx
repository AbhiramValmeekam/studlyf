import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { Button } from '../../components/ui/Button'
import { Chip } from '../../components/ui/atoms'
import { StatusPill } from '../../components/ecosystem/EcosystemSelector'
import { Notice, ProductPage, QueryState, label } from '../../components/ecosystem/product'

const CONNECTION_TONE = { PENDING: 'PENDING', ACCEPTED: 'ACTIVE', DECLINED: 'REJECTED', WITHDRAWN: 'NONE' }

/** One investor request. Accepting shares the workspace + email with that investor only. */
export function ConnectionCard({ c, onDone, compact = false }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const respond = async (status) => {
    setBusy(true)
    setError('')
    try {
      await api.respondConnection(c.id, status)
      onDone?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  const inv = c.investor
  return (
    <article className="rounded-2xl border border-line/12 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-bone">{inv?.firmName ?? 'Investor'}</p>
          <p className="text-sm text-mute">
            {inv?.name}
            {inv?.title ? ` · ${inv.title}` : ''} · {label(inv?.investorType)}
          </p>
        </div>
        {c.status === 'PENDING' ? <span className="text-xs text-mute">{formatDate(c.createdAt)}</span> : <StatusPill status={CONNECTION_TONE[c.status]} />}
      </div>
      {!compact && (inv?.stages?.length > 0 || inv?.sectors?.length > 0) && (
        <p className="mt-2 text-xs text-mute">
          Invests in {inv.stages.map(label).join(', ') || 'any stage'} · {inv.sectors.join(', ') || 'any sector'}
        </p>
      )}
      {c.message && <p className="mt-3 rounded-xl bg-line/[0.04] p-3 text-sm text-bone">“{c.message}”</p>}
      {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
      {c.status === 'PENDING' && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" magnetic={false} disabled={busy} onClick={() => respond('ACCEPTED')}>
            Accept & share workspace
          </Button>
          <Button size="sm" variant="outline" magnetic={false} disabled={busy} onClick={() => respond('DECLINED')}>
            Decline
          </Button>
        </div>
      )}
    </article>
  )
}

export default function InvestorRequestsPage() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('PENDING')
  const q = useQuery({ queryKey: ['founder', 'connections', status], queryFn: () => api.founderConnections({ status, pageSize: 50 }).then((r) => r.data) })
  return (
    <ProductPage
      eco="FOUNDER"
      title="Investor connections"
      subtitle="Verified investors who want to talk. Accepting shares your strategy workspace and email with that investor — nobody else."
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {['PENDING', 'ACCEPTED', 'DECLINED'].map((s) => (
          <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
            {label(s)}
          </Chip>
        ))}
      </div>
      <QueryState query={q} empty={q.data?.length === 0} emptyTitle="Nothing here yet" emptyHint="Keep your startup discoverable and your readiness high — investors reach out here.">
        <div className="grid gap-4 lg:grid-cols-2">
          {(q.data ?? []).map((c) => (
            <ConnectionCard key={c.id} c={c} onDone={() => qc.invalidateQueries({ queryKey: ['founder'] })} />
          ))}
        </div>
      </QueryState>
    </ProductPage>
  )
}
