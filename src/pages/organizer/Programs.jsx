import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { OPPORTUNITY_MODES, OPPORTUNITY_TYPES } from '../../lib/enums'
import { useCategories } from '../../lib/queries'
import { Button } from '../../components/ui/Button'
import { Chip } from '../../components/ui/atoms'
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
  clean,
  setPath,
} from '../../components/ecosystem/forms'
import { useOrgRole } from './Onboarding'

function PublishToggle({ o, onChange }) {
  const [busy, setBusy] = useState(false)
  const toggle = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api.publishOrgOpportunity(o.id, o.status !== 'PUBLISHED')
      onChange()
    } finally {
      setBusy(false)
    }
  }
  return (
    <Button size="sm" variant={o.status === 'PUBLISHED' ? 'outline' : 'primary'} magnetic={false} disabled={busy} onClick={toggle}>
      {o.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
    </Button>
  )
}

/** Programs (all opportunity types) and Hackathons (HACKATHON only) share this list. */
export default function OrgPrograms({ type = null }) {
  const qc = useQueryClient()
  const { canManagePrograms } = useOrgRole()
  const [filter, setFilter] = useState(type ?? '')
  const q = useQuery({ queryKey: ['organization', 'opportunities', filter], queryFn: () => api.orgOpportunities({ type: filter || undefined, pageSize: 100 }).then((r) => r.data) })
  const refresh = () => qc.invalidateQueries({ queryKey: ['organization'] })
  return (
    <ProductPage
      eco="ORGANIZER"
      title={type === 'HACKATHON' ? 'Hackathons' : 'Programs'}
      subtitle={type === 'HACKATHON' ? 'Your hackathons, their registrations and submissions.' : 'Hackathons, competitions, challenges, workshops and innovation programs you run.'}
      actions={canManagePrograms && <Button to={`/organizations/opportunities/new${type ? `?type=${type}` : ''}`} magnetic={false}>Create program</Button>}
    >
      {!type && (
        <div className="mb-6 flex flex-wrap gap-2">
          {['', 'HACKATHON', 'COMPETITION', 'CHALLENGE', 'WORKSHOP', 'PROGRAM', 'INTERNSHIP', 'JOB'].map((t) => (
            <Chip key={t || 'all'} active={filter === t} onClick={() => setFilter(t)}>
              {t ? label(t) : 'All'}
            </Chip>
          ))}
        </div>
      )}
      <QueryState query={q} empty={q.data?.length === 0} emptyTitle="No programs yet" emptyHint={canManagePrograms ? 'Create your first program — it stays a draft until you publish it.' : 'Programs your organization creates appear here.'}>
        <div className="space-y-3">
          {(q.data ?? []).map((o) => (
            <article key={o.id} className="card-surface flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/organizations/opportunities/${o.id}`} className="font-semibold text-bone hover:text-amber-300">{o.title}</Link>
                  <StatusPill status={o.status === 'PUBLISHED' ? 'ACTIVE' : 'ONBOARDING'} />
                </div>
                <p className="text-sm text-mute">
                  {label(o.type)} · {label(o.mode)} · deadline {formatDate(o.applicationDeadline) ?? 'not set'}
                </p>
                <p className="mt-1 text-xs text-mute">
                  {o.applications} participants · {o.submissions} project submissions
                  {o.status === 'PUBLISHED' && (
                    <>
                      {' '}· <Link to={`/opportunities/${o.slug}`} className="hover:text-bone">public page ↗</Link>
                    </>
                  )}
                </p>
              </div>
              {canManagePrograms && (
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" to={`/organizations/opportunities/${o.id}`} magnetic={false}>Edit</Button>
                  <PublishToggle o={o} onChange={refresh} />
                </div>
              )}
            </article>
          ))}
        </div>
      </QueryState>
    </ProductPage>
  )
}

