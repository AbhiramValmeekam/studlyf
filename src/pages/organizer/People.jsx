import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { ORGANIZATION_MEMBER_ROLES } from '../../lib/enums'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/ui/Button'
import { Chip } from '../../components/ui/atoms'
import { Input, Select } from '../../components/ui/Field'
import { StatusBadge } from '../../components/ui/status'
import { Notice, Panel, ProductPage, QueryState, label } from '../../components/ecosystem/product'
import { useOrgRole } from './Onboarding'

/** Program filter shared by participants / teams / submissions / evaluations. */
export function useProgramFilter() {
  const [opportunityId, setOpportunityId] = useState('')
  const programs = useQuery({ queryKey: ['organization', 'opportunities', ''], queryFn: () => api.orgOpportunities({ pageSize: 100 }).then((r) => r.data) })
  const picker = (
    <Select aria-label="Program" value={opportunityId} onChange={(e) => setOpportunityId(e.target.value)} className="sm:max-w-xs">
      <option value="">All programs</option>
      {(programs.data ?? []).map((o) => (
        <option key={o.id} value={o.id}>{o.title}</option>
      ))}
    </Select>
  )
  return { opportunityId: opportunityId || undefined, picker }
}

const NEXT_APPLICATION = { SUBMITTED: ['UNDER_REVIEW', 'SHORTLISTED', 'SELECTED', 'REJECTED'], UNDER_REVIEW: ['SHORTLISTED', 'SELECTED', 'REJECTED'], SHORTLISTED: ['SELECTED', 'REJECTED'] }

