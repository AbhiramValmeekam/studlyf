import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../lib/api'
import { useResumes } from '../lib/queries'
import { useAuth } from '../context/AuthContext'
import { formatDate } from '../lib/format'
import { Button, ArrowIcon } from '../components/ui/Button'
import { Badge, EmptyState, ErrorState, Skeleton } from '../components/ui/atoms'
import { RevealGroup, RevealItem, trackSpotlight } from '../components/ui/Reveal'
import { ExploreHero, StatPills, SectionLabel } from '../components/explore/parts'

const svgProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const FEATURES = [
  {
    title: 'AI-Powered Review',
    desc: 'Get real-time suggestions to improve your content, keywords, and ATS score in under 60 seconds.',
    tint: 'bg-acid/10 text-acid',
    icon: (
      <svg {...svgProps} className="h-5 w-5">
        <path d="m12 3 1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3Z" />
        <path d="M19 15v4M17 17h4M5 4v3M3.5 5.5h3" />
      </svg>
    ),
  },
  {
    title: 'Clean Templates',
    desc: 'Choose from ATS-optimized templates designed by hiring professionals and career coaches.',
    tint: 'bg-violet/15 text-violet',
    icon: (
      <svg {...svgProps} className="h-5 w-5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    title: 'Instant Sharing',
    desc: 'Export a polished PDF or share a live link recruiters can open on any device — no formatting drift.',
    tint: 'bg-acid/10 text-acid',
    icon: (
      <svg {...svgProps} className="h-5 w-5">
        <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
        <path d="M12 3v13M8 7l4-4 4 4" />
      </svg>
    ),
  },
  {
    title: 'Modular Sections',
    desc: 'Add, reorder and hide sections — projects, experience, awards — to fit any role in seconds.',
    tint: 'bg-amber-400/15 text-amber-300',
    icon: (
      <svg {...svgProps} className="h-5 w-5">
        <rect x="3" y="4" width="18" height="4" rx="1" />
        <rect x="3" y="10" width="18" height="4" rx="1" />
        <rect x="3" y="16" width="18" height="4" rx="1" />
      </svg>
    ),
  },
  {
    title: 'Auto-Save',
    desc: 'Every keystroke is saved to your account. Pick up exactly where you left off, on any device.',
    tint: 'bg-flare/15 text-flare',
    icon: (
      <svg {...svgProps} className="h-5 w-5">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
        <path d="M17 21v-8H7v8M7 3v5h8" />
      </svg>
    ),
  },
  {
    title: 'Live Preview',
    desc: 'Watch your resume update in real time as you type — what you see is exactly what recruiters get.',
    tint: 'bg-violet/15 text-violet',
    icon: (
      <svg {...svgProps} className="h-5 w-5">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
]

const STEPS = [
  { n: '01', title: 'Pick a template', desc: 'Start from an ATS-ready layout built by hiring pros — swap it anytime without losing content.' },
  { n: '02', title: 'Fill it with your story', desc: 'Guided sections and live AI suggestions turn rough notes into sharp, recruiter-ready bullets.' },
  { n: '03', title: 'Export & share', desc: 'Download a pixel-perfect PDF or share a live link. Come back to update it whenever you grow.' },
]

const STATS = [
  { label: 'ATS pass rate', value: '98%' },
  { label: 'First draft', value: '2 min' },
  { label: 'Price', value: 'Free' },
  { label: 'Templates', value: '4' },
]
// The four preview mocks stay on white "paper" — they represent printed resume documents,
// so black-on-white is intentional. Each is framed on a dark card by TemplateCard below.
const bar = (w, tone = 'bg-gray-200') => <span className={`block h-1.5 rounded-full ${tone}`} style={{ width: w }} />

function ClassicMock() {
  return (
    <div className="flex h-full flex-col gap-2.5 p-5 font-serif">
      <div className="mx-auto flex w-full flex-col items-center gap-1.5 border-b border-gray-200 pb-3 text-center">
        <span className="block h-2 w-1/2 rounded bg-gray-800" />
        {bar('60%', 'bg-gray-300')}
      </div>
      {[0, 1].map((s) => (
        <div key={s} className="flex flex-col gap-1.5 pt-1">
          <span className="block h-1.5 w-1/3 rounded bg-gray-700" />
          {bar('100%')}
          {bar('92%')}
          {bar('78%')}
        </div>
      ))}
    </div>
  )
}

function ModernMock() {
  return (
    <div className="flex h-full">
      <div className="flex w-1/3 flex-col gap-2 bg-violet-600/90 p-3">
        <span className="block h-6 w-6 rounded-full bg-white/80" />
        {bar('90%', 'bg-white/70')}
        {bar('70%', 'bg-white/40')}
        {bar('80%', 'bg-white/40')}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="block h-2.5 w-2/3 rounded bg-gray-800" />
        {bar('50%', 'bg-violet-300')}
        <div className="mt-1 flex flex-col gap-1.5">
          {bar('100%')}
          {bar('88%')}
          {bar('94%')}
        </div>
      </div>
    </div>
  )
}
function MinimalMock() {
  return (
    <div className="flex h-full flex-col gap-3 p-6">
      <span className="block h-2.5 w-2/5 rounded bg-gray-900" />
      <span className="block h-px w-full bg-gray-200" />
      {[0, 1, 2].map((s) => (
        <div key={s} className="flex flex-col gap-1.5">
          <span className="block h-1.5 w-1/4 rounded bg-gray-400" />
          {bar('100%', 'bg-gray-200')}
          {bar('85%', 'bg-gray-200')}
        </div>
      ))}
    </div>
  )
}

function TechnicalMock() {
  return (
    <div className="flex h-full flex-col gap-2.5 p-5 font-mono">
      <div className="flex items-center gap-2">
        <span className="block h-2 w-2 rounded-sm bg-emerald-500" />
        <span className="block h-2 w-1/2 rounded bg-gray-800" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {['w-10', 'w-8', 'w-12', 'w-9', 'w-7'].map((w, i) => (
          <span key={i} className={`block h-3 rounded bg-gray-100 ring-1 ring-gray-200 ${w}`} />
        ))}
      </div>
      {[0, 1].map((s) => (
        <div key={s} className="flex flex-col gap-1.5 border-l-2 border-emerald-400 pl-2">
          {bar('96%')}
          {bar('80%')}
        </div>
      ))}
    </div>
  )
}

const TEMPLATES = [
  { id: 'classic', name: 'Classic', tag: 'Timeless', desc: 'Traditional single-column layout trusted across every industry.', Mock: ClassicMock },
  { id: 'modern', name: 'Modern', tag: 'Popular', desc: 'A bold accent sidebar that puts your name and skills up front.', Mock: ModernMock },
  { id: 'minimal', name: 'Minimal', tag: 'Clean', desc: 'Generous whitespace and quiet typography — content does the talking.', Mock: MinimalMock },
  { id: 'technical', name: 'Technical', tag: 'For engineers', desc: 'Monospace headings and a skills-first structure built for dev roles.', Mock: TechnicalMock },
]
function FeatureCard({ feature }) {
  return (
    <RevealItem onMouseMove={trackSpotlight} className="h-full">
      <div className="spotlight-card card-surface flex h-full flex-col p-6">
        <div className={`grid h-11 w-11 place-items-center rounded-xl ${feature.tint}`}>{feature.icon}</div>
        <h3 className="mt-5 text-lg font-semibold tracking-tight text-bone">{feature.title}</h3>
        <p className="mt-2 text-sm leading-6 text-mute">{feature.desc}</p>
      </div>
    </RevealItem>
  )
}

function TemplateCard({ tpl }) {
  const { Mock } = tpl
  return (
    <RevealItem onMouseMove={trackSpotlight} className="h-full">
      <Link
        to={`/resume-builder/new?template=${tpl.id}`}
        className="spotlight-card card-surface group flex h-full flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1"
      >
        <div className="relative overflow-hidden border-b border-line/10 bg-gradient-to-br from-line/[0.06] to-transparent p-5">
          <div className="aspect-[3/4] w-full overflow-hidden rounded-lg bg-white shadow-lg shadow-black/30 ring-1 ring-black/5 transition-transform duration-500 group-hover:scale-[1.03]">
            <Mock />
          </div>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold tracking-tight text-bone transition-colors group-hover:text-acid">{tpl.name}</h3>
            <Badge tone="violet">{tpl.tag}</Badge>
          </div>
          <p className="mt-2 flex-1 text-sm leading-6 text-mute">{tpl.desc}</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-acid">
            Use this template
            <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </div>
      </Link>
    </RevealItem>
  )
}
function ResumeCard({ resume, onDelete, busy }) {
  return (
    <RevealItem onMouseMove={trackSpotlight} className="h-full">
      <div className="spotlight-card card-surface group flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-bone">{resume.title || 'Untitled resume'}</h3>
            <p className="mt-1 text-xs text-mute">Updated {formatDate(resume.updatedAt)}</p>
          </div>
          {resume.template && <Badge tone="neutral">{resume.template}</Badge>}
        </div>
        <div className="mt-5 flex items-center gap-2 border-t border-line/10 pt-4">
          <Button to={`/resume-builder/${resume.id}`} variant="outline" size="sm" magnetic={false}>
            Edit
          </Button>
          <button
            type="button"
            onClick={() => onDelete(resume)}
            disabled={busy}
            className="ml-auto rounded-lg px-3 py-1.5 text-sm text-mute transition-colors hover:bg-flare/10 hover:text-flare disabled:opacity-50"
          >
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </RevealItem>
  )
}

export default function ResumeBuilder() {
  const { isAuthed } = useAuth()
  const queryClient = useQueryClient()
  const [deleting, setDeleting] = useState(null)
  const { data, isLoading, isError, refetch } = useResumes({ page: 1, pageSize: 50 }, isAuthed)
  const resumes = data?.items || []

  const onDelete = async (resume) => {
    if (!window.confirm(`Delete "${resume.title || 'this resume'}"? This cannot be undone.`)) return
    setDeleting(resume.id)
    try {
      await api.deleteResume(resume.id)
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not delete this resume.'
      window.alert(msg)
    } finally {
      setDeleting(null)
    }
  }

  const scrollToSaved = () => {
    document.getElementById('saved-resumes')?.scrollIntoView({ behavior: 'smooth' })
  }
  return (
    <>
      <ExploreHero
        eyebrow="Job Prep · Résumé"
        title="Build a resume that gets replies."
        lead="A guided, AI-assisted builder with ATS-ready templates. Draft in minutes, refine with live suggestions, and export a recruiter-ready PDF — free."
      >
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button to="/resume-builder/new" magnetic={false}>
            Create a resume <ArrowIcon />
          </Button>
          <Button variant="outline" magnetic={false} onClick={scrollToSaved}>
            View saved resumes
          </Button>
        </div>
        <StatPills items={STATS} className="mt-10 max-w-2xl" />
      </ExploreHero>

      <div className="wrap py-16">
        {/* Features */}
        <SectionLabel
          eyebrow="Why STUDLYF"
          title="Everything you need to stand out."
          lead="Purpose-built tools that turn a blank page into an interview-winning resume."
        />
        <RevealGroup className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} feature={f} />
          ))}
        </RevealGroup>
        {/* Templates */}
        <section className="mt-24">
          <SectionLabel
            eyebrow="Templates"
            title="Four templates, endless possibilities."
            lead="ATS-optimized layouts designed with hiring professionals. Pick one to start — switch anytime without losing your content."
          />
          <RevealGroup className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TEMPLATES.map((tpl) => (
              <TemplateCard key={tpl.id} tpl={tpl} />
            ))}
          </RevealGroup>
        </section>

        {/* How it works */}
        <section className="mt-24">
          <SectionLabel eyebrow="How it works" title="From blank page to hired in three steps." />
          <RevealGroup className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            {STEPS.map((step) => (
              <RevealItem key={step.n} onMouseMove={trackSpotlight} className="h-full">
                <div className="spotlight-card card-surface flex h-full flex-col p-6">
                  <span className="display-face text-4xl text-acid/80">{step.n}</span>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight text-bone">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-mute">{step.desc}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </section>
        {/* Saved resumes */}
        <section id="saved-resumes" className="mt-24 scroll-mt-28">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line/10 pb-6">
            <div>
              <h2 className="display-face text-3xl tracking-tight text-bone">Your resumes</h2>
              <p className="mt-1 text-sm text-mute">Everything you&apos;ve built, saved to your account.</p>
            </div>
            <Button to="/resume-builder/new" size="sm" magnetic={false}>
              New resume <ArrowIcon />
            </Button>
          </div>

          <div className="pt-8">
            {!isAuthed ? (
              <EmptyState
                title="Sign in to see your resumes"
                hint="Your drafts are saved to your account so you can pick up on any device."
              />
            ) : isError ? (
              <ErrorState onRetry={refetch} />
            ) : isLoading ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-36 w-full" />
                ))}
              </div>
            ) : resumes.length === 0 ? (
              <EmptyState
                title="No resumes yet"
                hint="Pick a template above to create your first resume — it takes about two minutes."
              />
            ) : (
              <RevealGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {resumes.map((r) => (
                  <ResumeCard key={r.id} resume={r} onDelete={onDelete} busy={deleting === r.id} />
                ))}
              </RevealGroup>
            )}
          </div>
        </section>
      </div>
    </>
  )
}