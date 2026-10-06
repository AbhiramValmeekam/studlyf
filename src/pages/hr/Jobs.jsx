import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { formatDate, formatSalary, relativeDeadline, deadlineUrgency } from '../../lib/format'
import { EMPLOYMENT_TYPES, EXPERIENCE_LEVELS, SALARY_PERIODS, WORK_MODES } from '../../lib/enums'
import { useCategories } from '../../lib/queries'
import { Button } from '../../components/ui/Button'
import { Badge, Chip } from '../../components/ui/atoms'
import { FormField, Select } from '../../components/ui/Field'
import Wizard from '../../components/ui/Wizard'
import { StatusPill } from '../../components/ecosystem/EcosystemSelector'
import { Notice, ProductPage, QueryState, label } from '../../components/ecosystem/product'
import {
  Area,
  Choice,
  ImageField,
  ListField,
  NumberField,
  Repeater,
  RichArea,
  RowArea,
  RowField,
  Text,
  Toggle,
  setPath,
} from '../../components/ecosystem/forms'

function PublishToggle({ job, onChange }) {
  const [busy, setBusy] = useState(false)
  const toggle = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api.publishHrJob(job.id, job.status !== 'PUBLISHED')
      onChange()
    } finally {
      setBusy(false)
    }
  }
  return (
    <Button size="sm" variant={job.status === 'PUBLISHED' ? 'outline' : 'primary'} magnetic={false} disabled={busy} onClick={toggle}>
      {job.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
    </Button>
  )
}

/**
 * /hr/jobs — the verified employer's own postings. A job is the front door of the hiring funnel,
 * so the row also reports how many candidates sit against it (spec §73, §5.3).
 */
export function HrJobs() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('')
  const q = useQuery({
    queryKey: ['hr', 'jobs', status],
    // The listing cap is 50 (server-side paginationQuery) — asking for more is a 400, not a bigger page.
    queryFn: () => api.hrJobs({ status: status || undefined, pageSize: 50 }).then((r) => r.data),
  })
  const refresh = () => qc.invalidateQueries({ queryKey: ['hr', 'jobs'] })

  return (
    <ProductPage
      eco="HR"
      title="Jobs"
      subtitle="Your openings, and the candidates in the pipeline behind each one."
      actions={<Button to="/hr/jobs/new" magnetic={false}>Post a job</Button>}
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {['', 'PUBLISHED', 'DRAFT'].map((s) => (
          <Chip key={s || 'all'} active={status === s} onClick={() => setStatus(s)}>
            {s ? label(s) : 'All'}
          </Chip>
        ))}
      </div>

      <QueryState
        query={q}
        empty={q.data?.length === 0}
        emptyTitle="No job posts yet"
        emptyHint="Post an opening — it stays a draft until you publish it, and it appears on the public job board the moment you do."
      >
        <div className="space-y-3">
          {(q.data ?? []).map((job) => (
            <article key={job.id} className="card-surface flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/hr/jobs/${job.id}`} className="font-semibold text-bone hover:text-lime-300">
                    {job.title}
                  </Link>
                  <StatusPill status={job.status === 'PUBLISHED' ? 'ACTIVE' : 'ONBOARDING'} />
                  {job.featured && <Badge tone="open">Featured</Badge>}
                </div>
                <p className="text-sm text-mute">
                  {label(job.employmentType)} · {label(job.workMode)}
                  {job.location ? ` · ${job.location}` : ''} · {formatSalary(job.salary)}
                </p>
                <p className="mt-1 text-xs text-mute">
                  {job.pipelineCount} in pipeline
                  {job.applicationDeadline && ` · closes ${formatDate(job.applicationDeadline)}`}
                  {job.status === 'PUBLISHED' && (
                    <>
                      {' '}· <Link to={`/jobs/${job.slug}`} className="hover:text-bone">public page ↗</Link>
                    </>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" to={`/hr/jobs/${job.id}`} magnetic={false}>Edit</Button>
                <PublishToggle job={job} onChange={refresh} />
              </div>
            </article>
          ))}
        </div>
      </QueryState>
    </ProductPage>
  )
}

const EMPTY = {
  title: '',
  employmentType: 'FULL_TIME',
  workMode: 'ONSITE',
  experienceLevel: '',
  categoryId: null,
  bannerId: null,
  bannerUrl: '',
  summary: '',
  description: '',
  responsibilities: '',
  requirements: '',
  perks: [],
  skills: [],
  location: '',
  openings: 1,
  minExperienceYears: '',
  maxExperienceYears: '',
  salaryDisclosed: true,
  salaryMin: '',
  salaryMax: '',
  salaryCurrency: 'INR',
  salaryPeriod: 'YEAR',
  rounds: [],
  faqs: [],
  applicationDeadline: '',
  startDate: '',
  externalUrl: '',
  contactEmail: '',
}

const dateOnly = (iso) => (iso ? String(iso).slice(0, 10) : '')
const isoOrNull = (v) => (v ? new Date(v).toISOString() : null)
const numOrNull = (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v))
const intOrNull = (v) => {
  const n = numOrNull(v)
  return n === null ? null : Math.trunc(n)
}

