import { useSearchParams } from 'react-router-dom'
import { useResources } from '../lib/queries'
import { PageHeader } from '../components/layout/PageHeader'
import { ResourceCard } from '../components/ui/cards'
import { Chip, Skeleton, EmptyState, ErrorState } from '../components/ui/atoms'
import { Select } from '../components/ui/Field'
import { SearchField } from '../components/ui/SearchField'
import { Pagination } from '../components/ui/Pagination'

const TYPES = ['ARTICLE', 'VIDEO', 'GUIDE', 'ANNOUNCEMENT']

export default function Resources() {
  const [params, setParams] = useSearchParams()
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

  const { data, isLoading, isError, refetch, isPlaceholderData } = useResources({
    q: q || undefined,
    type: type || undefined,
    sort,
    page,
    pageSize: 12,
  })

  const items = data?.items || []
  const meta = data?.meta

  return (
    <>
      <PageHeader
        eyebrow="Learn"
        title="Resources"
        subtitle="Guides, articles and videos to help you build sharper and win more."
      >
        <SearchField value={q} onSearch={(v) => setParam('q', v)} placeholder="Search resources…" />
      </PageHeader>

      <div className="wrap py-10">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4 border-b border-line/10 pb-8">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="mr-1 text-sm text-mute">Type</span>
            <Chip active={!type} onClick={() => setParam('type', '')}>
              All
            </Chip>
            {TYPES.map((t) => (
              <Chip key={t} active={type === t} onClick={() => setParam('type', t)}>
                {t.charAt(0) + t.slice(1).toLowerCase()}
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
        </div>

        <div className="pt-10">
          {isError ? (
            <ErrorState onRetry={refetch} />
          ) : isLoading ? (
            <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/5] w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState title="No resources found." hint="Try a different type or search term." />
          ) : (
            <>
              <p className="mb-8 text-sm text-mute">
                {meta?.total ?? items.length} result{(meta?.total ?? items.length) === 1 ? '' : 's'}
              </p>
              <div
                className={`grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 ${
                  isPlaceholderData ? 'opacity-60' : ''
                }`}
              >
                {items.map((r, i) => (
                  <ResourceCard key={r.id} resource={r} index={i} />
                ))}
              </div>
              <Pagination page={page} totalPages={meta?.totalPages || 1} onChange={(p) => setParam('page', String(p))} />
            </>
          )}
        </div>
      </div>
    </>
  )
}
