import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useOtt, useMyOttShelf } from '../lib/queries'
import { titleCase } from '../lib/format'
import { Badge, Chip } from '../components/ui/atoms'
import { Select } from '../components/ui/Field'
import { SearchField } from '../components/ui/SearchField'
import { Pagination } from '../components/ui/Pagination'
import { RevealGroup, RevealItem, trackSpotlight } from '../components/ui/Reveal'
import { ExploreHero, Toolbar, GridState, GridSkeletons } from '../components/explore/parts'

const KINDS = [
  { key: '', label: 'All' },
  { key: 'VIDEO', label: 'Videos' },
  { key: 'ARTICLE', label: 'Articles' },
  { key: 'SERIES', label: 'Series' },
  { key: 'COURSE', label: 'Courses' },
]

const KIND_TONE = { VIDEO: 'open', ARTICLE: 'violet', SERIES: 'soon', COURSE: 'neutral' }

const spec = (t) => {
  if (t.kind === 'SERIES' || t.kind === 'COURSE') return `${t.episodeCount} episode${t.episodeCount === 1 ? '' : 's'}`
  return t.durationMinutes ? `${t.durationMinutes} min` : null
}

/** The same card in two modes: a catalog entry, and "where you left off". */
function TitleCard({ item, resume }) {
  const line = spec(item)
  return (
    <RevealItem as="article" onMouseMove={trackSpotlight}>
      <Link
        to={`/ott/${item.slug}${resume && item.episodeKey ? `?episode=${item.episodeKey}` : ''}`}
        className="spotlight-card card-surface group flex h-full flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1"
      >
        {item.thumbnail?.url && (
          <div className="aspect-[16/9] overflow-hidden">
            <img src={item.thumbnail.url} alt={item.thumbnail.alt || ''} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
          </div>
        )}
        <div className="flex flex-grow flex-col p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={KIND_TONE[item.kind] || 'neutral'}>{titleCase(item.kind)}</Badge>
            {line && <span className="text-xs text-mute">{line}</span>}
            {item.featured && !resume && <Badge tone="soon">Featured</Badge>}
          </div>
          <h3 className="mt-4 text-lg font-semibold leading-tight text-bone transition-colors group-hover:text-acid">
            {item.title}
          </h3>
          {item.byline && <span className="mt-1 text-xs text-mute">{item.byline}</span>}
          <p className="mt-2 line-clamp-3 flex-grow text-sm text-mute">{item.summary}</p>

          {resume && (
            <div className="mt-4">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-line/10">
                <div className="h-full rounded-full bg-acid" style={{ width: `${item.percent}%` }} />
              </div>
              <p className="mt-2 text-xs text-mute">
                {item.completed
                  ? `Finished${item.episodeCount ? ` · all ${item.episodeCount} episodes` : ''}`
                  : item.episodeTitle
                    ? `Up next · ${item.episodeTitle}`
                    : `${item.percent}% watched`}
              </p>
            </div>
          )}

          <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-acid">
            {resume ? (item.completed ? 'Watch again' : 'Continue') : 'Open'}
            <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </span>
        </div>
      </Link>
    </RevealItem>
  )
}

function Shelf({ title, items }) {
  if (!items.length) return null
  return (
    <div className="mb-6">
      <h2 className="mb-4 text-lg font-semibold tracking-tight text-bone">{title}</h2>
      <RevealGroup className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((t) => (
          <TitleCard key={t.id} item={t} resume />
        ))}
      </RevealGroup>
    </div>
  )
}

/**
 * /ott — the STUD OTT shelf. The catalog is public content; the "continue watching" rail on top
 * is the signed-in viewer's own, kept on the server so a place in a series follows the account
 * rather than the browser.
 */
export default function Ott() {
  const [params, setParams] = useSearchParams()
  const { isAuthed } = useAuth()
  const q = params.get('q') || ''
  const kind = params.get('kind') || ''
  const sort = params.get('sort') || (q ? 'relevance' : 'newest')
  const page = Number(params.get('page')) || 1

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }

  const { data, isLoading, isError, refetch } = useOtt({ q: q || undefined, kind: kind || undefined, sort, page, pageSize: 12 })
  const shelf = useMyOttShelf(isAuthed)

  const items = data?.items || []
  const meta = data?.meta
  const total = meta?.total ?? items.length
  const watching = shelf.data?.continueWatching ?? []
  const finished = shelf.data?.completed ?? []

  return (
    <>
      <ExploreHero
        eyebrow="STUD OTT"
        title="Watch, read, finish."
        lead="Talks, essays, series and short courses — one shelf, and your place in it saved to your account."
      >
        <SearchField value={q} onSearch={(v) => setParam('q', v)} placeholder="Search talks, series and courses…" />
      </ExploreHero>

      <div className="wrap py-10">
        <Toolbar>
          <div className="flex flex-wrap items-center gap-2.5">
            {KINDS.map((k) => (
              <Chip key={k.key || 'all'} active={kind === k.key} onClick={() => setParam('kind', k.key)}>
                {k.label}
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
            emptyTitle="Nothing on the shelf yet."
            emptyHint="Try a different kind or search term."
          >
            <Shelf title="Continue watching" items={watching} />
            <Shelf title="Finished" items={finished} />
            <p className="mb-8 text-sm text-mute">
              {total} title{total === 1 ? '' : 's'}
            </p>
            <RevealGroup className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((t) => (
                <TitleCard key={t.id} item={t} />
              ))}
            </RevealGroup>
            <Pagination page={page} totalPages={meta?.totalPages || 1} onChange={(p) => setParam('page', String(p))} />
          </GridState>
        </div>
      </div>
    </>
  )
}
