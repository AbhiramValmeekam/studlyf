import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useCommunityProject } from '../lib/queries'
import { Badge, Spinner, ErrorState } from '../components/ui/atoms'
import Wizard from '../components/ui/Wizard'
import { FormField, Select } from '../components/ui/Field'
import { CATEGORY_LABELS, categoryLabel } from '../components/ui/cards'
import { PROJECT_TYPES } from '../lib/enums'
import { label as enumLabel } from '../components/ecosystem/product'
import { ImageField, ListField, MediaListField, RichArea, Text, setPath } from '../components/ecosystem/forms'

const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS)
const LINK_KEYS = ['repo', 'demo', 'video', 'website']
const LINK_LABELS = { repo: 'Repository', demo: 'Live demo', video: 'Video', website: 'Website' }

const EMPTY = {
  title: '',
  tagline: '',
  category: 'WEB',
  projectType: 'PERSONAL',
  technologies: [],
  teamName: '',
  startDate: '',
  endDate: '',
  description: '',
  problemStatement: '',
  solution: '',
  impact: '',
  coverImageId: null,
  coverImageUrl: '',
  media: [],
  links: { repo: '', demo: '', video: '', website: '' },
}

const isoOrNull = (v) => (v ? new Date(v).toISOString() : null)
const dateOnly = (iso) => (iso ? String(iso).slice(0, 10) : '')
const textOf = (html) => String(html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

const STEPS = [
  {
    key: 'basics',
    label: 'Basics',
    title: 'What you built',
    subtitle: 'The name, the one-liner and the image that will represent it everywhere.',
    required: ['title', 'tagline'],
  },
  {
    key: 'build',
    label: 'The build',
    title: 'The build',
    subtitle: 'Problem, approach, outcome — the three questions every reader actually has.',
    validate: (v) =>
      textOf(v.description).length >= 20
        ? null
        : { description: 'Write at least a couple of sentences (20 characters or more).' },
  },
  { key: 'stack', label: 'Stack', title: 'Stack and links', subtitle: 'What it is made of, and where people can find it.' },
  { key: 'team', label: 'Team', title: 'Team and timeline', subtitle: 'Who built it, and when.' },
  { key: 'review', label: 'Review', title: 'Review and publish', subtitle: 'Projects go live in the community the moment you publish.' },
]

/** The exact body the community routes accept — an explicit allow-list. */
function buildPayload(v) {
  const links = {}
  for (const k of LINK_KEYS) links[k] = (v.links?.[k] ?? '').trim() || null
  return {
    title: v.title.trim(),
    tagline: v.tagline.trim(),
    category: v.category,
    projectType: v.projectType || 'PERSONAL',
    technologies: (v.technologies ?? []).map((s) => String(s).trim()).filter(Boolean),
    teamName: v.teamName?.trim() || null,
    startDate: isoOrNull(v.startDate),
    endDate: isoOrNull(v.endDate),
    description: v.description || null,
    problemStatement: v.problemStatement || null,
    solution: v.solution || null,
    impact: v.impact || null,
    coverImageId: v.coverImageId || null,
    // The preview url is UI state the gallery keeps beside the id; only these three keys are sent.
    media: (v.media ?? []).map((m) => ({ assetId: m.assetId, kind: m.kind || 'SCREENSHOT', caption: m.caption?.trim() || null })),
    links,
  }
}

/** An existing project → wizard values. The public detail carries the cover as a media object. */
function fromRecord(p) {
  return {
    ...EMPTY,
    title: p.title ?? '',
    tagline: p.tagline ?? '',
    category: p.category ?? 'WEB',
    projectType: p.projectType ?? 'PERSONAL',
    technologies: p.technologies ?? [],
    teamName: p.teamName ?? '',
    startDate: dateOnly(p.startDate),
    endDate: dateOnly(p.endDate),
    description: p.description ?? '',
    problemStatement: p.problemStatement ?? '',
    solution: p.solution ?? '',
    impact: p.impact ?? '',
    coverImageId: p.coverImage?.id ?? null,
    coverImageUrl: p.coverImage?.url ?? '',
    media: (p.media ?? []).map((m) => ({ assetId: m.id, url: m.url, kind: 'SCREENSHOT', caption: m.caption ?? '' })),
    links: { repo: p.links?.repo ?? '', demo: p.links?.demo ?? '', video: p.links?.video ?? '', website: p.links?.website ?? '' },
  }
}

function renderStep(step, form) {
  switch (step.key) {
    case 'basics':
      return (
        <>
          <Text form={form} path="title" label="Title" required placeholder="PitchLoop — pitch practice coach" />
          <Text form={form} path="tagline" label="Tagline" required hint="One line that sells it." placeholder="Practise your pitch and get feedback on every take." />
          <FormField label="Category" htmlFor="category" error={form.errors.category}>
            <Select
              id="category"
              value={form.values.category ?? ''}
              onChange={(e) => form.setValues((cur) => setPath(cur, 'category', e.target.value))}
              error={form.errors.category}
            >
              {CATEGORY_KEYS.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
            </Select>
          </FormField>
          <ImageField
            form={form}
            path="coverImageId"
            urlPath="coverImageUrl"
            label="Cover image"
            purpose="THUMBNAIL"
            hint="Shown on the project card and as the hero on the project page."
          />
        </>
      )

    case 'build':
      return (
        <>
          <RichArea
            form={form}
            path="description"
            label="Overview"
            purpose="OTHER"
            minHeight={220}
            placeholder="What it does, how you built it, what you learned…"
            hint="Rich text and images are both fine — the toolbar adds them."
          />
          <RichArea
            form={form}
            path="problemStatement"
            label="Problem"
            purpose="OTHER"
            minHeight={150}
            placeholder="What was broken or missing?"
          />
          <RichArea
            form={form}
            path="solution"
            label="Solution"
            purpose="OTHER"
            minHeight={150}
            placeholder="How does yours fix it?"
          />
          <RichArea
            form={form}
            path="impact"
            label="Impact"
            purpose="OTHER"
            minHeight={150}
            placeholder="What changed — users, results, lessons?"
          />
          <MediaListField
            form={form}
            path="media"
            label="Screenshots"
            hint="Up to 8. They appear in a gallery on the project page."
            max={8}
          />
        </>
      )

    case 'stack':
      return (
        <>
          <ListField
            form={form}
            path="technologies"
            label="Tech stack"
            hint="Separate with commas — e.g. React, Node.js, Postgres. Shown as the project's stack."
          />
          <div>
            <p className="mb-3 text-sm font-medium text-bone/90">Links</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {LINK_KEYS.map((k) => (
                <Text key={k} form={form} path={`links.${k}`} label={LINK_LABELS[k]} type="url" placeholder="https://" />
              ))}
            </div>
          </div>
        </>
      )

    case 'team':
      return (
        <>
          <Text form={form} path="teamName" label="Team name" hint="Leave blank if you built it alone." placeholder="e.g. Team Null Pointer" />
          <FormField label="Project type" htmlFor="projectType" error={form.errors.projectType} hint="How this came about.">
            <Select
              id="projectType"
              value={form.values.projectType ?? ''}
              onChange={(e) => form.setValues((cur) => setPath(cur, 'projectType', e.target.value))}
              error={form.errors.projectType}
            >
              {PROJECT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {enumLabel(t)}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="grid gap-5 sm:grid-cols-2">
            <Text form={form} path="startDate" label="Started" type="date" />
            <Text form={form} path="endDate" label="Finished" type="date" />
          </div>
        </>
      )

    case 'review':
      return <Review values={form.values} />

    default:
      return null
  }
}

function Review({ values: v }) {
  const rows = [
    ['Category', v.category ? categoryLabel(v.category) : null],
    ['Type', v.projectType ? enumLabel(v.projectType) : null],
    ['Stack', (v.technologies ?? []).join(', ')],
    ['Team', v.teamName],
    ['Screenshots', v.media?.length ? `${v.media.length} image${v.media.length === 1 ? '' : 's'}` : null],
    ['Built', [v.startDate, v.endDate].filter(Boolean).join(' → ')],
    [
      'Sections written',
      [
        v.problemStatement && 'Problem',
        v.solution && 'Solution',
        v.impact && 'Impact',
      ]
        .filter(Boolean)
        .join(', ') || null,
    ],
    ['Links', LINK_KEYS.map((k) => v.links?.[k]).filter(Boolean).length ? `${LINK_KEYS.filter((k) => v.links?.[k]).length} added` : null],
  ].filter(([, value]) => value)

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-line/12 p-4">
        <p className="text-sm text-mute">
          Your project goes straight to the public community showcase. You can edit or delete it at any time from your
          project page.
        </p>
      </div>
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
  return (
    <div className="space-y-4">
      <div className="aspect-[16/9] overflow-hidden rounded-xl border border-line/10 bg-ink2">
        {v.coverImageUrl ? (
          <img src={v.coverImageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-xs text-mute">No cover yet</div>
        )}
      </div>
      <div>
        <Badge tone="violet">{categoryLabel(v.category)}</Badge>
        <p className="display-face mt-2 text-lg leading-tight">{v.title || 'Untitled project'}</p>
        {v.tagline && <p className="mt-2 text-sm text-mute">{v.tagline}</p>}
      </div>
      {v.technologies?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-line/10 pt-4">
          {v.technologies.filter(Boolean).map((t) => (
            <span key={t} className="rounded-full border border-line/15 px-2.5 py-1 text-xs text-mute">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProjectForm() {
  const { slug } = useParams()
  const editing = !!slug
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: existing, isLoading, isError, refetch } = useCommunityProject(editing ? slug : undefined)

  if (editing && isLoading) {
    return (
      <div className="grid min-h-[60svh] place-items-center">
        <Spinner className="h-7 w-7 text-acid" />
      </div>
    )
  }
  if (editing && isError) {
    return (
      <div className="wrap py-24">
        <ErrorState onRetry={refetch} />
      </div>
    )
  }

  const finish = async (v) => {
    const payload = buildPayload(v)
    const { data } = editing ? await api.updateProject(existing.id, payload) : await api.createProject(payload)
    qc.invalidateQueries({ queryKey: ['community-projects'] })
    qc.invalidateQueries({ queryKey: ['community-my-projects'] })
    qc.invalidateQueries({ queryKey: ['community-tags'] })
    qc.invalidateQueries({ queryKey: ['community-project', data.slug] })
    navigate(`/community/${data.slug}`)
  }

  return (
    <Wizard
      eyebrow={editing ? 'Edit project' : 'Submit a project'}
      title={editing ? 'Edit your project' : 'Share what you built'}
      subtitle="Projects appear in the community showcase the moment you publish. Keep it honest and specific."
      steps={STEPS}
      initialValues={existing ? fromRecord(existing) : EMPTY}
      onFinish={finish}
      renderStep={renderStep}
      preview={preview}
      previewTitle="Card preview"
      labels={{ next: 'Continue' }}
      finishLabel={editing ? 'Save changes' : 'Publish project'}
    />
  )
}
