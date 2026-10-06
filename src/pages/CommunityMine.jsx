import { Link } from 'react-router-dom'
import { useMyProjects } from '../lib/queries'
import { PageHeader } from '../components/layout/PageHeader'
import { Button, ArrowIcon } from '../components/ui/Button'
import { Badge, Tag, Skeleton, EmptyState, ErrorState } from '../components/ui/atoms'
import { categoryLabel } from '../components/ui/cards'
import { formatDate } from '../lib/format'

const STATUS_TONE = { PUBLISHED: 'open', DRAFT: 'neutral', ARCHIVED: 'closed' }

export default function CommunityMine() {
  const { data: projects, isLoading, isError, refetch } = useMyProjects()

  return (
    <>
      <PageHeader
        eyebrow="Community"
        title="My projects"
        subtitle="Everything you’ve submitted to the showcase."
      >
        <Button to="/community/submit" magnetic={false}>
          Submit project <ArrowIcon />
        </Button>
      </PageHeader>

      <div className="wrap py-12">
        {isError ? (
          <ErrorState onRetry={refetch} />
        ) : isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : !projects?.length ? (
          <EmptyState title="No projects yet." hint="Submit your first project to appear in the community showcase." />
        ) : (
          <div className="space-y-4">
            {projects.map((p) => (
              <div key={p.id} className="card-surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <Badge tone={STATUS_TONE[p.status] || 'neutral'}>{p.status}</Badge>
                    <Badge tone="violet">{categoryLabel(p.category)}</Badge>
                    {p.featured && <Badge tone="open">Featured</Badge>}
                  </div>
                  <Link to={`/community/${p.slug}`} className="text-lg font-semibold tracking-tight text-bone hover:text-acid">
                    {p.title}
                  </Link>
                  {p.tagline && <p className="mt-1 line-clamp-1 text-sm text-mute">{p.tagline}</p>}
                  <p className="mt-2 text-xs text-mute">
                    {p.upvoteCount} upvote{p.upvoteCount === 1 ? '' : 's'} · updated {formatDate(p.updatedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {p.tags?.slice(0, 3).map((t) => (
                    <Tag key={t}>#{t}</Tag>
                  ))}
                  <Button to={`/community/${p.slug}/edit`} variant="outline" size="sm" magnetic={false}>
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
