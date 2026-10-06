import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMockDrills } from '../lib/queries'
import { Button, ArrowIcon } from '../components/ui/Button'
import { Chip, Badge } from '../components/ui/atoms'
import { RevealGroup, RevealItem, trackSpotlight } from '../components/ui/Reveal'
import { ExploreHero, StatPills, GridState, GridSkeletons } from '../components/explore/parts'

const STAT_PILLS = [
  { label: 'Rounds', value: '3' },
  { label: 'Mode', value: 'Live AI' },
  { label: 'Timing', value: 'Adaptive' },
  { label: 'Feedback', value: 'Instant' },
]

const KINDS = [
  { key: '', label: 'All' },
  { key: 'TEST', label: 'Tests' },
  { key: 'INTERVIEW', label: 'Interviews' },
]

const DIFF_TONE = { BEGINNER: 'open', INTERMEDIATE: 'soon', ADVANCED: 'urgent' }

// Inline SVG icons (no external deps) keyed by feature.
const FEATURE_ICONS = {
  modules: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h18v4H3z" />
      <path d="M4 8v12h16V8" />
      <path d="M9 12h6" />
    </svg>
  ),
  simulator: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
      <path d="M9 9h.01M15 9h.01M9 12.5c1.5 1.2 4.5 1.2 6 0" />
    </svg>
  ),
  dreamer: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.4 1 2.3V17h6v-1.2c0-.9.4-1.7 1-2.3A6 6 0 0 0 12 3Z" />
      <path d="M9 21h6M10 17v4M14 17v4" />
    </svg>
  ),
  tracker: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V4M4 20h16" />
      <path d="M8 16v-4M12 16V8M16 16v-6" />
    </svg>
  ),
}

const FEATURES = [
  { icon: 'modules', title: 'Company Learning Modules', desc: 'Master placement preparation with company-specific learning paths tailored for Google, Amazon, Microsoft, and more.', to: '/courses' },
  { icon: 'simulator', title: 'AI Mock Interview Simulator', desc: 'Practice realistic company-level mock interviews with adaptive questions designed for Google, Amazon, and Microsoft preparation.', to: '/mock-drills' },
  { icon: 'dreamer', title: 'AI Career Dreamer', desc: 'Discover personalized career paths based on your skills, interests, strengths, and technical experience.', to: '/courses' },
  { icon: 'tracker', title: 'Placement Progress Tracker', desc: 'Track preparation progress, revisit interview sessions, and measure improvement throughout your placement journey.', to: '/mock-drills' },
]

const LIST_CARDS = [
  { title: 'How it helps', bullets: ['Reduce interview anxiety', 'Practice structured answers', 'Get instant feedback', 'Track confidence over time'] },
  { title: 'What you can try', bullets: ['Text answers', 'Voice answers', 'Timed assessments', 'Domain-based scenarios'] },
  { title: 'What happens next', bullets: ['Pick your profile', 'Answer questions one by one', 'Review score and strengths', 'Revisit your history later'] },
]

function FeatureCard({ feature, index }) {
  return (
    <RevealItem onMouseMove={trackSpotlight} className="h-full">
      <Link
        to={feature.to}
        className="spotlight-card card-surface group flex h-full flex-col p-6 transition-transform duration-300 hover:-translate-y-1"
      >
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-acid/10 text-acid transition-transform duration-300 group-hover:scale-110">
          <span className="h-6 w-6">{FEATURE_ICONS[feature.icon]}</span>
        </div>
        <div className="mt-5 text-[10px] font-medium uppercase tracking-[0.35em] text-acid">Feature {index + 1}</div>
        <h3 className="mt-2 text-lg font-semibold tracking-tight text-bone transition-colors group-hover:text-acid">{feature.title}</h3>
        <p className="mt-2 text-sm leading-6 text-mute">{feature.desc}</p>
      </Link>
    </RevealItem>
  )
}

function DrillCard({ drill }) {
  const diff = (drill.difficulty || '').toUpperCase()
  return (
    <RevealItem onMouseMove={trackSpotlight} className="h-full">
      <Link
        to={`/mock-drills/${drill.slug}`}
        className="spotlight-card card-surface group flex h-full flex-col p-6 transition-transform duration-300 hover:-translate-y-1"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="violet">{drill.kind === 'INTERVIEW' ? 'Interview' : 'Test'}</Badge>
          {diff && <Badge tone={DIFF_TONE[diff] || 'neutral'}>{diff.charAt(0) + diff.slice(1).toLowerCase()}</Badge>}
        </div>
        <h3 className="mt-3 text-lg font-semibold tracking-tight text-bone transition-colors group-hover:text-acid">{drill.title}</h3>
        {drill.summary && <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-mute">{drill.summary}</p>}
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-acid">
          Start drill
          <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </Link>
    </RevealItem>
  )
}

export default function MockDrills() {
  const [kind, setKind] = useState('')

  const { data, isLoading, isError, refetch } = useMockDrills({ kind: kind || undefined, page: 1, pageSize: 12 })

  const items = data?.items || []
  const total = data?.meta?.total ?? items.length
  const firstSlug = items[0]?.slug
  const startTo = firstSlug ? `/mock-drills/${firstSlug}` : '/mock-drills'

  return (
    <>
      <ExploreHero
        eyebrow="Interview readiness"
        title="Mock interview."
        lead="Simulate realistic interviews with AI, voice and video practice. Build confidence for technical, behavioural and HR rounds before the real call."
      >
        <StatPills items={STAT_PILLS} className="mt-10 max-w-2xl" />
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button to={startTo} magnetic={false}>
            Start practice <ArrowIcon />
          </Button>
          <Button to="/mock-drills" variant="outline" magnetic={false}>
            History
          </Button>
        </div>
      </ExploreHero>

      <div className="wrap py-12">
        {/* Feature cards */}
        <RevealGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i} />
          ))}
        </RevealGroup>

        {/* Info cards */}
        <RevealGroup className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {LIST_CARDS.map((panel) => (
            <RevealItem key={panel.title} className="card-surface p-6">
              <h3 className="mb-4 text-lg font-semibold tracking-tight text-bone">{panel.title}</h3>
              <ul className="space-y-3 text-sm text-mute">
                {panel.bullets.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-acid" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </RevealItem>
          ))}
        </RevealGroup>

        {/* Practice library */}
        <div className="mt-16">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line/10 pb-6">
            <div>
              <h2 className="display-face text-3xl tracking-tight">Practice library</h2>
              <p className="mt-1 text-sm text-mute">Timed tests and mock interviews that mirror what top companies ask.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {KINDS.map((k) => (
                <Chip key={k.key || 'all'} active={kind === k.key} onClick={() => setKind(k.key)}>
                  {k.label}
                </Chip>
              ))}
            </div>
          </div>

          <div className="pt-8">
            <GridState
              isLoading={isLoading}
              isError={isError}
              isEmpty={items.length === 0}
              onRetry={refetch}
              skeleton={<GridSkeletons count={6} itemClassName="h-52" />}
              emptyTitle="No drills found."
              emptyHint="Try a different filter and check back soon."
            >
              <p className="mb-6 text-sm text-mute">
                {total} result{total === 1 ? '' : 's'}
              </p>
              <RevealGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((d) => (
                  <DrillCard key={d.id} drill={d} />
                ))}
              </RevealGroup>
            </GridState>
          </div>
        </div>
      </div>
    </>
  )
}


