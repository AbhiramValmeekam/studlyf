import { initials } from '../../lib/format'

export function Chip({ children, active, onClick, className = '' }) {
  const Comp = onClick ? 'button' : 'span'
  return (
    <Comp
      onClick={onClick}
      // As a button it must never submit a surrounding form; it acts as a toggle.
      {...(onClick ? { type: 'button', 'aria-pressed': !!active } : {})}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors duration-200 ${
        active
          ? 'border-transparent bg-acid text-ink'
          : 'border-line/15 text-mute hover:border-line/35 hover:text-bone'
      } ${className}`}
    >
      {children}
    </Comp>
  )
}

export function Tag({ children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-md bg-line/[0.07] px-2 py-0.5 text-xs font-medium text-mute ${className}`}
    >
      {children}
    </span>
  )
}

const badgeTones = {
  open: 'bg-acid/15 text-acid',
  soon: 'bg-amber-400/15 text-amber-300',
  urgent: 'bg-flare/15 text-flare',
  closed: 'bg-line/10 text-mute',
  neutral: 'bg-line/10 text-mute',
  violet: 'bg-violet/20 text-violet',
}

export function Badge({ children, tone = 'neutral', className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium tracking-tight ${badgeTones[tone] || badgeTones.neutral} ${className}`}
    >
      {children}
    </span>
  )
}

export function Avatar({ src, alt, name, size = 44, className = '' }) {
  return src ? (
    <img
      src={src}
      alt={alt || name || ''}
      width={size}
      height={size}
      loading="lazy"
      className={`rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className={`inline-grid place-items-center rounded-full bg-line/10 font-mono text-xs text-mute ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}

export function Spinner({ className = '' }) {
  return (
    <svg className={`animate-spin ${className}`} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-line/[0.08] ${className}`} />
}

export function EmptyState({ title, hint, icon }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line/12 py-20 text-center">
      {icon && <div className="mb-4 text-mute/60">{icon}</div>}
      <p className="display-face text-2xl tracking-tight">{title}</p>
      {hint && <p className="mt-2 max-w-sm text-sm text-mute">{hint}</p>}
    </div>
  )
}

export function ErrorState({ onRetry, message }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-flare/20 bg-flare/[0.04] py-16 text-center">
      <p className="display-face text-2xl tracking-tight text-bone">Something broke</p>
      <p className="mt-2 max-w-sm text-sm text-mute">
        {message || 'We couldn’t reach the STUDLYF API. Check your connection and try again.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 rounded-full border border-line/20 px-5 py-2 text-sm text-bone hover:border-line/40"
        >
          Try again
        </button>
      )}
    </div>
  )
}
