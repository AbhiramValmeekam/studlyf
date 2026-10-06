import { useSearchParams } from 'react-router-dom'
import { useSearch } from '../lib/queries'
import { PageHeader } from '../components/layout/PageHeader'
import { OpportunityCard, ResourceCard } from '../components/ui/cards'
import { BuilderCard, FounderCard, OrganizationCard, ProjectResultCard } from '../components/ui/entity-cards'
import { SearchField } from '../components/ui/SearchField'
import { Chip, Skeleton, EmptyState, ErrorState } from '../components/ui/atoms'

// Every scope the API answers (§56). `all` queries them together; picking one narrows the same
// query to a single group, so a chip is a filter over one endpoint, not a separate call.
const SCOPES = [
  { key: 'all', label: 'Everything' },
  { key: 'opportunities', label: 'Opportunities' },
  { key: 'resources', label: 'Resources' },
  { key: 'builders', label: 'Builders' },
  { key: 'founders', label: 'Founders & startups' },
  { key: 'organizations', label: 'Organizations' },
  { key: 'projects', label: 'Projects' },
]

// One renderer per group, so the same result looks identical whichever scope returned it.
const GROUPS = [
  { key: 'opportunities', title: 'Opportunities', render: (o, i) => <OpportunityCard key={o.id} opp={o} index={i} /> },
  { key: 'resources', title: 'Resources', render: (r, i) => <ResourceCard key={r.id} resource={r} index={i} /> },
  {
    key: 'builders',
    title: 'Builders',
    render: (b, i) => <BuilderCard key={b.id} item={b} href={`/builders/${b.username}`} entityId={b.id} index={i} />,
  },
  {
    key: 'founders',
    title: 'Founders & startups',
    render: (f, i) => <FounderCard key={f.id} item={f} href={`/founders/${f.slug}`} entityId={f.id} index={i} />,
  },
  {
    key: 'organizations',
    title: 'Organizations',
    render: (o, i) => <OrganizationCard key={o.id} item={o} href={`/organizations/${o.slug}`} entityId={o.id} index={i} />,
  },
  { key: 'projects', title: 'Projects', render: (p, i) => <ProjectResultCard key={p.id} item={p} entityId={p.id} index={i} /> },
]

export default function Search() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const scope = params.get('scope') || 'all'

  const setParam = (key, val) => {
    const next = new URLSearchParams(params)
    if (val && !(key === 'scope' && val === 'all')) next.set(key, val)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const { data, isLoading, isError, refetch } = useSearch({ q, scope, pageSize: 12 })
  const groups = GROUPS.filter((g) => scope === 'all' || g.key === scope)
  const shown = groups
    .map((g) => ({ ...g, group: data?.data?.[g.key] }))
    .filter((g) => g.group?.items?.length)
  const hasResults = shown.length > 0

  return (
    <>
      <PageHeader eyebrow="Find anything" title="Search">
        <SearchField value={q} onSearch={(v) => setParam('q', v)} placeholder="Builders, startups, projects, opportunities…" autoFocus />
      </PageHeader>

      <div className="wrap py-12">
        <div className="mb-12 flex flex-wrap gap-2">
          {SCOPES.map((s) => (
            <Chip key={s.key} active={scope === s.key} onClick={() => setParam('scope', s.key)}>
              {s.label}
              {scope === 'all' && s.key !== 'all' && data?.data?.[s.key]?.total > 0 && (
                <span className="text-xs opacity-60">{data.data[s.key].total}</span>
              )}
            </Chip>
          ))}
        </div>

        {!q ? (
          <EmptyState title="Start typing." hint="Search every builder, startup, organization, project, opportunity and resource on STUDLYF — at once." />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : isLoading ? (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] w-full" />
            ))}
          </div>
        ) : !hasResults ? (
          <EmptyState title={`No matches for “${q}”.`} hint="Try a broader or differently-spelled term, or widen the scope above." />
        ) : (
          <div className="space-y-20">
            {shown.map(({ key, title, render, group }) => (
              <section key={key}>
                <div className="mb-8 flex items-baseline justify-between border-b border-line/10 pb-4">
                  <h2 className="display-face text-2xl tracking-tight">{title}</h2>
                  {scope === 'all' && group.total > group.items.length ? (
                    <button type="button" onClick={() => setParam('scope', key)} className="text-sm text-mute transition-colors hover:text-acid">
                      All {group.total} →
                    </button>
                  ) : (
                    <span className="text-sm text-mute">{group.total} found</span>
                  )}
                </div>
                <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((item, i) => render(item, i))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
