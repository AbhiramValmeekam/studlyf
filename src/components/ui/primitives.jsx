import { forwardRef } from 'react'
import { Link } from 'react-router-dom'

/* ------------------------------------------------------------------ *
 * Small brand-token building blocks shared across every ecosystem UI.
 * All colors come from the STUDLYF palette (ink / bone / acid / flare /
 * violet) so the app reads as one product with the marketing site.
 * ------------------------------------------------------------------ */

// ---------- Button ----------
const VARIANTS = {
  primary: 'bg-acid text-ink hover:bg-acid/90 border border-acid',
  ghost: 'bg-transparent text-bone border border-bone/25 hover:border-bone/60',
  ghostDark: 'bg-transparent text-ink border border-ink/20 hover:border-ink/50',
  solid: 'bg-ink text-bone hover:bg-ink2 border border-ink',
  flare: 'bg-flare text-bone hover:bg-flare/90 border border-flare',
  violet: 'bg-violet text-bone hover:bg-violet/90 border border-violet',
}
const SIZES = { sm: 'px-4 py-2 text-xs', md: 'px-5 py-2.5 text-sm', lg: 'px-7 py-3.5 text-base' }

export const Button = forwardRef(function Button(
  { as, to, href, variant = 'primary', size = 'md', className = '', children, ...rest },
  ref,
) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-tight transition-colors disabled:opacity-40 disabled:pointer-events-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`
  if (to) return <Link ref={ref} to={to} className={cls} data-cursor="hover" {...rest}>{children}</Link>
  if (href) return <a ref={ref} href={href} className={cls} data-cursor="hover" {...rest}>{children}</a>
  const Tag = as || 'button'
  return <Tag ref={ref} className={cls} data-cursor="hover" {...rest}>{children}</Tag>
})

// ---------- Card ----------
export function Card({ className = '', children, hover = false, ...rest }) {
  return (
    <div
      className={`rounded-2xl border border-bone/12 bg-ink2/70 backdrop-blur-sm ${
        hover ? 'transition-colors hover:border-acid/40' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}

// ---------- Chip / Tag ----------
export function Chip({ active = false, onClick, children, className = '' }) {
  const clickable = typeof onClick === 'function'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      data-cursor={clickable ? 'hover' : undefined}
      className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors ${
        active
          ? 'bg-acid text-ink border-acid'
          : 'bg-transparent text-bone2 border-bone/20 ' + (clickable ? 'hover:border-bone/50 hover:text-bone' : '')
      } ${!clickable ? 'cursor-default' : ''} ${className}`}
    >
      {children}
    </button>
  )
}

export function Tag({ children, tone = 'default', className = '' }) {
  const tones = {
    default: 'bg-bone/8 text-bone2 border-bone/15',
    acid: 'bg-acid/15 text-acid border-acid/30',
    flare: 'bg-flare/15 text-flare border-flare/30',
    violet: 'bg-violet/20 text-violet border-violet/40',
  }
  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-medium tracking-wide border ${tones[tone]} ${className}`}>
      {children}
    </span>
  )
}

// ---------- Badge (status pill) ----------
const STATUS_TONE = {
  Draft: 'bg-bone/10 text-bone2',
  Applied: 'bg-violet/20 text-violet',
  'Under Review': 'bg-acid/15 text-acid',
  Submitted: 'bg-acid/15 text-acid',
  Shortlisted: 'bg-acid/15 text-acid',
  Accepted: 'bg-acid/20 text-acid',
  Rejected: 'bg-flare/15 text-flare',
  Open: 'bg-acid/15 text-acid',
  Closed: 'bg-flare/15 text-flare',
}
export function Badge({ children, className = '' }) {
  const tone = STATUS_TONE[children] || 'bg-bone/10 text-bone2'
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ${tone} ${className}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" />{children}
  </span>
}

// ---------- Avatar ----------
export function Avatar({ src, name = '', size = 40, className = '' }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  return src ? (
    <img
      src={src}
      alt={name}
      style={{ width: size, height: size }}
      className={`rounded-full object-cover object-[center_25%] ${className}`}
    />
  ) : (
    <span
      style={{ width: size, height: size }}
      className={`grid place-items-center rounded-full bg-violet/25 text-bone font-display text-sm ${className}`}
    >
      {initials}
    </span>
  )
}

// ---------- StatCard ----------
export function StatCard({ label, value, sub, accent = 'acid' }) {
  const color = { acid: 'text-acid', flare: 'text-flare', violet: 'text-violet', bone: 'text-bone' }[accent]
  return (
    <Card className="p-5">
      <p className="eyebrow text-bone2">{label}</p>
      <p className={`font-display text-4xl md:text-5xl leading-none mt-3 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-bone2 mt-2">{sub}</p>}
    </Card>
  )
}

// ---------- Section title inside app pages ----------
export function PageTitle({ eyebrow, title, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
      <div>
        {eyebrow && <p className="eyebrow text-acid mb-3">{eyebrow}</p>}
        <h1 className="font-display d-2 text-bone tracking-crush">{title}</h1>
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  )
}

// ---------- EmptyState ----------
export function EmptyState({ title, sub, action }) {
  return (
    <Card className="p-12 text-center">
      <p className="font-display text-2xl text-bone">{title}</p>
      {sub && <p className="text-bone2 mt-2 max-w-md mx-auto">{sub}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </Card>
  )
}
