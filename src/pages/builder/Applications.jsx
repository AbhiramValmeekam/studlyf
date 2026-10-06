import { Link, useSearchParams } from 'react-router-dom'
import { useBuilderApplications } from '../../lib/queries'
import { PageHeader } from '../../components/layout/PageHeader'
import { StatusBadge } from '../../components/ui/status'
import { Button } from '../../components/ui/Button'
import { Chip, Skeleton, EmptyState, ErrorState, Tag } from '../../components/ui/atoms'
import { Pagination } from '../../components/ui/Pagination'
import { RevealGroup, RevealItem, trackSpotlight } from '../../components/ui/Reveal'
import { titleCase, formatDate } from '../../lib/format'

const STATUSES = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'SELECTED', 'REJECTED', 'WITHDRAWN']

export default function BuilderApplications() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || ''
  const page = Number(params.get('page')) || 1

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }

  const { data, isLoading, isError, refetch } = useBuilderApplications({
    status: status || undefined,
    page,
    pageSize: 12,
  })
  const items = data?.items || []
  const meta = data?.meta

  return (
    <>
      <PageHeader eyebrow="Builder" title="My applications" subtitle="Track every opportunity you’ve applied to.">
        <Button to="/opportunities" size="sm" variant="outline" magnetic={false}>
          Find more opportunities
        </Button>
      </PageHeader>

      <div className="wrap py-10">
        <div className="mb-8 flex flex-wrap gap-2 border-b border-line/10 pb-8">
          <Chip active={!status} onClick={() => setParam('status', '')}>
            All
          </Chip>
          {STATUSES.map((s) => (
            <Chip key={s} active={status === s} onClick={() => setParam('status', s)}>
              {titleCase(s)}
            </Chip>
          ))}
        </div>

        {isError ? (
          <ErrorState onRetry={refetch} />
        ) : isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No applications yet"
            hint="Browse opportunities and apply — they’ll show up here so you can track their status."
          />
        ) : (
          <>
            <RevealGroup as="ul" className="space-y-4">
              {items.map((app) => (
                <RevealItem as="li" key={app.id}>
                  <Link
                    to={`/builders/applications/${app.id}`}
                    onMouseMove={trackSpotlight}
                    className="spotlight-card card-surface flex flex-col gap-4 p-5 transition-transform duration-300 hover:-translate-y-1 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {app.opportunity?.type && <Tag>{titleCase(app.opportunity.type)}</Tag>}
                        <StatusBadge status={app.status} />
                      </div>
                      <h3 className="mt-2 truncate text-lg font-semibold text-bone">
                        {app.opportunity?.title || 'Opportunity'}
                      </h3>
                      <p className="text-sm text-mute">{app.opportunity?.organizationName}</p>
                    </div>
                    <div className="shrink-0 text-sm text-mute sm:text-right">
                      {app.submittedAt ? (
                        <p>Submitted {formatDate(app.submittedAt)}</p>
                      ) : (
                        <p>Started {formatDate(app.createdAt)}</p>
                      )}
                    </div>
                  </Link>
                </RevealItem>
              ))}
            </RevealGroup>
            <Pagination
              page={page}
              totalPages={meta?.totalPages || 1}
              onChange={(p) => setParam('page', String(p))}
            />
          </>
        )}
      </div>
    </>
  )
}
