import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { timeAgo } from '../../lib/format'
import { notifMeta, notifTarget } from '../../lib/notifications'
import { EASE } from '../../lib/motion'

// YouTube-style notification tab: the bell carries an unread count and opens an
// inline dropdown of recent notifications rather than navigating away. Unread rows
// are tinted; clicking one marks it read (optimistically) and routes to its target.
// The list + count are fed from Nav's polling useNotifications query, so the badge
// stays live; mark-read writes flow back through the same ['notifications'] cache.

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}

export function NotificationBell({ items = [], unread = 0 }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const reduce = useReducedMotion()

  // Close on route change, Escape, or a click outside the bell + panel.
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  // Optimistically flip a row (or all rows) to read across every cached
  // ['notifications', params] query, then persist and refetch.
  const patch = (fn) => qc.setQueriesData({ queryKey: ['notifications'] }, (prev) => (prev ? fn(prev) : prev))
  const dropUnread = (by) => (m) => ({ ...m, unreadCount: Math.max(0, (m?.unreadCount || 0) - by) })

  const markRead = (n) => {
    if (n.read) return
    patch((prev) => ({
      ...prev,
      items: prev.items.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
      meta: dropUnread(1)(prev.meta),
    }))
    api.readNotification(n.id).catch(() => {}).finally(() => qc.invalidateQueries({ queryKey: ['notifications'] }))
  }

  const openNotification = (n) => {
    markRead(n)
    setOpen(false)
    navigate(notifTarget(n))
  }

  const markAllRead = () => {
    if (unread === 0) return
    patch((prev) => ({ ...prev, items: prev.items.map((x) => ({ ...x, read: true })), meta: { ...prev.meta, unreadCount: 0 } }))
    api.readAllNotifications().catch(() => {}).finally(() => qc.invalidateQueries({ queryKey: ['notifications'] }))
  }

  const badge = unread > 9 ? '9+' : unread

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-haspopup="true"
        aria-expanded={open}
        className={`relative rounded-full p-2 transition-colors hover:bg-line/[0.06] hover:text-bone ${open ? 'bg-line/[0.06] text-bone' : 'text-mute'}`}
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-flare px-1 text-[10px] font-bold leading-none text-white ring-2 ring-ink">
            {badge}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: EASE }}
            style={{ transformOrigin: 'top right' }}
            role="menu"
            className="absolute right-0 top-[calc(100%+0.6rem)] z-50 w-[380px] overflow-hidden rounded-2xl border border-line/10 bg-ink2/95 shadow-2xl shadow-black/40 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-line/8 px-4 py-3">
              <span className="text-sm font-semibold text-bone">Notifications</span>
              <button
                onClick={markAllRead}
                disabled={unread === 0}
                className="text-xs text-mute transition-colors hover:text-acid disabled:cursor-default disabled:opacity-40 disabled:hover:text-mute"
              >
                Mark all read
              </button>
            </div>

            <div className="max-h-[min(70svh,26rem)] overflow-y-auto" data-lenis-prevent>
              {items.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <p className="text-sm text-mute">You’re all caught up.</p>
                  <p className="mt-1 text-xs text-mute/70">New activity will show up here.</p>
                </div>
              ) : (
                items.map((n) => <NotifRow key={n.id} n={n} onOpen={openNotification} />)
              )}
            </div>

            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="block border-t border-line/8 px-4 py-3 text-center text-xs font-semibold text-acid transition-colors hover:bg-line/[0.06]"
            >
              See all notifications
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// One row in the dropdown. Unread rows get a faint accent wash and a filled dot;
// the whole row is a button so keyboard + pointer both mark-read and navigate.
function NotifRow({ n, onOpen }) {
  const meta = notifMeta(n.type)
  return (
    <button
      onClick={() => onOpen(n)}
      role="menuitem"
      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-line/[0.06] ${n.read ? '' : 'bg-acid/[0.05]'}`}
    >
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-line/40' : meta.dot}`} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-mute">{meta.tag}</span>
          <span className="text-[11px] text-mute/60">· {timeAgo(n.createdAt)}</span>
        </span>
        <span className={`mt-0.5 block text-sm leading-snug ${n.read ? 'text-mute' : 'font-semibold text-bone'}`}>{n.title}</span>
        {n.body && <span className="mt-0.5 block truncate text-xs text-mute">{n.body}</span>}
      </span>
      {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-flare" aria-hidden />}
    </button>
  )
}
