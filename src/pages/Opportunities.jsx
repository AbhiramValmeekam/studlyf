import { useSearchParams, Link } from 'react-router-dom'
import { useOpportunities, useCategories } from '../lib/queries'
import { PageHeader } from '../components/layout/PageHeader'
import { OpportunityCard } from '../components/ui/cards'
import { Chip, Skeleton, EmptyState, ErrorState } from '../components/ui/atoms'
import { Select } from '../components/ui/Field'
import { SearchField } from '../components/ui/SearchField'
import { Pagination } from '../components/ui/Pagination'

const TYPES = ['HACKATHON', 'COMPETITION', 'INTERNSHIP', 'CHALLENGE', 'FELLOWSHIP']
const MODES = ['ONLINE', 'OFFLINE', 'HYBRID']
const STATUSES = ['open', 'upcoming', 'closed']

export default function Opportunities() {
  const [params, setParams] = useSearchParams()

  const q = params.get('q') || ''
  const type = params.get('type') || ''
  const mode = params.get('mode') || ''
  const status = params.get('status') || ''
  const sort = params.get('sort') || (q ? 'relevance' : 'deadline')
  const page = Number(params.get('page')) || 1

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page') // reset paging when filters change
    setParams(next, { replace: true })
  }

  const { data, isLoading, isError, refetch, isPlaceholderData } = useOpportunities({
    q: q || undefined,
    type: type || undefined,
    mode: mode || undefined,
    status: status || undefined,
    sort,
    page,
    pageSize: 12,
  })

  const items = data?.items || []
  const meta = data?.meta

  return (
    <>
      <PageHeader
        eyebrow="Now open"
        title="Opportunities"
        subtitle="Hackathons, competitions, internships, challenges and fellowships — filtered to what matters to you."
      >
        <SearchField
          value={q}
          onSearch={(val) => setParam('q', val)}
          placeholder="Search by title, org, skill or location…"
        />
      </PageHeader>

      <div className="wrap py-10">
        <p className="mb-8 text-sm text-mute">
          Looking for a full-time role?{' '}
          <Link to="/jobs" className="text-bone underline decoration-line/40 underline-offset-4 hover:text-acid">
            Browse the job board
          </Link>
          .
        </p>
        {/* Filters */}
        <div className="flex flex-col gap-5 border-b border-line/10 pb-8">
          <FilterRow label="Type" active={type} options={TYPES} onPick={(v) => setParam('type', v)} />
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <FilterRow label="Mode" active={mode} options={MODES} onPick={(v) => setParam('mode', v)} inline />
            <FilterRow
              label="Status"
              active={status}
              options={STATUSES}
              onPick={(v) => setParam('status', v)}
              inline
            />
            <div className="ml-auto flex items-center gap-3">
              <span className="text-sm text-mute">Sort</span>
              <Select
                value={sort}
                onChange={(e) => setParam('sort', e.target.value)}
                className="!h-10 !w-auto !py-0"
              >
                {q && <option value="relevance">Relevance</option>}
                <option value="deadline">Deadline</option>
                <option value="newest">Newest</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="pt-10">
          {isError ? (
            <ErrorState onRetry={refetch} />
          ) : isLoading ? (
            <Grid>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/5] w-full" />
              ))}
            </Grid>
          ) : items.length === 0 ? (
            <EmptyState
              title="Nothing matches — yet."
              hint="Try clearing a filter or searching a broader term."
            />
          ) : (
            <>
              <p className="mb-8 text-sm text-mute">
                {meta?.total ?? items.length} result{(meta?.total ?? items.length) === 1 ? '' : 's'}
              </p>
              <div className={isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                <Grid>
                  {items.map((opp, i) => (
                    <OpportunityCard key={opp.id} opp={opp} index={i} />
                  ))}
                </Grid>
              </div>
              <Pagination
                page={page}
                totalPages={meta?.totalPages || 1}
                onChange={(p) => setParam('page', String(p))}
              />
            </>
          )}
        </div>
      </div>
    </>
  )
}

function Grid({ children }) {
  return <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
}

function FilterRow({ label, active, options, onPick, inline }) {
  return (
    <div className={inline ? 'flex items-center gap-3' : 'flex flex-wrap items-center gap-2.5'}>
      <span className="mr-1 text-sm text-mute">{label}</span>
      <div className="flex flex-wrap gap-2">
        <Chip active={!active} onClick={() => onPick('')}>
          All
        </Chip>
        {options.map((o) => (
          <Chip key={o} active={active === o} onClick={() => onPick(o)}>
            {o.charAt(0) + o.slice(1).toLowerCase()}
          </Chip>
        ))}
      </div>
    </div>
  )
}