/** "2–5 years" / "3+ years" / null when neither bound was given. */
function experienceLine(min, max) {
  const lo = numOrNull(min)
  const hi = numOrNull(max)
  if (lo == null && hi == null) return null
  if (lo != null && hi != null && lo !== hi) return `${lo}–${hi} years`
  return `${lo ?? hi}+ years`
}

const STEPS = [
  { key: 'basics', label: 'Role', title: 'The role', subtitle: 'What the job is, where it sits and who it is for.', required: ['title', 'summary', 'employmentType', 'workMode'] },
  { key: 'description', label: 'Description', title: 'About the role', subtitle: 'The full picture — rich text and images are both welcome.' },
  { key: 'requirements', label: 'Requirements', title: 'What the role asks for', subtitle: 'Responsibilities, requirements and the perks that make it worth it.' },
  { key: 'compensation', label: 'Compensation', title: 'Compensation and location', subtitle: 'Salary, experience and where the work happens.' },
  { key: 'process', label: 'Process', title: 'Hiring process', subtitle: 'Rounds, the questions everyone asks, and how to apply.' },
  { key: 'review', label: 'Review', title: 'Review and publish', subtitle: 'One last look before it goes on the public job board.' },
]

/** The exact body the HR routes accept — an explicit allow-list, so UI-only keys never leak out. */
function buildBody(v) {
  return {
    title: v.title,
    summary: v.summary,
    employmentType: v.employmentType,
    workMode: v.workMode,
    experienceLevel: v.experienceLevel || null,
    categoryId: v.categoryId || null,
    bannerId: v.bannerId || null,
    location: v.location || null,
    openings: intOrNull(v.openings) ?? 1,
    minExperienceYears: numOrNull(v.minExperienceYears),
    maxExperienceYears: numOrNull(v.maxExperienceYears),
    salaryDisclosed: !!v.salaryDisclosed,
    salaryMin: numOrNull(v.salaryMin),
    salaryMax: numOrNull(v.salaryMax),
    salaryCurrency: v.salaryCurrency || null,
    salaryPeriod: v.salaryPeriod || null,
    description: v.description || null,
    responsibilities: v.responsibilities || null,
    requirements: v.requirements || null,
    perks: (v.perks ?? []).map((p) => String(p).trim()).filter(Boolean),
    skills: (v.skills ?? []).map((s) => String(s).trim()).filter(Boolean),
    // An untouched repeater row would otherwise fail the server's minimum-title rule.
    rounds: (v.rounds ?? [])
      .filter((r) => (r.title ?? '').trim())
      .map((r, i) => ({
        title: r.title,
        description: r.description || null,
        startsAt: isoOrNull(r.startsAt),
        endsAt: isoOrNull(r.endsAt),
        mode: r.mode || null,
        location: r.location || null,
        displayOrder: i,
      })),
    faqs: (v.faqs ?? [])
      .filter((f) => (f.question ?? '').trim())
      .map((f, i) => ({ question: f.question, answer: f.answer || null, displayOrder: i })),
    applicationDeadline: isoOrNull(v.applicationDeadline),
    startDate: isoOrNull(v.startDate),
    externalUrl: v.externalUrl || null,
    contactEmail: v.contactEmail || null,
  }
}

