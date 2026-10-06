import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { Avatar } from '../../components/ui/atoms'
import { Button } from '../../components/ui/Button'
import { Textarea } from '../../components/ui/Field'
import { Notice, Panel, ProductPage, QueryState, Stat, label } from '../../components/ecosystem/product'
import { SaveButton } from './Discover'

const WORKSPACE = [
  ['problem', 'Problem'],
  ['targetCustomer', 'Target customer'],
  ['marketAnalysis', 'Market analysis'],
  ['competitors', 'Competitors'],
  ['businessModel', 'Business model'],
  ['gtmStrategy', 'Go-to-market'],
  ['marketingStrategy', 'Marketing'],
  ['pitchNotes', 'Pitch'],
  ['fundingNeeds', 'Funding needs'],
]

function Connect({ f, onDone }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const c = f.connection
  const send = async () => {
    setBusy(true)
    setError('')
    try {
      await api.requestConnection({ founderProfileId: f.id, message: message || undefined })
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  const withdraw = async () => {
    setBusy(true)
    try {
      await api.withdrawConnection(c.id)
      onDone()
    } finally {
      setBusy(false)
    }
  }
  if (c?.status === 'ACCEPTED') return <Notice tone="success">You’re connected. Their workspace and contact email are shown below.</Notice>
  if (c?.status === 'DECLINED') return <Notice tone="info">The founder declined this connection.</Notice>
  if (c?.status === 'PENDING')
    return (
      <div className="space-y-3">
        <Notice tone="warn">Request sent {formatDate(c.createdAt)} — waiting for the founder.</Notice>
        <Button size="sm" variant="outline" magnetic={false} disabled={busy} onClick={withdraw}>
          Withdraw request
        </Button>
      </div>
    )
  return (
    <div className="space-y-3">
      <Textarea rows={3} placeholder="Why you’d like to connect (optional, shown to the founder)" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} />
      {error && <Notice tone="error">{error}</Notice>}
      <Button magnetic={false} disabled={busy} onClick={send}>
        Request connection
      </Button>
      <p className="text-xs text-mute">The founder decides. If they accept, their strategy workspace and email are shared with you.</p>
    </div>
  )
}

export default function FounderDetail() {
  const { id } = useParams()
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['investor', 'founder', id], queryFn: () => api.investorFounder(id).then((r) => r.data) })
  const f = q.data
  const refresh = () => qc.invalidateQueries({ queryKey: ['investor'] })

  return (
    <ProductPage
      eco="INVESTOR"
      title={f?.startup.name ?? 'Startup'}
      subtitle={f?.startup.oneLiner}
      actions={f && <SaveButton founder={f} onChange={refresh} />}
    >
      <Link to="/investors/discover" className="mb-6 inline-block text-sm text-mute hover:text-bone">← Back to discovery</Link>
      <QueryState query={q}>
        {f && (
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <Stat label="Readiness" value={f.readiness.score} hint="out of 100" accent="text-flare" />
                <Stat label="Stage" value={label(f.startup.stage)} hint={label(f.startup.fundingStage)} />
                <Stat label="Team" value={f.startup.teamSize ?? '—'} hint={f.startup.foundedYear ? `Founded ${f.startup.foundedYear}` : null} />
              </div>
              <Panel title="Startup">
                <p className="whitespace-pre-line text-sm text-bone">{f.startup.description || 'No product description yet.'}</p>
                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  {[
                    ['Industry', f.startup.industry],
                    ['Type', label(f.startup.type)],
                    ['Location', f.startup.location],
                    ['Website', f.startup.website],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs text-mute">{k}</dt>
                      <dd className="text-bone">{k === 'Website' && v ? <a href={v} target="_blank" rel="noreferrer" className="text-flare hover:underline">{v}</a> : v || '—'}</dd>
                    </div>
                  ))}
                </dl>
                {f.startup.teamDescription && <p className="mt-5 text-sm text-mute"><span className="text-bone">Team: </span>{f.startup.teamDescription}</p>}
              </Panel>
              <Panel title="Traction">
                <dl className="grid gap-3 text-sm sm:grid-cols-3">
                  {[['Users', 'users'], ['Revenue', 'revenue'], ['Growth', 'growth']].map(([k, key]) => (
                    <div key={key} className="rounded-xl bg-line/[0.04] p-3">
                      <dt className="text-xs text-mute">{k}</dt>
                      <dd className="text-bone">{f.startup.traction[key] || '—'}</dd>
                    </div>
                  ))}
                </dl>
                {f.startup.traction.highlights && <p className="mt-4 text-sm text-mute">{f.startup.traction.highlights}</p>}
              </Panel>
              <Panel title="Strategy workspace">
                {f.workspace ? (
                  <div className="space-y-5">
                    {WORKSPACE.filter(([k]) => f.workspace[k]).map(([k, t]) => (
                      <div key={k}>
                        <p className="text-xs uppercase tracking-[0.12em] text-mute">{t}</p>
                        <p className="mt-1 whitespace-pre-line text-sm text-bone">{f.workspace[k]}</p>
                      </div>
                    ))}
                    {f.workspace.pitchDeckUrl && (
                      <a href={f.workspace.pitchDeckUrl} target="_blank" rel="noreferrer" className="inline-block text-sm font-medium text-flare hover:underline">
                        Open pitch deck ↗
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-mute">Shared once the founder accepts your connection request.</p>
                )}
              </Panel>
            </div>

            <div className="space-y-6">
              <Panel title="Founder">
                <div className="flex items-center gap-3">
                  <Avatar src={f.founder.photo?.url} name={f.founder.name} size={48} />
                  <div>
                    <p className="font-semibold text-bone">{f.founder.name}</p>
                    <p className="text-sm text-mute">{f.founder.headline}</p>
                  </div>
                </div>
                {f.bio && <p className="mt-4 text-sm text-mute">{f.bio}</p>}
                {f.founder.linkedin && <a href={f.founder.linkedin} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-flare hover:underline">LinkedIn ↗</a>}
                {f.contactEmail && <p className="mt-3 text-sm text-bone">Contact: <a className="text-flare hover:underline" href={`mailto:${f.contactEmail}`}>{f.contactEmail}</a></p>}
              </Panel>
              <Panel title="Connect">
                <Connect f={f} onDone={refresh} />
              </Panel>
              <Panel title="Readiness by area">
                <ul className="space-y-2.5">
                  {f.readiness.areas.map((a) => (
                    <li key={a.key} className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-3 text-sm">
                      <span className="text-bone">{a.label}</span>
                      <span className="h-1.5 overflow-hidden rounded-full bg-line/10">
                        <span className="block h-full rounded-full bg-flare/80" style={{ width: `${(a.score / a.weight) * 100}%` }} />
                      </span>
                      <span className="text-right font-mono text-xs text-mute">{a.score}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
              <Panel title="Recent updates">
                {f.updates.length ? (
                  <ol className="space-y-4">
                    {f.updates.map((u) => (
                      <li key={u.id}>
                        <p className="text-sm font-medium text-bone">{u.title}</p>
                        <p className="text-sm text-mute">{u.body}</p>
                        <p className="mt-1 text-xs text-mute">{formatDate(u.createdAt)}</p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-mute">No updates posted yet.</p>
                )}
              </Panel>
            </div>
          </div>
        )}
      </QueryState>
    </ProductPage>
  )
}