const EMPTY = {
  title: '',
  type: 'HACKATHON',
  mode: 'ONLINE',
  categoryId: null,
  bannerId: null,
  bannerUrl: '',
  shortDescription: '',
  description: '',
  eligibility: '',
  prizeInformation: '',
  location: '',
  venue: '',
  applicationDeadline: '',
  startDate: '',
  endDate: '',
  externalUrl: '',
  skills: [],
  rounds: [],
  prizes: [],
  faqs: [],
  contact: { name: '', designation: '', email: '', phone: '', website: '' },
  submissionSettings: {
    acceptsProjects: false,
    requireRepository: false,
    requireDemo: false,
    requireVideo: false,
    minTeamSize: null,
    maxTeamSize: null,
    guidelines: '',
  },
}
const dateOnly = (iso) => (iso ? String(iso).slice(0, 10) : '')
const isoOrNull = (v) => (v ? new Date(v).toISOString() : null)
const numOrNull = (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v))
const intOrNull = (v) => {
  const n = numOrNull(v)
  return n === null ? null : Math.trunc(n)
}

const STEPS = [
  { key: 'basics', label: 'Basics', title: 'The essentials', subtitle: 'What the program is, where it happens, and the artwork builders will see first.', required: ['title', 'shortDescription'] },
  { key: 'description', label: 'Details', title: 'Problem statements and details', subtitle: 'The full brief. Rich text and images are both welcome.' },
  { key: 'eligibility', label: 'Eligibility', title: 'Who can take part', subtitle: 'Eligibility rules and the person builders should write to.' },
  { key: 'stages', label: 'Stages', title: 'Stages and timelines', subtitle: 'Rounds, dates and place — this is the section Unstop-style pages lead with.' },
  { key: 'prizes', label: 'Prizes', title: 'Rewards and prizes', subtitle: 'A structured prize table, plus any wording that does not fit a row.' },
  { key: 'submissions', label: 'Submissions', title: 'Submissions and FAQ', subtitle: 'Whether builders submit projects, and the questions everyone asks.' },
  { key: 'review', label: 'Review', title: 'Review and publish', subtitle: 'One last look before it goes live.' },
]

/** The exact body the org routes accept — an explicit allow-list, so UI-only keys never leak out. */
function buildBody(v) {
  return {
    title: v.title,
    type: v.type,
    mode: v.mode,
    categoryId: v.categoryId || null,
    bannerId: v.bannerId || null,
    shortDescription: v.shortDescription,
    description: v.description || null,
    eligibility: v.eligibility || null,
    prizeInformation: v.prizeInformation || null,
    location: v.location || null,
    venue: v.venue || null,
    externalUrl: v.externalUrl || null,
    applicationDeadline: isoOrNull(v.applicationDeadline),
    startDate: isoOrNull(v.startDate),
    endDate: isoOrNull(v.endDate),
    skills: (v.skills ?? []).map((s) => String(s).trim()).filter(Boolean),
    rounds: (v.rounds ?? []).map((r, i) => ({
      title: r.title,
      description: r.description || null,
      startsAt: isoOrNull(r.startsAt),
      endsAt: isoOrNull(r.endsAt),
      mode: r.mode || null,
      location: r.location || null,
      displayOrder: i,
    })),
    prizes: (v.prizes ?? []).map((p, i) => ({
      title: p.title,
      description: p.description || null,
      rank: p.rank || null,
      value: numOrNull(p.value),
      currency: p.currency || null,
      quantity: intOrNull(p.quantity),
      displayOrder: i,
    })),
    faqs: (v.faqs ?? []).map((f, i) => ({ question: f.question, answer: f.answer || null, displayOrder: i })),
    contact: clean(v.contact ?? {}),
    submissionSettings: {
      acceptsProjects: !!v.submissionSettings?.acceptsProjects,
      requireRepository: !!v.submissionSettings?.requireRepository,
      requireDemo: !!v.submissionSettings?.requireDemo,
      requireVideo: !!v.submissionSettings?.requireVideo,
      minTeamSize: intOrNull(v.submissionSettings?.minTeamSize),
      maxTeamSize: intOrNull(v.submissionSettings?.maxTeamSize),
      guidelines: v.submissionSettings?.guidelines || null,
    },
  }
}

