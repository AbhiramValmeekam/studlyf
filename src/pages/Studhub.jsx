import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useStudhub } from '../lib/queries'
import { titleCase } from '../lib/format'
import { Chip, Tag, Badge } from '../components/ui/atoms'
import { Select } from '../components/ui/Field'
import { SearchField } from '../components/ui/SearchField'
import { Pagination } from '../components/ui/Pagination'
import { BrandIntro } from '../components/ui/BrandIntro'
import { RevealGroup, RevealItem, trackSpotlight } from '../components/ui/Reveal'
import { ExploreHero, Toolbar, GridState, GridSkeletons } from '../components/explore/parts'

const TYPES = [
  { key: '', label: 'All' },
  { key: 'SCHOLARSHIP', label: 'Scholarships' },
  { key: 'DISCOUNT', label: 'Discounts' },
  { key: 'PERK', label: 'Perks' },
]

const TYPE_TONE = { SCHOLARSHIP: 'open', DISCOUNT: 'violet', PERK: 'neutral' }

function BenefitCard({ benefit }) {
  return (
    <RevealItem as="article" onMouseMove={trackSpotlight}>
      <Link
        to={`/studhub/${benefit.slug}`}
        className="spotlight-card card-surface group flex h-full flex-col p-6 transition-transform duration-300 hover:-translate-y-1"
      >
        <div className="flex flex-wrap items-center gap-2">
          {benefit.type && <Badge tone={TYPE_TONE[benefit.type] || 'neutral'}>{titleCase(benefit.type)}</Badge>}
          {benefit.featured && <Badge tone="soon">Featured</Badge>}
          {benefit.offer && (
            <span className="ml-auto rounded-full bg-bone px-3 py-0.5 text-[11px] font-bold text-ink">{benefit.offer}</span>
          )}
        </div>
        {benefit.provider && <span className="mt-4 truncate text-xs text-mute">{benefit.provider}</span>}
        <h3 className="mt-1 text-lg font-semibold leading-tight text-bone transition-colors group-hover:text-acid">
          {benefit.title}
        </h3>
        {benefit.summary && <p className="mt-2 line-clamp-3 flex-grow text-sm text-mute">{benefit.summary}</p>}
        {benefit.tags?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {benefit.tags.slice(0, 4).map((t) => (
              <Tag key={t.slug}>{t.name}</Tag>
            ))}
          </div>
        )}
        <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-acid">
          View details
          <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </span>
      </Link>
    </RevealItem>
  )
}

export default function Studhub() {
  const [params, setParams] = useSearchParams()
  // Cinematic brand intro on every entry to STUDHub — it plays each time the page mounts,
  // and the page renders beneath so there's no blank wait.
  const [intro, setIntro] = useState(true)
  const endIntro = () => setIntro(false)
  const q = params.get('q') || ''
  const type = params.get('type') || ''
  const sort = params.get('sort') || (q ? 'relevance' : 'newest')
  const page = Number(params.get('page')) || 1

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }

  const { data, isLoading, isError, refetch, isPlaceholderData } = useStudhub({
    q: q || undefined,
    type: type || undefined,
    sort,
    page,
    pageSize: 12,
  })

  const items = data?.items || []
  const meta = data?.meta
  const total = meta?.total ?? items.length

  return (
    <>
      <AnimatePresence>
        {intro && <BrandIntro key="studhub-intro" onDone={endIntro} label="STUDHub" />}
      </AnimatePresence>

      <ExploreHero
        eyebrow="STUDHub"
        title="Everything you need. All in one place."
        lead="Your student ecosystem for learning, career growth, discounts, schemes, opportunities and smarter progress — explore, learn, save and grow."
      >
        <SearchField value={q} onSearch={(v) => setParam('q', v)} placeholder="Search scholarships, discounts, perks…" />
      </ExploreHero>

      <div className="wrap py-10">
        <Toolbar>
          <div className="flex flex-wrap items-center gap-2.5">
            {TYPES.map((t) => (
              <Chip key={t.key || 'all'} active={type === t.key} onClick={() => setParam('type', t.key)}>
                {t.label}
              </Chip>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-mute">Sort</span>
            <Select value={sort} onChange={(e) => setParam('sort', e.target.value)} className="!h-10 !w-auto !py-0">
              {q && <option value="relevance">Relevance</option>}
              <option value="newest">Newest</option>
            </Select>
          </div>
        </Toolbar>

        <div className="pt-10">
          <GridState
            isLoading={isLoading}
            isError={isError}
            isEmpty={items.length === 0}
            onRetry={refetch}
            skeleton={<GridSkeletons count={6} />}
            emptyTitle="No benefits found."
            emptyHint="Try a different category or search term."
          >
            <p className="mb-8 text-sm text-mute">
              {total} result{total === 1 ? '' : 's'}
            </p>
            <RevealGroup className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${isPlaceholderData ? 'opacity-60' : ''}`}>
              {items.map((b) => (
                <BenefitCard key={b.id} benefit={b} />
              ))}
            </RevealGroup>
            <Pagination page={page} totalPages={meta?.totalPages || 1} onChange={(p) => setParam('page', String(p))} />
          </GridState>
        </div>
      </div>
    </>
  )
}