export function OrgParticipants() {
  const qc = useQueryClient()
  const { canManagePrograms } = useOrgRole()
  const { opportunityId, picker } = useProgramFilter()
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const q = useQuery({
    queryKey: ['organization', 'participants', opportunityId, status],
    queryFn: () => api.orgParticipants({ opportunityId, status: status || undefined, pageSize: 100 }).then((r) => r.data),
  })
  const move = async (id, next) => {
    setError('')
    try {
      await api.reviewParticipant(id, { status: next })
      qc.invalidateQueries({ queryKey: ['organization'] })
    } catch (err) {
      setError(err.message)
    }
  }
  return (
    <ProductPage eco="ORGANIZER" title="Participants" subtitle="Everyone who registered for your programs. Status changes notify the participant.">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        {picker}
        <div className="flex flex-wrap gap-2">
          {['', 'SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'SELECTED', 'REJECTED'].map((s) => (
            <Chip key={s || 'all'} active={status === s} onClick={() => setStatus(s)}>
              {s ? label(s) : 'All'}
            </Chip>
          ))}
        </div>
      </div>
      {error && <div className="mb-4"><Notice tone="error">{error}</Notice></div>}
      <QueryState query={q} empty={q.data?.length === 0} emptyTitle="No participants yet" emptyHint="Publish a program — registrations appear here.">
        <div className="overflow-x-auto rounded-2xl border border-line/12">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-line/[0.04] text-xs uppercase tracking-[0.1em] text-mute">
              <tr>
                {['Participant', 'Program', 'Registered', 'Status', canManagePrograms ? 'Review' : null].filter(Boolean).map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(q.data ?? []).map((a) => (
                <tr key={a.id} className="border-t border-line/10">
                  <td className="px-4 py-3">
                    {a.builder.username ? (
                      <Link to={`/builders/${a.builder.username}`} className="font-medium text-bone hover:text-amber-300">{a.builder.name}</Link>
                    ) : (
                      <span className="font-medium text-bone">{a.builder.name}</span>
                    )}
                    <span className="block text-xs text-mute">{a.builder.email}</span>
                  </td>
                  <td className="px-4 py-3 text-mute">{a.opportunity?.title}</td>
                  <td className="px-4 py-3 text-mute">{formatDate(a.submittedAt) ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  {canManagePrograms && (
                    <td className="px-4 py-3">
                      {NEXT_APPLICATION[a.status] ? (
                        <Select aria-label={`Move ${a.builder.name}`} value="" onChange={(e) => e.target.value && move(a.id, e.target.value)} className="!py-1.5 text-sm">
                          <option value="">Move to…</option>
                          {NEXT_APPLICATION[a.status].map((s) => (
                            <option key={s} value={s}>{label(s)}</option>
                          ))}
                        </Select>
                      ) : (
                        <span className="text-xs text-mute">Decided</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </ProductPage>
  )
}

export function OrgTeams() {
  const { opportunityId, picker } = useProgramFilter()
  const q = useQuery({ queryKey: ['organization', 'teams', opportunityId], queryFn: () => api.orgTeams({ opportunityId, pageSize: 100 }).then((r) => r.data) })
  return (
    <ProductPage eco="ORGANIZER" title="Teams" subtitle="Teams as they were when they submitted — rosters are frozen with each submission.">
      <div className="mb-6">{picker}</div>
      <QueryState query={q} empty={q.data?.length === 0} emptyTitle="No teams yet" emptyHint="Teams appear when builders submit projects to your programs.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(q.data ?? []).map((t) => (
            <article key={t.submissionId} className="card-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-bone">{t.teamName}</p>
                  <p className="text-xs text-mute">{t.project} · {t.opportunity?.title}</p>
                </div>
                <StatusBadge status={t.status} />
              </div>
              <ul className="mt-4 space-y-1.5 text-sm">
                {t.members.map((m, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span className="text-bone">{m.name}</span>
                    <span className="text-mute">{label(m.role)}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </QueryState>
    </ProductPage>
  )
}

export function OrgMembers() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { canManageMembers } = useOrgRole()
  const q = useQuery({ queryKey: ['organization', 'members'], queryFn: () => api.orgMembers().then((r) => r.data) })
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('ORGANIZER')
  const [notice, setNotice] = useState(null)
  const refresh = () => qc.invalidateQueries({ queryKey: ['organization'] })
  const act = async (fn, ok) => {
    setNotice(null)
    try {
      await fn()
      setNotice({ tone: 'success', text: ok })
      refresh()
    } catch (err) {
      setNotice({ tone: 'error', text: err.details?.[0]?.message || err.message })
    }
  }
  return (
    <ProductPage eco="ORGANIZER" title="Members" subtitle="Owner and admins manage the team. Organizers run programs, evaluators score submissions, viewers can look but not change anything.">
      {canManageMembers && (
        <Panel title="Add a member" className="mb-6">
          <form
            className="flex flex-col gap-3 md:flex-row"
            onSubmit={(e) => {
              e.preventDefault()
              act(() => api.addOrgMember({ email, role }), `${email} added as ${label(role).toLowerCase()}.`).then(() => setEmail(''))
            }}
          >
            <Input type="email" aria-label="Email" placeholder="Their STUDLYF account email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)} className="md:w-48">
              {ORGANIZATION_MEMBER_ROLES.filter((r) => r !== 'OWNER').map((r) => (
                <option key={r} value={r}>{label(r)}</option>
              ))}
            </Select>
            <Button type="submit" magnetic={false}>Add member</Button>
          </form>
        </Panel>
      )}
      {notice && <div className="mb-4"><Notice tone={notice.tone}>{notice.text}</Notice></div>}
      <QueryState query={q}>
        <ul className="divide-y divide-line/10 rounded-2xl border border-line/12">
          {(q.data ?? []).map((m) => {
            const self = m.user?.id === user?.id
            return (
              <li key={m.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-bone">{m.user?.name}{self && <span className="text-mute"> (you)</span>}</p>
                  <p className="text-xs text-mute">{m.user?.email} · since {formatDate(m.addedAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {canManageMembers && m.role !== 'OWNER' ? (
                    <Select aria-label={`Role for ${m.user?.name}`} value={m.role} onChange={(e) => act(() => api.updateOrgMember(m.id, { role: e.target.value }), 'Role updated.')} className="!py-1.5 text-sm">
                      {ORGANIZATION_MEMBER_ROLES.filter((r) => r !== 'OWNER').map((r) => (
                        <option key={r} value={r}>{label(r)}</option>
                      ))}
                    </Select>
                  ) : (
                    <span className="rounded-full bg-amber-300/15 px-3 py-1 text-xs text-amber-300">{label(m.role)}</span>
                  )}
                  {m.role !== 'OWNER' && (canManageMembers || self) && (
                    <button
                      type="button"
                      className="text-sm text-mute hover:text-flare"
                      onClick={() => window.confirm(self ? 'Leave this organization?' : `Remove ${m.user?.name}?`) && act(() => api.removeOrgMember(m.id), self ? 'You left the organization.' : 'Member removed.')}
                    >
                      {self ? 'Leave' : 'Remove'}
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </QueryState>
    </ProductPage>
  )
}

export function OrgEvaluators() {
  const q = useQuery({ queryKey: ['organization', 'evaluators'], queryFn: () => api.orgEvaluators().then((r) => r.data) })
  const { canManageMembers } = useOrgRole()
  return (
    <ProductPage
      eco="ORGANIZER"
      title="Evaluators"
      subtitle="Your organization’s judging panel. Add members with the Evaluator role, then assign them to submissions."
      actions={canManageMembers && <Button to="/organizations/members" variant="outline" magnetic={false}>Add evaluators</Button>}
    >
      <QueryState query={q} empty={q.data?.length === 0} emptyTitle="No evaluators yet" emptyHint="Add a member with the Evaluator role to build your panel.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(q.data ?? []).map((e) => (
            <article key={e.userId} className="card-surface p-5">
              <p className="font-semibold text-bone">{e.name}</p>
              <p className="text-xs text-mute">{e.email}</p>
              <p className="mt-4 text-sm text-mute">
                <span className="text-bone">{e.completed}</span> completed of <span className="text-bone">{e.assigned}</span> assigned
              </p>
            </article>
          ))}
        </div>
      </QueryState>
    </ProductPage>
  )
}
