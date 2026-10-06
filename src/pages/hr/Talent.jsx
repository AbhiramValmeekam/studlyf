import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { BUILDER_AVAILABILITIES } from '../../lib/enums'
import { Avatar } from '../../components/ui/atoms'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Field'
import { Pagination } from '../../components/ui/Pagination'
import { Notice, ProductPage, QueryState, label } from '../../components/ecosystem/product'

function Evidence({ e }) {
  return (
    <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
      {[
        ['Projects', e.projects],
        ['Achievements', `${e.achievements}${e.verifiedAchievements ? ` · ${e.verifiedAchievements}✓` : ''}`],
        ['Evaluations', e.publicEvaluations],
      ].map(([k, v]) => (
        <div key={k} className="rounded-xl bg-line/[0.04] py-2">
          <dd className="text-sm font-semibold text-bone">{v}</dd>
          <dt className="text-[11px] text-mute">{k}</dt>
        </div>
      ))}
    </dl>
  )
}

function TalentCard({ t, jobId, onAdded }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const add = async () => {
    setBusy(true)
    setError('')
    try {
      // `jobId` comes from the job page's "Shortlist from talent" link: the candidate is added
      // against that opening, and the server fills the role label from its title.
      await api.addCandidate({ username: t.username, ...(jobId ? { jobId } : {}) })
      onAdded()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <article className="card-surface flex h-full flex-col p-5">
      <div className="flex items-start gap-3">
        <Avatar src={t.photo?.url} name={t.name} size={44} />
        <div className="min-w-0">
          <Link to={`/builders/${t.username}`} className="font-semibold text-bone hover:text-lime-300">{t.name}</Link>
          <p className="truncate text-sm text-mute">{t.headline || `@${t.username}`}</p>
          <p className="text-xs text-mute">{[t.college, t.location, t.availability && label(t.availability)].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {t.skills.slice(0, 6).map((s) => (
          <span key={s.slug} className="rounded-full bg-line/[0.07] px-2.5 py-1 text-[11px] text-mute">{s.name}</span>
        ))}
      </div>
      <Evidence e={t.evidence} />
      <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
        {t.links.github && (
          <a href={t.links.github} target="_blank" rel="noreferrer" className="text-sm text-mute hover:text-bone">GitHub ↗</a>
        )}
        <Link to={`/builders/${t.username}`} className="text-sm text-mute hover:text-bone">Profile & projects ↗</Link>
        <span className="ml-auto">
          {t.pipeline ? (
            <span className="rounded-full bg-lime-300/15 px-3 py-1 text-xs text-lime-300">In pipeline · {label(t.pipeline.stage)}</span>
          ) : (
            <Button size="sm" magnetic={false} disabled={busy} onClick={add}>Shortlist</Button>
          )}
        </span>
      </div>
      {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
    </article>
  )
}

export default function HrTalent() {
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const f = Object.fromEntries(['q', 'skill', 'college', 'location', 'availability'].map((k) => [k, params.get(k) || '']))
  const page = Number(params.get('page') || 1)
  // Arriving from a job page's "Shortlist from talent" link — every add lands against that post.
  const jobId = params.get('jobId') || ''
  const job = useQuery({ queryKey: ['hr', 'job', jobId], queryFn: () => api.hrJob(jobId).then((r) => r.data), enabled: !!jobId, retry: false })
  const skills = useQuery({ queryKey: ['skills'], queryFn: () => api.skills({ pageSize: 50 }).then((r) => r.data ?? []) })
  const q = useQuery({
    queryKey: ['hr', 'talent', f, page],
    queryFn: async () => {
      const { data, meta } = await api.hrTalent({ ...f, page, pageSize: 12 })
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
  return (
    <ProductPage eco="HR" title="Talent discovery" subtitle="Public builder profiles only. Filter by skills, college, location and availability — then look at the work.">
      {jobId && (
        <div className="mb-6">
          <Notice>
            {job.data ? (
              <>
                Shortlisting for <span className="font-medium text-bone">{job.data.title}</span> — every builder you add
                joins the pipeline against that opening.{' '}
                <Link to="/hr/jobs" className="underline decoration-line/40 underline-offset-4 hover:text-bone">
                  Back to jobs
                </Link>
              </>
            ) : job.isError ? (
              <>
                That job is not in your account.{' '}
                <Link to="/hr/talent" className="underline decoration-line/40 underline-offset-4 hover:text-bone">
                  Clear it
                </Link>
              </>
            ) : (
              'Loading the opening…'
            )}
          </Notice>
        </div>
      )}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Input aria-label="Search" placeholder="Search name, skill, headline…" value={f.q} onChange={set('q')} />
        <Select aria-label="Skill" value={f.skill} onChange={set('skill')}>
          <option value="">Any skill</option>
          {(Array.isArray(skills.data) ? skills.data : []).map((s) => (
            <option key={s.slug} value={s.slug}>{s.name}</option>
          ))}
        </Select>
        <Input aria-label="College" placeholder="College" value={f.college} onChange={set('college')} />
        <Input aria-label="Location" placeholder="City" value={f.location} onChange={set('location')} />
        <Select aria-label="Availability" value={f.availability} onChange={set('availability')}>
          <option value="">Any availability</option>
          {BUILDER_AVAILABILITIES.map((a) => (
            <option key={a} value={a}>{label(a)}</option>
          ))}
        </Select>
      </div>
      <QueryState query={q} empty={!q.data?.items.length} emptyTitle="No builders match" emptyHint="Try a broader search or fewer filters.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(q.data?.items ?? []).map((t) => (
            <TalentCard key={t.builderProfileId} t={t} jobId={job.data ? jobId : ''} onAdded={() => qc.invalidateQueries({ queryKey: ['hr'] })} />
          ))}
        </div>
        <Pagination
          page={page}
          totalPages={q.data?.meta?.totalPages}
          onChange={(p) => {
            const next = new URLSearchParams(params)
            next.set('page', String(p))
            setParams(next)
          }}
        />
      </QueryState>
    </ProductPage>
  )
}
