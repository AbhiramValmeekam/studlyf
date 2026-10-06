import { useSearchParams, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import {
  useCommunityProjects,
  useCommunityTags,
  useCommunityCategories,
  useCommunityLeaderboard,
} from '../lib/queries'
import { PageHeader } from '../components/layout/PageHeader'
import { ProjectCard, categoryLabel, CATEGORY_LABELS } from '../components/ui/cards'
import { Chip, Tag, Avatar, Skeleton, EmptyState, ErrorState } from '../components/ui/atoms'
import { Button, ArrowIcon } from '../components/ui/Button'
import { SearchField } from '../components/ui/SearchField'
import { Pagination } from '../components/ui/Pagination'

const TABS = [
  { key: 'TRENDING', label: 'Trending' },
  { key: 'NEW', label: 'New' },
  { key: 'TOP', label: 'Top' },
]
const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS)

export default function Community() {
  const [params, setParams] = useSearchParams()
  const qc = useQueryClient()
  const { isBuilder } = useAuth()

  const sort = params.get('sort') || 'TRENDING'
  const category = params.get('category') || ''
  const tag = params.get('tag') || ''
  const q = params.get('q') || ''
  const page = Number(params.get('page')) || 1

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }

  const { data, isLoading, isError, refetch, isPlaceholderData } = useCommunityProjects({
    sort,
    category: category || undefined,
    tag: tag || undefined,
    q: q || undefined,
    page,
    pageSize: 12,
  })

  const items = data?.items || []
  const meta = data?.meta

  // Optimistic upvote toggle across every cached feed page + the leaderboard.
  const upvote = async (project) => {
    try {
      const { data: result } = await api.upvoteProject(project.id)
      qc.setQueriesData({ queryKey: ['community-projects'] }, (old) => {
        if (!old?.items) return old
        return {
          ...old,
          items: old.items.map((p) =>
            p.id === project.id ? { ...p, upvoted: result.upvoted, upvoteCount: result.upvoteCount } : p,
          ),
        }
      })
      qc.invalidateQueries({ queryKey: ['community-leaderboard'] })
      qc.invalidateQueries({ queryKey: ['community-project', project.slug] })
    } catch {
      qc.invalidateQueries({ queryKey: ['community-projects'] })
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Community"
        title="Project showcase"
        subtitle="What STUDLYF builders are shipping — discover projects, back the ones you love, and submit your own."
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchField
            value={q}
            onSearch={(val) => setParam('q', val)}
            placeholder="Search projects by title, tag or tech…"
          />
          {isBuilder && (
            <Button to="/community/submit" magnetic={false} className="shrink-0">
              Submit project <ArrowIcon />
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="wrap grid gap-12 py-10 lg:grid-cols-[1fr_300px]">
        <div>
          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-line/10">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setParam('sort', t.key === 'TRENDING' ? '' : t.key)}
                className={`relative -mb-px px-4 py-3 text-sm font-medium transition-colors ${
                  sort === t.key ? 'text-bone' : 'text-mute hover:text-bone'
                }`}
              >
                {t.label}
                {sort === t.key && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-acid" />}
              </button>
            ))}
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-2 py-6">
            <Chip active={!category} onClick={() => setParam('category', '')}>
              All
            </Chip>
            {CATEGORY_KEYS.map((c) => (
              <Chip key={c} active={category === c} onClick={() => setParam('category', c)}>
                {categoryLabel(c)}
              </Chip>
            ))}
          </div>

          {/* Active tag filter */}
          {tag && (
            <div className="mb-6 flex items-center gap-3 text-sm text-mute">
              <span>
                Filtered by tag <span className="text-bone">#{tag}</span>
              </span>
              <button onClick={() => setParam('tag', '')} className="text-acid hover:underline">
                Clear
              </button>
            </div>
          )}

          {/* Results */}
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
              title="No projects here yet."
              hint="Try a different tab, clear filters, or be the first to submit something."
            />
          ) : (
            <>
              <p className="mb-6 text-sm text-mute">
                {meta?.total ?? items.length} project{(meta?.total ?? items.length) === 1 ? '' : 's'}
              </p>
              <div className={isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                <Grid>
                  {items.map((p, i) => (
                    <ProjectCard key={p.id} project={p} index={i} onUpvote={upvote} />
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

        <Sidebar activeTag={tag} activeCategory={category} onTag={(t) => setParam('tag', t)} onCategory={(c) => setParam('category', c)} />
      </div>
    </>
  )
}

function Grid({ children }) {
  return <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2">{children}</div>
}

function SidebarCard({ title, children }) {
  return (
    <div className="card-surface p-6">
      <p className="eyebrow mb-4">{title}</p>
      {children}
    </div>
  )
}

function Sidebar({ activeTag, activeCategory, onTag, onCategory }) {
  const { data: tags } = useCommunityTags()
  const { data: categories } = useCommunityCategories()
  const { data: leaders } = useCommunityLeaderboard()

  return (
    <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
      <SidebarCard title="Top builders">
        {leaders?.length ? (
          <ol className="space-y-3">
            {leaders.slice(0, 5).map((l) => (
              <li key={l.username}>
                <Link to={`/builders/${l.username}`} className="flex items-center gap-3 hover:text-bone">
                  <span className="w-4 shrink-0 font-mono text-sm text-mute">{l.rank}</span>
                  <Avatar src={l.photo?.url} name={l.username} size={30} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-bone">@{l.username}</span>
                    <span className="block text-xs text-mute">
                      {l.upvotes} upvote{l.upvotes === 1 ? '' : 's'} · {l.projects} project{l.projects === 1 ? '' : 's'}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-mute/70">No builders ranked yet.</p>
        )}
      </SidebarCard>

      <SidebarCard title="Popular tags">
        {tags?.length ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <button key={t.tag} onClick={() => onTag(activeTag === t.tag ? '' : t.tag)}>
                <Tag className={activeTag === t.tag ? '!bg-acid/20 !text-acid' : ''}>
                  #{t.tag} <span className="ml-1 opacity-60">{t.count}</span>
                </Tag>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-mute/70">No tags yet.</p>
        )}
      </SidebarCard>

      <SidebarCard title="Categories">
        {categories?.length ? (
          <ul className="space-y-1">
            {categories.map((c) => (
              <li key={c.category}>
                <button
                  onClick={() => onCategory(activeCategory === c.category ? '' : c.category)}
                  className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-line/[0.05] ${
                    activeCategory === c.category ? 'text-acid' : 'text-mute'
                  }`}
                >
                  <span>{categoryLabel(c.category)}</span>
                  <span className="font-mono text-xs">{c.count}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-mute/70">No categories yet.</p>
        )}
      </SidebarCard>
    </aside>
  )
}
