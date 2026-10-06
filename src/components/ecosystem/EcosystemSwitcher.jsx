import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ECOSYSTEMS, engagedEcosystems, rememberEcosystem } from '../../lib/ecosystems'
import { StatusPill } from './EcosystemSelector'

/**
 * "Switch ecosystem" — lists only ecosystems this account has actually entered. Active ones open
 * their dashboard; pending / rejected / suspended ones are shown with their state and lead to the
 * status page, never to a dashboard. "Add an ecosystem" goes to the path chooser.
 */
export function EcosystemSwitcher({ current, variant = 'desktop' }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const keys = engagedEcosystems(user)

  useEffect(() => {
    if (!open) return
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const list = (
    <ul className="flex flex-col gap-1">
      {keys.map((key) => {
        const e = ECOSYSTEMS[key]
        const s = user.ecosystems[key]
        return (
          <li key={key}>
            <Link
              to={s.destination}
              onClick={() => {
                if (s.active) rememberEcosystem(key)
                setOpen(false)
              }}
              aria-current={current === key ? 'page' : undefined}
              className={`flex items-center justify-between gap-4 rounded-xl px-3 py-2.5 transition-colors hover:bg-line/[0.06] ${current === key ? 'bg-line/[0.06]' : ''}`}
            >
              <span className="flex items-center gap-2.5">
                <span className={`h-2 w-2 rounded-full ${e.accentBg} ${s.active ? '' : 'opacity-40'}`} />
                <span className={`text-sm ${s.active ? 'text-bone' : 'text-mute'}`}>{e.label}</span>
              </span>
              {s.active ? current === key && <span className="text-[11px] text-mute">Current</span> : <StatusPill status={s.status} />}
            </Link>
          </li>
        )
      })}
      <li className="mt-1 border-t border-line/10 pt-1">
        <Link to="/choose?add=1" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm text-mute hover:bg-line/[0.06] hover:text-bone">
          + Add an ecosystem
        </Link>
      </li>
    </ul>
  )

  if (variant === 'mobile') {
    return (
      <div className="px-2">
        <p className="eyebrow mb-2 px-2">Switch ecosystem</p>
        {list}
      </div>
    )
  }

  const label = current ? ECOSYSTEMS[current].label : 'Ecosystems'
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-line/15 px-3.5 py-1.5 text-sm text-bone transition-colors hover:border-line/35"
      >
        {current && <span className={`h-2 w-2 rounded-full ${ECOSYSTEMS[current].accentBg}`} />}
        {label}
        <svg className={`h-3.5 w-3.5 text-mute transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="glass absolute right-0 top-full z-50 mt-3 w-72 rounded-2xl border border-line/10 p-2 shadow-2xl">
          <p className="eyebrow px-3 pb-2 pt-1">Switch ecosystem</p>
          {list}
        </div>
      )}
    </div>
  )
}
