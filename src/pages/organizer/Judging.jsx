import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { Button } from '../../components/ui/Button'
import { Chip } from '../../components/ui/atoms'
import { Select } from '../../components/ui/Field'
import { StatusBadge } from '../../components/ui/status'
import { Notice, Panel, ProductPage, QueryState, label } from '../../components/ecosystem/product'
import { useOrgRole } from './Onboarding'
import { useProgramFilter } from './People'

function AssignEvaluator({ submission, evaluators, onDone }) {
  const [evaluatorUserId, setId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const assign = async () => {
    setBusy(true)
    setError('')
    try {
      await api.assignOrgEvaluator(submission.id, { evaluatorUserId })
      setId('')
      onDone()
    } catch (err) {
      setError(err.details?.[0]?.message || err.message)
    } finally {
      setBusy(false)
    }
  }
  if (!evaluators.length) return <p className="text-xs text-mute">Add evaluators to your organization to assign them.</p>
  return (
    <div>
      <div className="flex gap-2">
        <Select aria-label="Evaluator" value={evaluatorUserId} onChange={(e) => setId(e.target.value)} className="!py-1.5 text-sm">
          <option value="">Assign evaluator…</option>
          {evaluators.map((e) => (
            <option key={e.userId} value={e.userId}>{e.name}</option>
          ))}
        </Select>
        <Button size="sm" magnetic={false} disabled={!evaluatorUserId || busy} onClick={assign}>Assign</Button>
      </div>
      {error && <div className="mt-2"><Notice tone="error">{error}</Notice></div>}
    </div>
  )
}

export function OrgSubmissions() {
  const qc = useQueryClient()
  const { canManagePrograms } = useOrgRole()
  const { opportunityId, picker } = useProgramFilter()
  const q = useQuery({ queryKey: ['organization', 'submissions', opportunityId], queryFn: () => api.orgSubmissions({ opportunityId, pageSize: 100 }).then((r) => r.data) })
  const evaluators = useQuery({ queryKey: ['organization', 'evaluators'], queryFn: () => api.orgEvaluators().then((r) => r.data), enabled: canManagePrograms })
  return (
    <ProductPage eco="ORGANIZER" title="Submissions" subtitle="Projects submitted to your programs, frozen at submit time. Assign evaluators from your panel.">
      <div className="mb-6">{picker}</div>
      <QueryState query={q} empty={q.data?.length === 0} emptyTitle="No submissions yet" emptyHint="Turn on “Accept project submissions” in a program to receive projects.">
        <div className="space-y-3">
          {(q.data ?? []).map((s) => (
            <article key={s.id} className="card-surface grid gap-4 p-5 lg:grid-cols-[1fr_auto]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-bone">{s.project.title}</p>
                  <StatusBadge status={s.status} />
                </div>
                <p className="text-sm text-mute">{s.project.tagline}</p>
                <p className="mt-1 text-xs text-mute">
                  {s.opportunity?.title} · {s.project.teamName || s.project.team.map((m) => m.name).join(', ')} · submitted {formatDate(s.submittedAt)}
                </p>
                <p className="mt-2 flex flex-wrap gap-3 text-xs">
                  {s.project.links?.repo && <a href={s.project.links.repo} target="_blank" rel="noreferrer" className="text-amber-300 hover:underline">Repository ↗</a>}
                  {s.project.links?.demo && <a href={s.project.links.demo} target="_blank" rel="noreferrer" className="text-amber-300 hover:underline">Demo ↗</a>}
                  {s.project.links?.video && <a href={s.project.links.video} target="_blank" rel="noreferrer" className="text-amber-300 hover:underline">Video ↗</a>}
                  <span className="text-mute">{s.evaluations.completed}/{s.evaluations.assigned} evaluations complete</span>
                </p>
              </div>
              {canManagePrograms && ['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED'].includes(s.status) && (
                <AssignEvaluator submission={s} evaluators={evaluators.data ?? []} onDone={() => qc.invalidateQueries({ queryKey: ['organization'] })} />
              )}
            </article>
          ))}
        </div>
      </QueryState>
    </ProductPage>
  )
}

export function OrgEvaluations() {
  const { opportunityId, picker } = useProgramFilter()
  const [status, setStatus] = useState('')
  const q = useQuery({
    queryKey: ['organization', 'evaluations', opportunityId, status],
    queryFn: () => api.orgEvaluations({ opportunityId, status: status || undefined, pageSize: 100 }).then((r) => r.data),
  })
  return (
    <ProductPage eco="ORGANIZER" title="Evaluations" subtitle="Progress of every assigned evaluation. Evaluators’ private notes stay with them.">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        {picker}
        <div className="flex flex-wrap gap-2">
          {['', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].map((s) => (
            <Chip key={s || 'all'} active={status === s} onClick={() => setStatus(s)}>
              {s ? label(s) : 'All'}
            </Chip>
          ))}
        </div>
      </div>
      <QueryState query={q} empty={q.data?.length === 0} emptyTitle="No evaluations yet" emptyHint="Assign evaluators from Submissions.">
        <div className="overflow-x-auto rounded-2xl border border-line/12">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-line/[0.04] text-xs uppercase tracking-[0.1em] text-mute">
              <tr>
                {['Project', 'Program', 'Evaluator', 'Rubric', 'Status', 'Score'].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(q.data ?? []).map((e) => (
                <tr key={e.id} className="border-t border-line/10">
                  <td className="px-4 py-3 text-bone">{e.project}</td>
                  <td className="px-4 py-3 text-mute">{e.opportunity?.title}</td>
                  <td className="px-4 py-3 text-mute">{e.evaluator}</td>
                  <td className="px-4 py-3 text-mute">{e.template}</td>
                  <td className="px-4 py-3 text-mute">{label(e.status)}</td>
                  <td className="px-4 py-3 font-mono text-amber-300">{e.overallScore ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </ProductPage>
  )
}

export function OrgRankings() {
  const q = useQuery({ queryKey: ['organization', 'rankings'], queryFn: () => api.orgRankings().then((r) => r.data) })
  return (
    <ProductPage eco="ORGANIZER" title="Rankings" subtitle="Submissions ranked by their average completed evaluation score, per program.">
      <QueryState query={q} empty={q.data?.length === 0} emptyTitle="No rankings yet" emptyHint="Rankings appear once evaluations are completed.">
        <div className="space-y-6">
          {(q.data ?? []).map((g) => (
            <Panel key={g.opportunity?.id} title={g.opportunity?.title}>
              <ol className="divide-y divide-line/10">
                {g.entries.map((e) => (
                  <li key={e.submissionId} className="flex items-center gap-4 py-3">
                    <span className={`display-face w-10 text-3xl ${e.rank <= 3 ? 'text-amber-300' : 'text-mute'}`}>{e.rank}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-bone">{e.project}</span>
                      <span className="block truncate text-xs text-mute">{e.teamName || e.team.join(', ')} · {e.evaluations} evaluation{e.evaluations === 1 ? '' : 's'}</span>
                    </span>
                    <StatusBadge status={e.status} />
                    <span className="font-mono text-amber-300">{e.averageScore}</span>
                  </li>
                ))}
              </ol>
            </Panel>
          ))}
        </div>
      </QueryState>
    </ProductPage>
  )
}

export function OrgWinners() {
  const q = useQuery({ queryKey: ['organization', 'winners'], queryFn: () => api.orgWinners().then((r) => r.data) })
  return (
    <ProductPage eco="ORGANIZER" title="Finalists & winners" subtitle="Shortlisted entries are your finalists; selected entries are your winners. Both earn achievements automatically.">
      <QueryState query={q} empty={q.data?.length === 0} emptyTitle="No finalists yet" emptyHint="Shortlist or select participants and submissions to see them here.">
        <div className="space-y-6">
          {(q.data ?? []).map((g) => (
            <Panel key={g.opportunity?.id} title={g.opportunity?.title}>
              <div className="grid gap-6 md:grid-cols-2">
                {[['Winners', g.winners, 'text-amber-300'], ['Finalists', g.finalists, 'text-bone']].map(([t, list, color]) => (
                  <div key={t}>
                    <p className={`eyebrow mb-3 ${color}`}>{t}</p>
                    {list.length ? (
                      <ul className="space-y-2 text-sm">
                        {list.map((w, i) => (
                          <li key={i}>
                            <span className="text-bone">{w.name}</span>
                            {w.team.length > 0 && <span className="text-mute"> · {w.team.join(', ')}</span>}
                            <span className="ml-2 text-[11px] text-mute">{w.kind === 'PROJECT' ? 'project' : 'participant'}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-mute">None yet.</p>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      </QueryState>
    </ProductPage>
  )
}

export function OrgCertificates() {
  const qc = useQueryClient()
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const { canManagePrograms } = useOrgRole()
  const q = useQuery({ queryKey: ['organization', 'certificates'], queryFn: () => api.orgCertificates({ pageSize: 100 }).then((r) => r.data) })

  const revoke = async (cert) => {
    setBusy(cert.id)
    setError('')
    try {
      await api.revokeOrgCertificate(cert.id, { reason: 'Revoked by the organization.' })
      qc.invalidateQueries({ queryKey: ['organization', 'certificates'] })
    } catch (err) {
      setError(err.details?.[0]?.message || err.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <ProductPage eco="ORGANIZER" title="Certificates" subtitle="Every certificate your programs issued, with the code anyone can check it against.">
      <QueryState query={q} empty={q.data?.length === 0} emptyTitle="No certificates issued yet" emptyHint="They’re issued automatically when a program result is recorded.">
        {error && <div className="mb-4"><Notice tone="error">{error}</Notice></div>}
        <div className="overflow-x-auto rounded-2xl border border-line/12">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-line/[0.04] text-xs uppercase tracking-[0.1em] text-mute">
              <tr>
                {['Recipient', 'Certificate', 'Program', 'Issued', 'Code', ''].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(q.data ?? []).map((c) => (
                <tr key={c.id} className="border-t border-line/10">
                  <td className="px-4 py-3 text-bone">{c.recipient}</td>
                  <td className="px-4 py-3 text-mute">
                    {c.title} {c.status === 'ACTIVE' ? <span className="text-acid">✓</span> : <StatusBadge status="REVOKED" />}
                  </td>
                  <td className="px-4 py-3 text-mute">{c.opportunity}</td>
                  <td className="px-4 py-3 text-mute">{formatDate(c.date)}</td>
                  <td className="px-4 py-3">
                    <Link to={`/certificates/verify/${c.verificationCode}`} className="font-mono text-xs text-violet hover:underline">
                      {c.verificationCode}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.status === 'ACTIVE' && canManagePrograms && (
                      <Button size="sm" variant="ghost" magnetic={false} disabled={busy === c.id} onClick={() => revoke(c)}>
                        Revoke
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </ProductPage>
  )
}
