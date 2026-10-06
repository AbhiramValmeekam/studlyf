import { useSearchParams } from 'react-router-dom'
import { useMySaved } from '../lib/queries'
import { PageHeader } from '../components/layout/PageHeader'
import { SavedEntityCard } from '../components/ui/entity-cards'
import { Chip, Skeleton, EmptyState, ErrorState } from '../components/ui/atoms'
import { Pagination } from '../components/ui/Pagination'

// The order the chips read in — the same order the entity types are introduced across the
// platform, so "All" is always first and the list never reorders itself as counts change.
const TYPES = [
  ['OPPORTUNITY', 'Opportunities'],
  ['RESOURCE', 'Resources'],
  ['COURSE', 'Courses'],
  ['STUDHUB', 'STUD Hub'],
  ['OTT', 'STUD OTT'],
  ['MOCK_DRILL', 'Mock drills'],
  ['PROJECT_BRIEF', 'Project briefs'],
  ['ROADMAP', 'Roadmaps'],
  ['PROJECT', 'Projects'],
  ['BUILDER', 'Builders'],
  ['FOUNDER', 'Founders'],
  ['ORGANIZATION', 'Organizations'],
]

export default function Saved() {
  const [params, setParams] = useSearchParams()
  const entityType = params.get('type') || ''
  const page = Number(params.get('page') || 1)

  const setParam = (key, val) => {
    const next = new URLSearchParams(params)
    if (val) next.set(key, val)
    else next.delete(key)
    if (key !== 'page') next.delete('page') // a new filter starts at page one
    setParams(next, { replace: true })
  }

  const { data, isLoading, isError, refetch } = useMySaved({
    ...(entityType ? { entityType } : {}),
    page,
    pageSize: 12,
  })
  const meta = data?.meta
  const counts = meta?.counts ?? {}
  const items = data?.items ?? []

  return (
    <>
      <PageHeader eyebrow="Your library" title="Saved">
        <p className="mt-4 max-w-xl text-mute">
          Everything you bookmarked across STUDLYF — opportunities, resources, courses, projects, builders and startups.
        </p>
      </PageHeader>

      <div className="wrap py-12">
        <div className="mb-12 flex flex-wrap gap-2">
          <Chip active={!entityType} onClick={() => setParam('type', '')}>
            Everything
            {meta?.counts && <span className="text-xs opacity-60">{Object.values(counts).reduce((a, b) => a + b, 0)}</span>}
          </Chip>
          {TYPES.filter(([key]) => counts[key] > 0).map(([key, label]) => (
            <Chip key={key} active={entityType === key} onClick={() => setParam('type', entityType === key ? '' : key)}>
              {label}
              <span className="text-xs opacity-60">{counts[key]}</span>
            </Chip>
          ))}
        </div>

        {isError ? (
          <ErrorState onRetry={refetch} />
        ) : isLoading ? (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] w-full" />
            ))}
          </div>
        ) : !items.length ? (
          <EmptyState
            title={entityType ? 'Nothing saved here yet.' : 'No saved items yet.'}
            hint="Tap Save on any opportunity, resource, project, builder or startup and it will be waiting here."
          />
        ) : (
          <>
            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((row, i) => (
                <SavedEntityCard key={`${row.entityType}:${row.entityId}`} row={row} index={i} />
              ))}
            </div>
            <Pagination page={page} totalPages={meta?.totalPages || 1} onChange={(p) => setParam('page', String(p))} />
          </>
        )}
      </div>
    </>
  )
}
