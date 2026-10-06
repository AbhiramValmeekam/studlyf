import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useProjectBriefs } from '../lib/queries'
import { CATEGORY_LABELS, categoryLabel } from '../components/ui/cards'
import { titleCase } from '../lib/format'
import { Button, ArrowIcon } from '../components/ui/Button'
import { Chip, Tag, Badge } from '../components/ui/atoms'
import { SearchField } from '../components/ui/SearchField'
import { RevealGroup, RevealItem, trackSpotlight } from '../components/ui/Reveal'
import { ExploreHero, StatPills, GridState } from '../components/explore/parts'

const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS)
const LEVELS = [
  { key: 'BEGINNER', label: 'Beginner' },
  { key: 'INTERMEDIATE', label: 'Intermediate' },
  { key: 'ADVANCED', label: 'Advanced' },
]
const TABS = ['Top Launches', 'Trending Today', 'Open to Collaborate', 'Recently Completed']
const LEVEL_GLYPH = { BEGINNER: '◆', INTERMEDIATE: '◈', ADVANCED: '⬢' }

function ProjectRow({ brief }) {
  return (
    <RevealItem onMouseMove={trackSpotlight}>
      <Link
        to={`/project-briefs/${brief.slug}`}
        className="spotlight-card card-surface group flex items-stretch gap-4 p-4 transition-transform duration-300 hover:-translate-y-0.5 sm:p-5"
      >
        <div className="flex w-14 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-acid/20 bg-acid/[0.06] py-2 text-acid">
          <span className="text-lg leading-none">{LEVEL_GLYPH[brief.difficulty] || '◆'}</span>
          <span className="text-[9px] font-bold uppercase tracking-wide">{titleCase(brief.difficulty).slice(0, 4)}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-semibold text-bone transition-colors group-hover:text-acid">{brief.title}</h3>
            <Badge tone="violet">{categoryLabel(brief.category)}</Badge>
            {brief.featured && <Badge tone="soon">Featured</Badge>}
          </div>
          {brief.summary && <p className="mt-1 line-clamp-1 text-sm text-mute">{brief.summary}</p>}
          {brief.skills?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {brief.skills.slice(0, 4).map((s) => (
                <Tag key={s.slug}>{s.name}</Tag>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end justify-between gap-2">
          {brief.estimatedHours ? <span className="text-xs text-mute">~{brief.estimatedHours}h build</span> : <span />}
          <span className="rounded-lg border border-acid/25 bg-acid/[0.08] px-3 py-1.5 text-xs font-medium text-acid transition-colors group-hover:bg-acid/15">
            View brief →
          </span>
        </div>
      </Link>
    </RevealItem>
  )
}

export default function ProjectBriefs() {
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState(0)
  const q = params.get('q') || ''
  const category = params.get('category') || ''
  const difficulty = params.get('difficulty') || ''
  const sort = params.get('sort') || (q ? 'relevance' : 'newest')

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete('page')
    setParams(next, { replace: true })
  }

  const { data, isLoading, isError, refetch } = useProjectBriefs({
    q: q || undefined,
    category: category || undefined,
    difficulty: difficulty || undefined,
    sort,
    page: 1,
    pageSize: 24,
  })

  const items = data?.items || []
  const total = data?.meta?.total ?? items.length
  const featuredCount = items.filter((b) => b.featured).length
  const stats = [
    { label: 'Live briefs', value: total },
    { label: 'Skill tracks', value: CATEGORY_KEYS.length },
    { label: 'Difficulty levels', value: LEVELS.length },
    { label: 'Featured now', value: featuredCount },
  ]

  return (
    <>
      <ExploreHero
        eyebrow="Engineering lab protocol"
        title="Build a project."
        lead="Build and scale industry-standard projects with clear deliverables. Own the architecture, prove your system thinking, and slot the result straight into your portfolio."
      >
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button to="/community/submit" magnetic={false}>
            Start a new project <ArrowIcon />
          </Button>
        </div>
        <StatPills items={stats} className="mt-10" />
      </ExploreHero>

      <div className="wrap py-12">
        <div className="card-surface p-5 sm:p-7">
          <SearchField value={q} onSearch={(v) => setParam('q', v)} placeholder="Search projects, stacks, problems…" />

          <div className="mt-5 flex flex-wrap gap-2">
            {TABS.map((t, i) => (
              <Chip key={t} active={tab === i} onClick={() => setTab(i)}>
                {t}
              </Chip>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line/10 pt-4">
            <Chip active={!category} onClick={() => setParam('category', '')}>
              All
            </Chip>
            {CATEGORY_KEYS.map((c) => (
              <Chip key={c} active={category === c} onClick={() => setParam('category', category === c ? '' : c)}>
                {categoryLabel(c)}
              </Chip>
            ))}
            <span className="mx-1 h-4 w-px bg-line/15" />
            {LEVELS.map((l) => (
              <Chip key={l.key} active={difficulty === l.key} onClick={() => setParam('difficulty', difficulty === l.key ? '' : l.key)}>
                {l.label}
              </Chip>
            ))}
          </div>

          <div className="mt-6">
            <GridState
              isLoading={isLoading}
              isError={isError}
              isEmpty={items.length === 0}
              onRetry={refetch}
              skeleton={
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-24 animate-pulse rounded-xl bg-line/[0.08]" />
                  ))}
                </div>
              }
              emptyTitle="No projects found."
              emptyHint="Try a different filter or search term."
            >
              <RevealGroup className="space-y-3">
                {items.map((b) => (
                  <ProjectRow key={b.id} brief={b} />
                ))}
              </RevealGroup>
            </GridState>
          </div>
        </div>

        {/* CTA */}
        <div className="relative mt-12 overflow-hidden rounded-3xl border border-line/10 bg-gradient-to-br from-acid/[0.08] to-violet/[0.06] p-10 text-center sm:p-14">
          <h2 className="display-face text-3xl tracking-tight sm:text-4xl">Ready to build something real?</h2>
          <p className="mx-auto mt-3 max-w-xl text-mute">
            Launch your own project brief or jump into one that&apos;s already shipping. Every build is portfolio-ready.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button to="/community/submit" magnetic={false}>
              Launch your lab <ArrowIcon />
            </Button>
            <Button to="/community" variant="outline" magnetic={false}>
              Explore the community
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