/** A saved job → wizard values. Dates become yyyy-mm-dd so <input type="date"> round-trips. */
function fromRecord(j) {
  return {
    ...EMPTY,
    title: j.title ?? '',
    employmentType: j.employmentType ?? EMPTY.employmentType,
    workMode: j.workMode ?? EMPTY.workMode,
    experienceLevel: j.experienceLevel ?? '',
    categoryId: j.categoryId ?? null,
    bannerId: j.bannerId ?? null,
    bannerUrl: j.banner?.url ?? '',
    summary: j.summary ?? '',
    description: j.description ?? '',
    responsibilities: j.responsibilities ?? '',
    requirements: j.requirements ?? '',
    perks: (j.perks ?? []).map((p) => String(p)),
    skills: (j.skills ?? []).map((s) => s.name ?? s),
    location: j.location ?? '',
    openings: j.openings ?? 1,
    minExperienceYears: j.minExperienceYears ?? '',
    maxExperienceYears: j.maxExperienceYears ?? '',
    salaryDisclosed: j.salary?.disclosed !== false,
    salaryMin: j.salary?.min ?? '',
    salaryMax: j.salary?.max ?? '',
    salaryCurrency: j.salary?.currency ?? 'INR',
    salaryPeriod: j.salary?.period ?? 'YEAR',
    rounds: (j.rounds ?? []).map((r) => ({
      title: r.title ?? '',
      description: r.description ?? '',
      startsAt: dateOnly(r.startsAt),
      endsAt: dateOnly(r.endsAt),
      mode: r.mode ?? '',
      location: r.location ?? '',
    })),
    faqs: (j.faqs ?? []).map((f) => ({ question: f.question ?? '', answer: f.answer ?? '' })),
    applicationDeadline: dateOnly(j.applicationDeadline),
    startDate: dateOnly(j.startDate),
    externalUrl: j.externalUrl ?? '',
    contactEmail: j.contactEmail ?? '',
  }
}