/** A saved opportunity → wizard values. Dates become yyyy-mm-dd so <input type="date"> round-trips. */
function fromRecord(o) {
  return {
    ...EMPTY,
    title: o.title ?? '',
    type: o.type ?? EMPTY.type,
    mode: o.mode ?? EMPTY.mode,
    categoryId: o.categoryId ?? null,
    bannerId: o.bannerId ?? null,
    bannerUrl: o.banner?.url ?? '',
    shortDescription: o.shortDescription ?? '',
    description: o.description ?? '',
    eligibility: o.eligibility ?? '',
    prizeInformation: o.prizeInformation ?? '',
    location: o.location ?? '',
    venue: o.venue ?? '',
    applicationDeadline: dateOnly(o.applicationDeadline),
    startDate: dateOnly(o.startDate),
    endDate: dateOnly(o.endDate),
    externalUrl: o.externalUrl ?? '',
    skills: (o.skills ?? []).map((s) => s.name ?? s),
    rounds: (o.rounds ?? []).map((r) => ({
      title: r.title ?? '',
      description: r.description ?? '',
      startsAt: dateOnly(r.startsAt),
      endsAt: dateOnly(r.endsAt),
      mode: r.mode ?? '',
      location: r.location ?? '',
    })),
    prizes: (o.prizes ?? []).map((p) => ({
      title: p.title ?? '',
      description: p.description ?? '',
      rank: p.rank ?? '',
      value: p.value ?? '',
      currency: p.currency ?? '',
      quantity: p.quantity ?? '',
    })),
    faqs: (o.faqs ?? []).map((f) => ({ question: f.question ?? '', answer: f.answer ?? '' })),
    contact: { ...EMPTY.contact, ...(o.contact ?? {}) },
    submissionSettings: {
      ...EMPTY.submissionSettings,
      acceptsProjects: !!o.submissionSettings?.acceptsProjects,
      requireRepository: !!o.submissionSettings?.requireRepository,
      requireDemo: !!o.submissionSettings?.requireDemo,
      requireVideo: !!o.submissionSettings?.requireVideo,
      minTeamSize: o.submissionSettings?.minTeamSize ?? null,
      maxTeamSize: o.submissionSettings?.maxTeamSize ?? null,
      guidelines: o.submissionSettings?.guidelines ?? '',
    },
  }
}

