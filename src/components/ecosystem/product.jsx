import { NavLink, useLocation } from 'react-router-dom'
import { ECOSYSTEMS } from '../../lib/ecosystems'
import { EmptyState, ErrorState, Skeleton } from '../ui/atoms'
import { BackToDashboard } from './BackToDashboard'
import { useSeo } from '../../lib/seo'

// Shared chrome for the authenticated ecosystem products (founder, investor, HR, organization,
// and the new builder pages). Same editorial language as the rest of STUDLYF; each product gets
// its own tab bar so navigation inside an ecosystem never depends on the global nav.

export const PRODUCT_NAV = {
  BUILDER: [
    ['Dashboard', '/builders/dashboard'],
    ['Profile', '/builders/profile'],
    ['Opportunities', '/builders/opportunities'],
    // The public job board is shared, exactly as Opportunities is — one page, not a copy (§96).
    ['Jobs', '/jobs'],
    ['Applications', '/builders/applications'],
    ['Projects', '/builders/projects'],
    ['Achievements', '/builders/achievements'],
    ['Roadmap', '/builders/roadmap'],
  ],
  FOUNDER: [
    ['Dashboard', '/founders/dashboard'],
    ['Profile', '/founders/profile'],
    ['Startup', '/founders/startup'],
    ['Workspace', '/founders/workspace'],
    ['Readiness', '/founders/readiness'],
    ['Traction', '/founders/traction'],
    ['Updates', '/founders/updates'],
    ['Investors', '/founders/investors'],
  ],
  INVESTOR: [
    ['Dashboard', '/investors/dashboard'],
    ['Discover', '/investors/discover'],
    ['Founders', '/investors/founders'],
    ['Startups', '/investors/startups'],
    ['Saved', '/investors/saved'],
    ['Connections', '/investors/connections'],
    ['Intelligence', '/investors/intelligence'],
    ['Preferences', '/investors/preferences'],
  ],
  HR: [
    ['Dashboard', '/hr/dashboard'],
    ['Talent', '/hr/talent'],
    ['Shortlist', '/hr/shortlist'],
    ['Invitations', '/hr/invitations'],
    ['Interviews', '/hr/interviews'],
    ['Offers', '/hr/offers'],
    ['Jobs', '/hr/jobs'],
    ['Hiring', '/hr/hiring'],
    ['Company', '/hr/company'],
  ],
  ORGANIZER: [
    ['Dashboard', '/organizations/dashboard'],
    ['Programs', '/organizations/opportunities'],
    ['Hackathons', '/organizations/hackathons'],
    ['Participants', '/organizations/participants'],
    ['Teams', '/organizations/teams'],
    ['Submissions', '/organizations/submissions'],
    ['Evaluators', '/organizations/evaluators'],
    ['Evaluations', '/organizations/evaluations'],
    ['Rankings', '/organizations/rankings'],
    ['Winners', '/organizations/winners'],
    ['Certificates', '/organizations/certificates'],
    ['Analytics', '/organizations/analytics'],
    ['Members', '/organizations/members'],
    ['Profile', '/organizations/profile'],
  ],
}

export function ProductTabs({ eco }) {
  const e = ECOSYSTEMS[eco]
  const { pathname } = useLocation()
  // The first entry of every product nav is its dashboard; every other section sits one level
  // under it, so the way back belongs at the head of this same bar.
  const dashboard = PRODUCT_NAV[eco][0][1]
  return (
    <nav aria-label={`${e.label} navigation`} className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none]">
      <ul className="flex min-w-max gap-1 border-b border-line/10">
        {/* Hidden on the dashboard itself — a link to where you already are. */}
        {pathname !== dashboard && (
          <li className="flex items-center">
            <BackToDashboard compact />
          </li>
        )}
        {PRODUCT_NAV[eco].map(([label, to]) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to.endsWith('dashboard')}
              className={({ isActive }) =>
                `relative block px-3.5 py-3 text-sm transition-colors ${isActive ? 'text-bone' : 'text-mute hover:text-bone'}`
              }
            >
              {({ isActive }) => (
                <>
                  {label}
                  {isActive && <span className={`absolute inset-x-3 -bottom-px h-0.5 rounded-full ${e.accentBg}`} />}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function ProductPage({ eco, title, subtitle, actions, children, seoTitle }) {
  const e = ECOSYSTEMS[eco]
  useSeo({ title: `${seoTitle || title} · STUDLYF for ${e.plural}`, description: subtitle || `${title} — STUDLYF for ${e.plural}.` })
  return (
    <div className="pb-24 pt-28 md:pt-32">
      <div className="wrap">
        <ProductTabs eco={eco} />
        <header className="flex animate-[fadeIn_.45s_ease-out_both] flex-col gap-6 pb-8 pt-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow mb-3 flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${e.accentBg}`} />
              STUDLYF for {e.plural}
            </p>
            <h1 className="display-face text-balance text-[clamp(2.2rem,5vw,3.8rem)] leading-[0.98] tracking-tight">{title}</h1>
            {subtitle && <p className="mt-3 max-w-2xl text-mute">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
        </header>
        {children}
      </div>
    </div>
  )
}

export function Stat({ label, value, hint, accent = 'text-bone' }) {
  return (
    <div className="card-surface p-5">
      <p className="text-xs uppercase tracking-[0.14em] text-mute">{label}</p>
      <p className={`display-face mt-3 text-4xl ${accent}`}>{value ?? '—'}</p>
      {hint && <p className="mt-1 text-xs text-mute">{hint}</p>}
    </div>
  )
}

export function Panel({ title, action, children, className = '' }) {
  return (
    <section className={`card-surface p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-5 flex items-center justify-between gap-4">
          {title && <h2 className="text-lg font-semibold text-bone">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function LoadingBlock({ rows = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-20" />
      ))}
    </div>
  )
}

/** Query-state helper: loading → skeleton, error → retryable error, empty → friendly empty state. */
export function QueryState({ query, empty, emptyTitle, emptyHint, children }) {
  if (query.isLoading) return <LoadingBlock />
  if (query.isError) return <ErrorState message={query.error?.message} onRetry={() => query.refetch()} />
  if (empty) return <EmptyState title={emptyTitle} hint={emptyHint} />
  return children
}

export function Notice({ tone = 'info', children }) {
  const tones = {
    info: 'border-line/15 bg-line/[0.04] text-bone',
    success: 'border-acid/25 bg-acid/[0.06] text-bone',
    warn: 'border-amber-400/30 bg-amber-400/[0.07] text-bone',
    error: 'border-flare/25 bg-flare/[0.06] text-flare',
  }
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>
      {children}
    </div>
  )
}

/** Stored enum → label: EARLY_TRACTION → Early traction. */
const SPECIAL = { B2B: 'B2B', B2C: 'B2C', B2B2C: 'B2B2C', D2C: 'D2C', SAAS: 'SaaS', VC: 'VC', HR: 'HR', NGO: 'NGO', MVP: 'MVP', GTM: 'GTM', SERIES_A: 'Series A', SERIES_B_PLUS: 'Series B+', DEEPTECH: 'Deep tech' }
export const label = (v) => (!v ? '—' : SPECIAL[v] ?? (v === v.toUpperCase() ? v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, ' ') : v))