function CategorySelect({ form }) {
  const categories = useCategories('OPPORTUNITY')
  return (
    <FormField label="Category" htmlFor="categoryId" error={form.errors.categoryId} hint="Drives the filter on the public job board.">
      <Select
        id="categoryId"
        value={form.values.categoryId ?? ''}
        onChange={(e) => form.setValues((cur) => setPath(cur, 'categoryId', e.target.value || null))}
        error={form.errors.categoryId}
      >
        <option value="">No category</option>
        {(categories.data ?? []).map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
    </FormField>
  )
}

function renderStep(step, form) {
  switch (step.key) {
    case 'basics':
      return (
        <>
          <Text form={form} path="title" label="Job title" required placeholder="Frontend Engineer Intern" />
          <div className="grid gap-5 md:grid-cols-3">
            <Choice form={form} path="employmentType" label="Employment type" options={EMPLOYMENT_TYPES} />
            <Choice form={form} path="workMode" label="Work mode" options={WORK_MODES} />
            <Choice form={form} path="experienceLevel" label="Seniority" options={EXPERIENCE_LEVELS} placeholder="Any" />
          </div>
          <CategorySelect form={form} />
          <Area
            form={form}
            path="summary"
            label="Short summary"
            rows={2}
            required
            hint="One or two lines — this is what shows on the job card and in search results."
          />
          <ImageField
            form={form}
            path="bannerId"
            urlPath="bannerUrl"
            label="Banner image"
            purpose="BANNER"
            hint="Wide artwork for the top of the public job page. Optional."
          />
        </>
      )

    case 'description':
      return (
        <>
          <RichArea
            form={form}
            path="description"
            label="About the role"
            purpose="OTHER"
            minHeight={300}
            placeholder="What the team is building, what the day-to-day looks like, and why this role exists…"
            hint="Use the toolbar for headings, lists and images."
          />
          <ListField form={form} path="skills" label="Skills" hint="Separate with commas — e.g. React, TypeScript, Figma" />
        </>
      )

    case 'requirements':
      return (
        <>
          <RichArea
            form={form}
            path="responsibilities"
            label="What you'll do"
            purpose="OTHER"
            minHeight={200}
            placeholder="Ship the candidate dashboard, own the design system…"
          />
          <RichArea
            form={form}
            path="requirements"
            label="What we're looking for"
            purpose="OTHER"
            minHeight={200}
            placeholder="The must-haves, and anything that would stand out."
          />
          <ListField
            form={form}
            path="perks"
            label="Perks and benefits"
            hint="Separate with commas — e.g. Stipend, Remote-friendly, Learning budget"
          />
        </>
      )

    case 'compensation':
      return (
        <>
          <Toggle
            form={form}
            path="salaryDisclosed"
            label="Show the salary publicly"
            hint="When this is off, the public page says the range is not disclosed — the numbers you enter stay private."
          />
          <div className="grid gap-5 md:grid-cols-3">
            <NumberField form={form} path="salaryMin" label="Minimum" min={0} />
            <NumberField form={form} path="salaryMax" label="Maximum" min={0} />
            <Choice form={form} path="salaryPeriod" label="Per" options={SALARY_PERIODS} />
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <Text form={form} path="salaryCurrency" label="Currency" placeholder="INR" hint="INR, USD…" />
            <NumberField form={form} path="minExperienceYears" label="Min experience (years)" min={0} max={60} />
            <NumberField form={form} path="maxExperienceYears" label="Max experience (years)" min={0} max={60} />
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <Text form={form} path="location" label="Location" hint="City, or “Remote”" />
            <NumberField form={form} path="openings" label="Openings" min={1} max={1000} />
            <Text form={form} path="startDate" label="Start date" type="date" />
          </div>
        </>
      )

    case 'process':
      return (
        <>
          <Repeater
            form={form}
            path="rounds"
            label="Hiring rounds"
            itemTitle="round"
            addLabel="Add round"
            hint="Screening call, take-home, system design, the final loop — whatever the process runs through."
            blank={{ title: '', description: '', startsAt: '', endsAt: '', mode: '', location: '' }}
            render={(row, i, { update }) => (
              <div className="space-y-4">
                <RowField row={row} onPatch={(p) => update(i, p)} name="title" label="Round name" hint="e.g. Technical interview" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <RowField row={row} onPatch={(p) => update(i, p)} name="mode" label="Mode" options={['ONLINE', 'OFFLINE', 'HYBRID']} />
                  <RowField row={row} onPatch={(p) => update(i, p)} name="location" label="Where" hint="Offline rounds only" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <RowField row={row} onPatch={(p) => update(i, p)} name="startsAt" label="From" type="date" />
                  <RowField row={row} onPatch={(p) => update(i, p)} name="endsAt" label="To" type="date" />
                </div>
                <RowArea row={row} onPatch={(p) => update(i, p)} name="description" label="What happens in this round" rows={2} />
              </div>
            )}
          />
          <Repeater
            form={form}
            path="faqs"
            label="Frequently asked questions"
            itemTitle="question"
            addLabel="Add question"
            blank={{ question: '', answer: '' }}
            render={(row, i, { update }) => (
              <div className="space-y-4">
                <RowField row={row} onPatch={(p) => update(i, p)} name="question" label="Question" />
                <RowArea row={row} onPatch={(p) => update(i, p)} name="answer" label="Answer" rows={2} />
              </div>
            )}
          />
          <div className="grid gap-5 md:grid-cols-2">
            <Text form={form} path="applicationDeadline" label="Applications close" type="date" />
            <Text form={form} path="contactEmail" label="Contact email" type="email" hint="Where candidates write with questions." />
          </div>
          <Text form={form} path="externalUrl" label="External application link" type="url" placeholder="https://" hint="If you collect applications on your own ATS, the public page links there instead." />
        </>
      )

    case 'review':
      return <Review values={form.values} />

    default:
      return null
  }
}

/** The wizard ends on the same thing Unstop does: a plain read-back of every field. */
function Review({ values: v }) {
  const rows = [
    ['Employment type', label(v.employmentType)],
    ['Work mode', label(v.workMode)],
    ['Seniority', v.experienceLevel ? label(v.experienceLevel) : null],
    ['Summary', v.summary],
    ['Location', v.location],
    ['Openings', v.openings ? String(v.openings) : null],
    ['Experience', experienceLine(v.minExperienceYears, v.maxExperienceYears)],
    ['Salary', formatSalary({ disclosed: !!v.salaryDisclosed, min: numOrNull(v.salaryMin), max: numOrNull(v.salaryMax), currency: v.salaryCurrency, period: v.salaryPeriod })],
    ['Skills', (v.skills ?? []).join(', ')],
    ['Perks', (v.perks ?? []).join(', ')],
    ['Rounds', v.rounds?.length ? `${v.rounds.length} round${v.rounds.length === 1 ? '' : 's'}` : null],
    ['FAQ', v.faqs?.length ? `${v.faqs.length} question${v.faqs.length === 1 ? '' : 's'}` : null],
    ['Applications close', v.applicationDeadline ? formatDate(v.applicationDeadline) : null],
    ['Contact', v.contactEmail],
    ['External link', v.externalUrl],
  ].filter(([, value]) => value)

  return (
    <div className="space-y-5">
      <Notice>
        Publishing puts this job on the public job board, where every builder can see it. You can unpublish it
        from Jobs at any time — the pipeline you have already built stays.
      </Notice>
      <dl className="divide-y divide-line/10">
        {rows.map(([k, value]) => (
          <div key={k} className="flex items-start justify-between gap-6 py-3">
            <dt className="text-sm text-mute">{k}</dt>
            <dd className="max-w-[60%] text-right text-sm text-bone">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function preview(v) {
  const urgency = deadlineUrgency(v.applicationDeadline)
  return (
    <div className="space-y-4">
      <div className="aspect-[16/9] overflow-hidden rounded-xl border border-line/10 bg-ink2">
        {v.bannerUrl ? (
          <img src={v.bannerUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-xs text-mute">No banner yet</div>
        )}
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-mute">
          {label(v.employmentType)} · {label(v.workMode)}
        </p>
        <p className="display-face mt-1 text-lg leading-tight">{v.title || 'Untitled role'}</p>
        {v.summary && <p className="mt-2 text-sm text-mute">{v.summary}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {v.applicationDeadline && (
          <Badge tone={urgency === 'urgent' ? 'urgent' : urgency === 'soon' ? 'soon' : 'open'}>
            {relativeDeadline(v.applicationDeadline) || 'Open'}
          </Badge>
        )}
        <Badge tone="neutral">{formatSalary({ disclosed: !!v.salaryDisclosed, min: numOrNull(v.salaryMin), max: numOrNull(v.salaryMax), currency: v.salaryCurrency, period: v.salaryPeriod })}</Badge>
      </div>
      <dl className="space-y-2 border-t border-line/10 pt-4 text-sm">
        {v.location && (
          <div className="flex justify-between gap-4">
            <dt className="text-mute">Where</dt>
            <dd className="text-right text-bone">{v.location}</dd>
          </div>
        )}
        {(v.skills ?? []).length > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-mute">Skills</dt>
            <dd className="text-right text-bone">{v.skills.length}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-mute">Rounds</dt>
          <dd className="text-bone">{v.rounds?.length || '—'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-mute">FAQ</dt>
          <dd className="text-bone">{v.faqs?.length || '—'}</dd>
        </div>
      </dl>
    </div>
  )
}

/**
 * Create / configure a job post. The company name is never a field here — it is taken from the
 * verified HR profile on the server, exactly as an organizer never types its own organization.
 */
export function HrJobForm() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [createdId, setCreatedId] = useState(id ?? null)
  const q = useQuery({ queryKey: ['hr', 'job', id], queryFn: () => api.hrJob(id).then((r) => r.data), enabled: !isNew })
  const published = new URLSearchParams(window.location.search).get('published')
  const job = q.data
  const initial = job ? fromRecord(job) : EMPTY

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['hr', 'jobs'] })
    qc.invalidateQueries({ queryKey: ['hr', 'job', id] })
  }

  /** Every step persists. The first one creates the draft and remembers its id; the rest patch it. */
  const persistDraft = async (v) => {
    const body = buildBody(v)
    if (createdId) {
      await api.updateHrJob(createdId, body)
      return createdId
    }
    const { data } = await api.createHrJob(body)
    setCreatedId(data.id)
    refresh()
    return data.id
  }

  const finish = async (v) => {
    const draftId = await persistDraft(v)
    await api.publishHrJob(draftId, true)
    refresh()
    navigate(`/hr/jobs/${draftId}?published=1`, { replace: true })
  }

  const exit = async (v) => {
    await persistDraft(v)
    refresh()
    navigate('/hr/jobs')
  }

  return (
    <ProductPage
      eco="HR"
      title={isNew ? 'Post a job' : job?.title ?? 'Job'}
      subtitle="Each step saves a draft, so nothing is lost if you stop. Publish when it’s ready."
      actions={
        !isNew && (
          <Button to={`/hr/talent?jobId=${id}`} variant="ghost" magnetic={false}>
            Shortlist from talent
          </Button>
        )
      }
    >
      {published && (
        <div className="mb-6">
          <Notice tone="success">Published. It is on the public job board now.</Notice>
        </div>
      )}
      <QueryState query={isNew ? { isLoading: false } : q}>
        <Wizard
          embedded
          steps={STEPS}
          initialValues={initial}
          onSubmitStep={async (key, v) => {
            if (key !== 'review') await persistDraft(v)
          }}
          onFinish={finish}
          onExit={exit}
          renderStep={renderStep}
          preview={preview}
          labels={{ exit: 'Save draft & exit' }}
          finishLabel="Publish job"
        />
      </QueryState>
    </ProductPage>
  )
}
