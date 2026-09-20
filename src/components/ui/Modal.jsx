import { useEffect } from 'react'
import { Button } from './primitives'

/**
 * Modal — centered dialog for Connect / Invite / Schedule actions. Closes on
 * backdrop click or Esc. Content is provided as children.
 */
export function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[120] grid place-items-center p-5">
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-bone/15 bg-ink2 p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]">
        {title && <h3 className="font-display text-2xl text-bone tracking-crush mb-4">{title}</h3>}
        <div className="text-bone2 text-sm leading-relaxed">{children}</div>
        <div className="mt-7 flex justify-end gap-3">
          {footer || (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
