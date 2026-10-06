import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useSavedIds } from '../../lib/queries'
import { api } from '../../lib/api'

const BookmarkIcon = ({ filled }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
    <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" strokeLinejoin="round" />
  </svg>
)

/**
 * The one bookmark control (spec §57). It asks `saved_items` whether this entity is already
 * saved rather than trusting a prop, so the same button is correct on search, on a listing and
 * on its own saved page — and flipping it anywhere refreshes the `['saved']` queries everywhere.
 */
export function SaveButton({ entityType, entityId, hideLabel = false, className = '' }) {
  const { isAuthed } = useAuth()
  const qc = useQueryClient()
  const { data: ids } = useSavedIds(isAuthed)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  if (!isAuthed || !entityId) return null

  const saved = !!ids?.has(`${entityType}:${entityId}`)

  const toggle = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      if (saved) await api.unsaveItem(entityType, entityId)
      else await api.saveItem({ entityType, entityId })
      await qc.invalidateQueries({ queryKey: ['saved'] })
    } catch (err) {
      setError(err?.message || 'Could not save that.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      title={error || (saved ? 'Remove from saved' : 'Save for later')}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium tracking-tight transition-colors duration-200 disabled:opacity-50 ${
        saved
          ? 'border-transparent bg-acid/15 text-acid'
          : 'border-line/20 text-mute hover:border-line/40 hover:text-bone'
      } ${className}`}
    >
      <BookmarkIcon filled={saved} />
      {!hideLabel && (saved ? 'Saved' : 'Save')}
    </button>
  )
}
