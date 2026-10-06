import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { ECOSYSTEM_KEYS } from '../../lib/ecosystems'
import { track } from '../../lib/analytics'
import { EASE } from '../../lib/motion'
import { EcosystemSelector } from './EcosystemSelector'

/**
 * "How will you use STUDLYF?" — opened by the global Join STUDLYF button. Picking a path starts
 * that ecosystem's sign-up (/signup?role=…); nothing is created until the form is submitted, and
 * nobody is silently made a Builder.
 */
export function JoinModal({ onClose }) {
  const panel = useRef(null)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    panel.current?.querySelector('a,button')?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="join-title">
      <motion.button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        ref={panel}
        data-lenis-prevent
        className="relative max-h-[92svh] w-full max-w-4xl overflow-y-auto rounded-t-3xl border border-line/12 bg-ink p-6 sm:rounded-3xl sm:p-9"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="eyebrow mb-3">Join STUDLYF</p>
            <h2 id="join-title" className="display-face text-4xl tracking-tight md:text-5xl">How will you use STUDLYF?</h2>
            <p className="mt-3 max-w-lg text-mute">One account works across every ecosystem — you can add another path later.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-line/15 px-3 py-1.5 text-sm text-mute hover:text-bone">
            Close
          </button>
        </div>
        <div className="mt-8">
          <EcosystemSelector
            keys={ECOSYSTEM_KEYS}
            hrefOf={(key) => `/signup?role=${key}`}
            onPick={(key) => {
              track('signup_started', { ecosystem: key, source: 'join_modal' })
              onClose()
            }}
          />
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}
