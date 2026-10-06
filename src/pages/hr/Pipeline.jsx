import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { HIRING_STAGES } from '../../lib/enums'
import { Avatar } from '../../components/ui/atoms'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Field'
import { Notice, Panel, ProductPage, QueryState, Stat, label } from '../../components/ecosystem/product'

/** The next move for each stage — the HR journey: shortlist → invite → interview → offer → joining. */
const NEXT = {
  SHORTLISTED: ['INVITED', 'Invite to interview'],
  INVITED: ['INTERVIEW', 'Schedule interview'],
  INTERVIEW: ['OFFER', 'Make an offer'],
  OFFER: ['HIRED', 'Mark as joined'],
}

function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export function CandidateCard({ c, onChange }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ role: c.role ?? '', note: c.note ?? '', interviewAt: toLocalInput(c.interviewAt) })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const patch = async (body) => {
    setBusy(true)
    setError('')
    try {
      await api.updateCandidate(c.id, body)
      onChange()
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  const remove = async () => {
    if (!window.confirm('Remove this candidate from your pipeline?')) return
    await api.removeCandidate(c.id)
    onChange()
  }
  const next = NEXT[c.stage]
  const b = c.builder

  return (
    <article className="card-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar src={b.photo?.url} name={b.name} size={40} />
          <div>
            {b.username ? (
              <Link to={`/builders/${b.username}`} className="font-semibold text-bone hover:text-lime-300">{b.name}</Link>
            ) : (
              <p className="font-semibold text-bone">{b.name}</p>
            )}
            <p className="text-sm text-mute">{b.profilePublic ? b.headline || `@${b.username}` : 'Profile is now private'}</p>
          </div>
        </div>
        <span className="rounded-full bg-lime-300/15 px-3 py-1 text-xs text-lime-300">{label(c.stage)}</span>
      </div>
      <p className="mt-3 text-sm text-mute">
        {c.job ? (
          // Came in against an opening — link the role back to the post it belongs to.
          <Link to={`/hr/jobs/${c.job.id}`} className="text-bone hover:text-lime-300">
            {c.role || c.job.title}
          </Link>
        ) : c.role ? (
          <span className="text-bone">{c.role}</span>
        ) : (
          'No role set'
        )}
        {c.interviewAt && <> · Interview {new Date(c.interviewAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</>}
        {' '}· added {formatDate(c.addedAt)}
      </p>
      {c.note && !editing && <p className="mt-2 rounded-xl bg-line/[0.04] p-3 text-sm text-bone">{c.note}</p>}

      {editing && (
        <div className="mt-4 space-y-3">
          <Input aria-label="Role" placeholder="Role (e.g. Frontend Intern)" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
          <Input aria-label="Interview date and time" type="datetime-local" value={draft.interviewAt} onChange={(e) => setDraft({ ...draft, interviewAt: e.target.value })} />
          <Textarea aria-label="Private note" rows={3} placeholder="Private note — only you can see it" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
          <div className="flex gap-2">
            <Button
              size="sm"
              magnetic={false}
              disabled={busy}
              onClick={() => patch({ role: draft.role || null, note: draft.note || null, interviewAt: draft.interviewAt ? new Date(draft.interviewAt).toISOString() : null })}
            >
              Save
            </Button>
            <Button size="sm" variant="ghost" magnetic={false} onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      )}
      {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}

      {!editing && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {next && (
            <Button size="sm" magnetic={false} disabled={busy} onClick={() => patch({ stage: next[0] })}>
              {next[1]}
            </Button>
          )}
          <Select aria-label="Move to stage" value={c.stage} onChange={(e) => patch({ stage: e.target.value })} className="!w-auto !py-1.5 text-sm">
            {HIRING_STAGES.map((s) => (
              <option key={s} value={s}>{label(s)}</option>
            ))}
          </Select>
          <button type="button" onClick={() => setEditing(true)} className="text-sm text-mute hover:text-bone">Edit</button>
          <button type="button" onClick={remove} className="text-sm text-mute hover:text-flare">Remove</button>
        </div>
      )}
      {next?.[0] === 'INVITED' && <p className="mt-3 text-xs text-mute">Inviting notifies the builder with your company name and the role.</p>}
    </article>
  )
}

const PAGES = {
  shortlist: { stages: 'SHORTLISTED', title: 'Shortlist', subtitle: 'Builders you’re considering. Private to you — they aren’t told until you invite them.', empty: 'Shortlist builders from Talent discovery.' },
  invitations: { stages: 'INVITED', title: 'Invitations', subtitle: 'Builders you’ve invited to interview. They were notified with your company and role.', empty: 'Invite someone from your shortlist.' },
  interviews: { stages: 'INTERVIEW', title: 'Interviews', subtitle: 'Scheduled and upcoming interviews, soonest first.', empty: 'Move invited candidates here when you schedule an interview.' },
  offers: { stages: 'OFFER', title: 'Offers', subtitle: 'Offers out. The builder is notified when you make one.', empty: 'No open offers.' },
}

export default function HrPipeline({ page }) {
  const cfg = PAGES[page]
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['hr', 'candidates', cfg.stages], queryFn: () => api.hrCandidates({ stage: cfg.stages }).then((r) => r.data) })
  return (
    <ProductPage
      eco="HR"
      title={cfg.title}
      subtitle={cfg.subtitle}
      actions={page === 'shortlist' && <Button to="/hr/talent" magnetic={false}>Find talent</Button>}
    >
      <QueryState query={q} empty={q.data?.length === 0} emptyTitle={`No ${cfg.title.toLowerCase()} yet`} emptyHint={cfg.empty}>
        <div className="grid gap-4 lg:grid-cols-2">
          {(q.data ?? []).map((c) => (
            <CandidateCard key={c.id} c={c} onChange={() => qc.invalidateQueries({ queryKey: ['hr'] })} />
          ))}
        </div>
      </QueryState>
    </ProductPage>
  )
}