function CategorySelect({ form }) {
  const categories = useCategories('OPPORTUNITY')
  return (
    <FormField label="Category" htmlFor="categoryId" error={form.errors.categoryId} hint="Drives the filter on the public opportunities page.">
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
          <Text form={form} path="title" label="Title" required placeholder="Smart Campus Hackathon 2026" />
          <div className="grid gap-5 md:grid-cols-2">
            <Choice form={form} path="type" label="Type" options={OPPORTUNITY_TYPES} />
            <Choice form={form} path="mode" label="Mode" options={OPPORTUNITY_MODES} />
          </div>
          <CategorySelect form={form} />
          <Area
            form={form}
            path="shortDescription"
            label="Short description"
            rows={2}
            required
            hint="One line — this is what shows on the card and in search results."
          />
          <ImageField
            form={form}
            path="bannerId"
            urlPath="bannerUrl"
            label="Banner image"
            purpose="BANNER"
            hint="Wide artwork. It becomes the hero on the public program page."
          />
        </>
      )

    case 'description':
      return (
        <>
          <RichArea
            form={form}
            path="description"
            label="Problem statements and details"
            purpose="OTHER"
            minHeight={300}
            placeholder="Describe the tracks, the problem statements and the format…"
            hint="Use the toolbar for headings, lists and images."
          />
          <ListField form={form} path="skills" label="Skills" hint="Separate with commas — e.g. React, Python, Figma" />
        </>
      )

    case 'eligibility':
      return (
        <>
          <RichArea
            form={form}
            path="eligibility"
            label="Eligibility"
            purpose="OTHER"
            minHeight={200}
            placeholder="Who can take part, team sizes, and any restrictions…"
          />
          <fieldset className="space-y-4 rounded-2xl border border-line/12 p-4">
            <legend className="px-2 text-sm font-medium text-bone/90">Who builders should contact</legend>
            <div className="grid gap-4 md:grid-cols-2">
              <Text form={form} path="contact.name" label="Name" />
              <Text form={form} path="contact.designation" label="Designation" />
              <Text form={form} path="contact.email" label="Email" type="email" />
              <Text form={form} path="contact.phone" label="Phone" />
            </div>
            <Text form={form} path="contact.website" label="Website" type="url" placeholder="https://" />
          </fieldset>
        </>
      )

    case 'stages':
      return (
        <>
          <Repeater
            form={form}
            path="rounds"
            label="Rounds and stages"
            itemTitle="round"
            addLabel="Add round"
            hint="Registration, shortlisting, the finale — whatever the program runs through."
            blank={{ title: '', description: '', startsAt: '', endsAt: '', mode: '', location: '' }}
            render={(row, i, { update }) => (
              <div className="space-y-4">
                <RowField row={row} onPatch={(p) => update(i, p)} name="title" label="Round name" hint="e.g. Idea submission" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <RowField row={row} onPatch={(p) => update(i, p)} name="startsAt" label="Starts" type="date" />
                  <RowField row={row} onPatch={(p) => update(i, p)} name="endsAt" label="Ends" type="date" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <RowField row={row} onPatch={(p) => update(i, p)} name="mode" label="Mode" options={OPPORTUNITY_MODES} />
                  <RowField row={row} onPatch={(p) => update(i, p)} name="location" label="Venue" hint="Offline rounds only" />
                </div>
                <RowArea row={row} onPatch={(p) => update(i, p)} name="description" label="What happens in this round" rows={2} />
              </div>
            )}
          />
          <div className="grid gap-5 md:grid-cols-3">
            <Text form={form} path="applicationDeadline" label="Registration deadline" type="date" />
            <Text form={form} path="startDate" label="Program starts" type="date" />
            <Text form={form} path="endDate" label="Program ends" type="date" />
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Text form={form} path="location" label="Location" hint="City, or “Online”" />
            <Text form={form} path="venue" label="Venue" hint="Full address for an offline event" />
          </div>
          <Text form={form} path="externalUrl" label="External link" type="url" placeholder="https://" hint="Your own page for this program, if there is one." />
        </>
      )

    case 'prizes':
      return (
        <>
          <Repeater
            form={form}
            path="prizes"
            label="Prize table"
            itemTitle="prize"
            addLabel="Add prize"
            hint="Each row becomes one card in the Rewards and prizes section."
            blank={{ title: '', description: '', rank: '', value: '', currency: 'INR', quantity: '' }}
            render={(row, i, { update }) => (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <RowField row={row} onPatch={(p) => update(i, p)} name="title" label="Prize" hint="e.g. Grand prize" />
                  <RowField row={row} onPatch={(p) => update(i, p)} name="rank" label="Placement" hint="e.g. 1st place" />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <RowField row={row} onPatch={(p) => update(i, p)} name="value" label="Amount" type="number" number />
                  <RowField row={row} onPatch={(p) => update(i, p)} name="currency" label="Currency" hint="INR, USD…" />
                  <RowField row={row} onPatch={(p) => update(i, p)} name="quantity" label="How many" type="number" number />
                </div>
                <RowArea row={row} onPatch={(p) => update(i, p)} name="description" label="What else it includes" rows={2} />
              </div>
            )}
          />
          <RichArea
            form={form}
            path="prizeInformation"
            label="Prize wording"
            purpose="OTHER"
            minHeight={160}
            placeholder="Anything that does not fit a row — internships, credits, mentorship…"
          />
        </>
      )

    case 'submissions':
      return (
        <>
          <Toggle
            form={form}
            path="submissionSettings.acceptsProjects"
            label="Accept project submissions"
            hint="Builders submit their STUDLYF projects for evaluation."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField form={form} path="submissionSettings.minTeamSize" label="Min team size" min={1} max={20} />
            <NumberField form={form} path="submissionSettings.maxTeamSize" label="Max team size" min={1} max={20} />
          </div>
          <Toggle form={form} path="submissionSettings.requireRepository" label="Require a repository link" />
          <Toggle form={form} path="submissionSettings.requireDemo" label="Require a live demo" />
          <Toggle form={form} path="submissionSettings.requireVideo" label="Require a demo video" />
          <Area form={form} path="submissionSettings.guidelines" label="Submission guidelines" rows={3} />
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
        </>
      )

    case 'review':
      return <Review values={form.values} />

    default:
      return null
  }
}

