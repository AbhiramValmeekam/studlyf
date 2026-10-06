import { Link } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useNotifications } from '../lib/queries'
import { PageHeader } from '../components/layout/PageHeader'
import { Badge, Skeleton, EmptyState, ErrorState } from '../components/ui/atoms'
import { titleCase, formatDate } from '../lib/format'

export default function Notifications() {
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page')) || 1

  const { data, isLoading, isError, refetch } = useNotifications({ page, pageSize: 20 })
  const items = data?.items || []
  const meta = data?.meta
  const unread = meta?.unreadCount ?? 0

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['notifications'] })
    qc.invalidateQueries({ queryKey: ['builder-dashboard'] })
  }

  const markRead = async (id) => {
    await api.readNotification(id).catch(() => {})
    invalidate()
  }
  const markAll = async () => {
    await api.readAllNotifications().catch(() => {})
    invalidate()
  }

  const linkFor = (n) => (n.type === 'APPLICATION_STATUS' && n.data?.applicationId ? `/builders/applications/${n.data.applicationId}` : null)

  return (
    <>
      <PageHeader eyebrow="Inbox" title="Notifications">
        {unread > 0 && (
          <button onClick={markAll} className="text-sm text-acid hover:underline">
            Mark all as read
          </button>
        )}
      </PageHeader>

      <div className="wrap py-10">
        {isError ? (
          <ErrorState onRetry={refetch} />
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="Nothing here yet" hint="Updates about your applications and account will show up here." />
        ) : (
          <ul className="mx-auto max-w-2xl space-y-3">
            {items.map((n) => {
              const to = linkFor(n)
              const body = (
                <div className={`card-surface flex items-start gap-4 p-5 ${n.readAt ? 'opacity-70' : ''}`}>
                  {!n.readAt && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-acid" aria-hidden />}
                  <div className={`min-w-0 flex-1 ${n.readAt ? 'pl-0' : ''}`}>
                    <div className="flex items-center gap-2">
                      <Badge tone="neutral">{titleCase(n.type)}</Badge>
                      {n.createdAt && <span className="text-xs text-mute">{formatDate(n.createdAt)}</span>}
                    </div>
                    <p className="mt-2 font-medium text-bone">{n.title || titleCase(n.type)}</p>
                    {n.body && <p className="mt-1 text-sm text-mute">{n.body}</p>}
                  </div>
                  {!n.readAt && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        markRead(n.id)
                      }}
                      className="shrink-0 text-xs text-mute hover:text-bone"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              )
              return (
                <li key={n.id}>
                  {to ? (
                    <Link to={to} onClick={() => !n.readAt && markRead(n.id)} className="block">
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {meta?.totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-3">
            <button
              disabled={page <= 1}
              onClick={() => setParams({ page: String(page - 1) }, { replace: true })}
              className="rounded-full border border-line/20 px-4 py-2 text-sm text-bone disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page >= (meta?.totalPages || 1)}
              onClick={() => setParams({ page: String(page + 1) }, { replace: true })}
              className="rounded-full border border-line/20 px-4 py-2 text-sm text-bone disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </>
  )
}
