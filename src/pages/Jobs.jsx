import { useSearchParams } from 'react-router-dom'
import { useJobs } from '../lib/queries'
import { PageHeader } from '../components/layout/PageHeader'
import { JobCard } from '../components/ui/cards'
import { Chip, Skeleton, EmptyState, ErrorState } from '../components/ui/atoms'
import { Select } from '../components/ui/Field'
import { SearchField } from '../components/ui/SearchField'
import { Pagination } from '../components/ui/Pagination'
import { EMPLOYMENT_TYPES, EXPERIENCE_LEVELS, WORK_MODES } from '../lib/enums'

/**
 * The public job board (spec §73) — the same browse grammar as Opportunities, with the facets a
 * job actually has: employment type, work mode and seniority.
 */
export default function Jobs() {
  const [params, setParams] = useSearchParams()

  const q = params.get('q') || ''
  const type = params.get('type') || ''
  const mode = params.get('mode') || ''
  const level = params.get('level') || ''
  const sort = params.get('sort') || (q ? 'relevance' : 'newest')
  const page = Number(params.get('page')) || 1

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page') // reset paging when filters change
    setParams(next, { replace: true })
  }

  const { data, isLoading, isError, refetch, isPlaceholderData } = useJobs({
    q: q || undefined,
    employmentType: type || undefined,
    workMode: mode || undefined,
    experienceLevel: level || undefined,
    sort,
    page,
    pageSize: 12,
  })

  const items = data?.items || []
  const meta = data?.meta

  return (
    <>
      <PageHeader
        eyebrow="Hiring now"
        title="Jobs"
        subtitle="Openings posted by verified employers — with the salary, the process and the people behind them on the page."
      >
        <SearchField
          value={q}
          onSearch={(val) => setParam('q', val)}
          placeholder="Search by title, company, skill or location…"
        />
      </PageHeader>

      <div className="wrap py-10">
        {/* Filters */}
        <div className="flex flex-col gap-5 border-b border-line/10 pb-8">
          <FilterRow label="Type" active={type} options={EMPLOYMENT_TYPES} onPick={(v) => setParam('type', v)} />
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <FilterRow label="Mode" active={mode} options={WORK_MODES} onPick={(v) => setParam('mode', v)} inline />
            <FilterRow label="Level" active={level} options={EXPERIENCE_LEVELS} onPick={(v) => setParam('level', v)} inline />
            <div className="ml-auto flex items-center gap-3">
              <span className="text-sm text-mute">Sort</span>
              <Select value={sort} onChange={(e) => setParam('sort', e.target.value)} className="!h-10 !w-auto !py-0">
                {q && <option value="relevance">Relevance</option>}
                <option value="newest">Newest</option>
                <option value="deadline">Closing soon</option>
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
            <EmptyState title="No open roles match — yet." hint="Try clearing a filter or searching a broader term." />
          ) : (
            <>
              <p className="mb-8 text-sm text-mute">
                {meta?.total ?? items.length} role{(meta?.total ?? items.length) === 1 ? '' : 's'}
              </p>
              <div className={isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                <Grid>
                  {items.map((job, i) => (
                    <JobCard key={job.id} job={job} index={i} />
                  ))}
                </Grid>
              </div>
              <Pagination page={page} totalPages={meta?.totalPages || 1} onChange={(p) => setParam('page', String(p))} />
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