/** Unstop ends on the same thing: a plain read-back of every field, before the publish button. */
function Review({ values: v }) {
  const contact = v.contact ?? {}
  const rows = [
    ['Type', label(v.type)],
    ['Mode', label(v.mode)],
    ['Short description', v.shortDescription],
    ['Location', [v.location, v.venue].filter(Boolean).join(' · ')],
    ['Registration deadline', v.applicationDeadline ? formatDate(v.applicationDeadline) : null],
    ['Program window', [v.startDate && formatDate(v.startDate), v.endDate && formatDate(v.endDate)].filter(Boolean).join(' → ')],
    ['Rounds', v.rounds?.length ? `${v.rounds.length} round${v.rounds.length === 1 ? '' : 's'}` : null],
    ['Prizes', v.prizes?.length ? `${v.prizes.length} prize${v.prizes.length === 1 ? '' : 's'}` : null],
    ['FAQ', v.faqs?.length ? `${v.faqs.length} question${v.faqs.length === 1 ? '' : 's'}` : null],
    ['Skills', (v.skills ?? []).join(', ')],
    ['Contact', [contact.name, contact.email].filter(Boolean).join(' · ')],
    ['Submissions', v.submissionSettings?.acceptsProjects ? 'Accepts project submissions' : null],
    ['External link', v.externalUrl],
  ].filter(([, value]) => value)

  return (
    <div className="space-y-5">
      <Notice>Publishing makes this program visible to every builder on STUDLYF. You can unpublish it from Programs at any time.</Notice>
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
  const rounds = v.rounds ?? []
  const prizes = v.prizes ?? []
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
          {label(v.type)} · {label(v.mode)}
        </p>
        <p className="display-face mt-1 text-lg leading-tight">{v.title || 'Untitled program'}</p>
        {v.shortDescription && <p className="mt-2 text-sm text-mute">{v.shortDescription}</p>}
      </div>
      <dl className="space-y-2 border-t border-line/10 pt-4 text-sm">
        {v.applicationDeadline && (
          <div className="flex justify-between gap-4">
            <dt className="text-mute">Deadline</dt>
            <dd className="text-bone">{formatDate(v.applicationDeadline)}</dd>
          </div>
        )}
        {v.location && (
          <div className="flex justify-between gap-4">
            <dt className="text-mute">Where</dt>
            <dd className="text-right text-bone">{v.location}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-mute">Rounds</dt>
          <dd className="text-bone">{rounds.length || '—'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-mute">Prizes</dt>
          <dd className="text-bone">{prizes.length || '—'}</dd>
        </div>
      </dl>
    </div>
  )
}

/** Create / configure a program. The organization name comes from the verified organization. */
export function OrgProgramForm() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { canManagePrograms } = useOrgRole()
  const [createdId, setCreatedId] = useState(id ?? null)
  const q = useQuery({ queryKey: ['organization', 'opportunity', id], queryFn: () => api.orgOpportunity(id).then((r) => r.data), enabled: !isNew })
  const typeParam = new URLSearchParams(window.location.search).get('type')
  const published = new URLSearchParams(window.location.search).get('published')
  const o = q.data
  const initial = o ? fromRecord(o) : { ...EMPTY, type: typeParam || EMPTY.type }

  const refresh = () => qc.invalidateQueries({ queryKey: ['organization'] })

  /** Every step persists. The first one creates the draft and remembers its id; the rest patch it. */
  const persistDraft = async (v) => {
    const body = buildBody(v)
    if (createdId) {
      await api.updateOrgOpportunity(createdId, body)
      return createdId
    }
    const { data } = await api.createOrgOpportunity(body)
    setCreatedId(data.id)
    refresh()
    return data.id
  }

  const finish = async (v) => {
    const draftId = await persistDraft(v)
    await api.publishOrgOpportunity(draftId, true)
    refresh()
    navigate(`/organizations/opportunities/${draftId}?published=1`, { replace: true })
  }

  const exit = async (v) => {
    await persistDraft(v)
    refresh()
    navigate('/organizations/opportunities')
  }

  if (!canManagePrograms) {
    return (
      <ProductPage eco="ORGANIZER" title="Program">
        <Notice>Your organization role is read-only for programs.</Notice>
      </ProductPage>
    )
  }

  return (
    <ProductPage
      eco="ORGANIZER"
      title={isNew ? 'Create a program' : o?.title ?? 'Program'}
      subtitle="Each step saves a draft, so nothing is lost if you stop. Publish when it’s ready."
    >
      {published && (
        <div className="mb-6">
          <Notice tone="success">Published. It is live on the public page now.</Notice>
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
          finishLabel="Publish program"
        />
      </QueryState>
    </ProductPage>
  )
}