export function HrHiring() {
  const qc = useQueryClient()
  const dash = useQuery({ queryKey: ['hr', 'dashboard'], queryFn: () => api.hrDashboard().then((r) => r.data) })
  const hired = useQuery({ queryKey: ['hr', 'candidates', 'HIRED,REJECTED'], queryFn: () => api.hrCandidates({ stage: 'HIRED,REJECTED' }).then((r) => r.data) })
  const p = dash.data?.pipeline
  return (
    <ProductPage eco="HR" title="Hiring" subtitle="Your funnel from shortlist to joining, and everyone who’s been decided.">
      {p && (
        <div className="mb-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {HIRING_STAGES.map((s) => (
            <Stat key={s} label={label(s)} value={p[s]} accent={s === 'HIRED' ? 'text-lime-300' : 'text-bone'} />
          ))}
        </div>
      )}
      <QueryState query={hired} empty={hired.data?.length === 0} emptyTitle="No decisions yet" emptyHint="Hired and rejected candidates appear here.">
        <div className="grid gap-4 lg:grid-cols-2">
          {(hired.data ?? []).map((c) => (
            <CandidateCard key={c.id} c={c} onChange={() => qc.invalidateQueries({ queryKey: ['hr'] })} />
          ))}
        </div>
      </QueryState>
    </ProductPage>
  )
}

export function HrDashboard() {
  const q = useQuery({ queryKey: ['hr', 'dashboard'], queryFn: () => api.hrDashboard().then((r) => r.data) })
  const d = q.data
  return (
    <ProductPage
      eco="HR"
      title={d?.profile?.companyName ? `${d.profile.companyName} hiring` : 'HR dashboard'}
      subtitle="Find talent through what they’ve built."
      actions={<Button to="/hr/talent" magnetic={false}>Discover talent</Button>}
    >
      <QueryState query={q}>
        {d && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Stat label="Talent pool" value={d.talentPool} hint="public builder profiles" />
              <Stat label="Shortlisted" value={d.pipeline.SHORTLISTED} />
              <Stat label="Invited" value={d.pipeline.INVITED} />
              <Stat label="Interviewing" value={d.pipeline.INTERVIEW} />
              <Stat label="Hired" value={d.pipeline.HIRED} accent="text-lime-300" />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Panel title="Upcoming interviews" action={<Link to="/hr/interviews" className="text-sm text-lime-300 hover:underline">All interviews</Link>}>
                {d.upcomingInterviews.length ? (
                  <ul className="divide-y divide-line/10">
                    {d.upcomingInterviews.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                        <span className="text-bone">{c.builder.name}{c.role ? ` · ${c.role}` : ''}</span>
                        <span className="text-mute">{new Date(c.interviewAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-mute">No interviews scheduled.</p>
                )}
              </Panel>
              <Panel title="Recently updated" action={<Link to="/hr/shortlist" className="text-sm text-lime-300 hover:underline">Pipeline</Link>}>
                {d.recentCandidates.length ? (
                  <ul className="divide-y divide-line/10">
                    {d.recentCandidates.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                        <span className="text-bone">{c.builder.name}</span>
                        <span className="text-mute">{label(c.stage)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-mute">Shortlist builders from Talent discovery to start your pipeline.</p>
                )}
              </Panel>
            </div>
          </div>
        )}
      </QueryState>
    </ProductPage>
  )
}
