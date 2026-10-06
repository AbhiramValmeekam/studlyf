import { Link } from 'react-router-dom'
import { ECOSYSTEMS, ECOSYSTEM_KEYS } from '../../lib/ecosystems'

export const STATUS_LABEL = {
  ACTIVE: 'Open',
  ONBOARDING: 'Finish setup',
  PENDING: 'Pending verification',
  REJECTED: 'Not approved',
  SUSPENDED: 'Suspended',
  NONE: 'Get started',
}

const STATUS_TONE = {
  ACTIVE: 'bg-acid/15 text-acid',
  ONBOARDING: 'bg-amber-400/15 text-amber-300',
  PENDING: 'bg-amber-400/15 text-amber-300',
  REJECTED: 'bg-flare/15 text-flare',
  SUSPENDED: 'bg-flare/15 text-flare',
  NONE: 'bg-line/10 text-mute',
}

export function StatusPill({ status }) {
  if (!status) return null
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_TONE[status] || STATUS_TONE.NONE}`}>
      {STATUS_LABEL[status] || status}
    </span>
  )
}

/**
 * Touch-friendly grid of ecosystem choices, used by "Join STUDLYF", /signup (no role yet) and the
 * post-login "Where do you want to go?" selector. Every option is a real link or button — no
 * hover-only affordances — so it works the same on phones.
 */
export function EcosystemSelector({ keys, statusOf, hrefOf, onPick, columns = 'sm:grid-cols-2 lg:grid-cols-3' }) {
  return (
    <ul className={`grid gap-3 ${columns}`}>
      {keys.map((key, i) => {
        const e = ECOSYSTEMS[key]
        const status = statusOf?.(key)
        const href = hrefOf?.(key)
        const body = (
          <>
            <div className="flex items-start justify-between gap-3">
              <span className={`display-face text-3xl leading-none ${e.accent}`}>0{ECOSYSTEM_KEYS.indexOf(key) + 1}</span>
              {status ? <StatusPill status={status} /> : e.gated ? <span className="text-[10px] uppercase tracking-[0.18em] text-mute">Verified access</span> : null}
            </div>
            <p className="mt-5 text-lg font-semibold text-bone">{e.label}</p>
            <p className="mt-1 text-sm leading-snug text-mute">{e.blurb}</p>
            <span className={`mt-4 inline-flex items-center gap-1.5 text-sm font-medium ${e.accent}`}>
              {status && status !== 'NONE' ? (status === 'ACTIVE' ? 'Go to dashboard' : 'View status') : `Continue as ${e.label.toLowerCase()}`} <span aria-hidden>↗</span>
            </span>
          </>
        )
        const cls =
          'group block h-full w-full rounded-2xl border border-line/12 bg-ink2/60 p-5 text-left transition-colors duration-300 hover:border-line/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-acid'
        return (
          // CSS (not JS-driven) entrance: navigation choices must never get stuck half-visible.
          <li key={key} className="animate-[fadeIn_.4s_ease-out_both]" style={{ animationDelay: `${i * 40}ms` }}>
            {href ? (
              <Link to={href} onClick={() => onPick?.(key)} className={cls}>
                {body}
              </Link>
            ) : (
              <button type="button" onClick={() => onPick?.(key)} className={cls}>
                {body}
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
