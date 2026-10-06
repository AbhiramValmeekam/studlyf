import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { useSeo } from '../../lib/seo'
import { ECOSYSTEMS } from '../../lib/ecosystems'
import { Button } from '../../components/ui/Button'
import { Chip } from '../../components/ui/atoms'
import { Input } from '../../components/ui/Field'
import { StatusPill } from '../../components/ecosystem/EcosystemSelector'
import { LoadingBlock, Notice, label } from '../../components/ecosystem/product'
import { EmptyState } from '../../components/ui/atoms'

const ACTION_TEXT = { ACTIVE: 'Approve', REJECTED: 'Reject', SUSPENDED: 'Suspend', PENDING: 'Reopen' }

function Details({ d }) {
  return (
    <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
      {Object.entries(d)
        .filter(([, v]) => v !== null && v !== '' && !(Array.isArray(v) && !v.length))
        .map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <dt className="shrink-0 text-mute">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}:</dt>
            <dd className="min-w-0 break-words text-bone">{Array.isArray(v) ? v.map(label).join(', ') : typeof v === 'string' && /^https?:/.test(v) ? <a href={v} target="_blank" rel="noreferrer" className="text-acid hover:underline">{v}</a> : String(v)}</dd>
          </div>
        ))}
    </dl>
  )
}

function RequestRow({ r, canDecide, onDone }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const decide = async (status) => {
    setBusy(true)
    setError('')
    try {
      await api.setAccessStatus(r.ecosystem, r.id, { status, note: note || undefined })
      setNote('')
      onDone()
    } catch (err) {
      setError(err.details?.[0]?.message || err.message)
    } finally {
      setBusy(false)
    }
  }
  const e = ECOSYSTEMS[r.ecosystem]
  return (
    <article className="card-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={`eyebrow ${e.accent}`}>{e.label}</p>
          <p className="mt-1 font-semibold text-bone">{r.details.firmName || r.details.companyName || r.details.name}</p>
          <p className="text-sm text-mute">
            {r.applicant?.name} · {r.applicant?.email} · submitted {formatDate(r.submittedAt)}
          </p>
        </div>
        <StatusPill status={r.status} />
      </div>
      <Details d={r.details} />
      {r.statusNote && <p className="mt-3 text-sm text-mute">Last note: <span className="text-bone">{r.statusNote}</span></p>}
      {canDecide && r.nextStatuses.length > 0 && (
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
          <Input aria-label="Note to applicant" placeholder="Note shown to the applicant (required to reject or suspend)" value={note} onChange={(ev) => setNote(ev.target.value)} />
          <div className="flex shrink-0 gap-2">
            {r.nextStatuses.map((s) => (
              <Button key={s} size="sm" variant={s === 'ACTIVE' ? 'primary' : 'outline'} magnetic={false} disabled={busy} onClick={() => decide(s)}>
                {ACTION_TEXT[s]}
              </Button>
            ))}
          </div>
        </div>
      )}
      {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
    </article>
  )
}

/** /admin — the ecosystem verification queue (investors, HR teams, organizations). */
export default function AccessRequests() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const canDecide = user?.admin?.level === 'SUPER_ADMIN'
  const [ecosystem, setEcosystem] = useState('')
  const [status, setStatus] = useState('PENDING')
  useSeo({ title: 'Access requests · STUDLYF admin', description: 'Verify investors, HR teams and organizations.' })
  const q = useQuery({
    queryKey: ['admin', 'access', ecosystem, status],
    queryFn: async () => {
      const { data, meta } = await api.accessRequests({ ecosystem: ecosystem || undefined, status: status || undefined, pageSize: 100 })
      return { items: data ?? [], meta }
    },
  })
  return (
    <div className="wrap pb-24 pt-32 md:pt-40">
      <p className="eyebrow mb-3">STUDLYF admin</p>
      <h1 className="display-face text-[clamp(2.2rem,5vw,3.6rem)] leading-[0.98] tracking-tight">Ecosystem verification</h1>
      <p className="mt-3 max-w-2xl text-mute">Investors, HR teams and organizations only get access after a STUDLYF admin approves them. Every decision is audited and notifies the applicant.</p>
      {!canDecide && <div className="mt-6"><Notice tone="warn">You can review the queue; approving, rejecting and suspending needs a super admin.</Notice></div>}
      <div className="mb-6 mt-8 flex flex-wrap gap-2">
        {['', 'INVESTOR', 'HR', 'ORGANIZER'].map((k) => (
          <Chip key={k || 'all'} active={ecosystem === k} onClick={() => setEcosystem(k)}>
            {k ? ECOSYSTEMS[k].plural : 'All ecosystems'}
          </Chip>
        ))}
        <span className="mx-2 hidden h-8 w-px bg-line/15 sm:block" />
        {['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED', ''].map((s) => (
          <Chip key={s || 'any'} active={status === s} onClick={() => setStatus(s)}>
            {s ? label(s) : 'Any status'}
          </Chip>
        ))}
      </div>
      {q.isLoading ? (
        <LoadingBlock />
      ) : q.isError ? (
        <Notice tone="error">{q.error.message}</Notice>
      ) : q.data.items.length ? (
        <div className="space-y-4">
          {q.data.items.map((r) => (
            <RequestRow key={`${r.ecosystem}:${r.id}`} r={r} canDecide={canDecide} onDone={() => qc.invalidateQueries({ queryKey: ['admin', 'access'] })} />
          ))}
        </div>
      ) : (
        <EmptyState title="Nothing to review" hint="New requests appear here as soon as they’re submitted." />
      )}
    </div>
  )
}
