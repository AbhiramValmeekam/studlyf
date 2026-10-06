import { Link, useLocation } from 'react-router-dom'
import { ecosystemFromPath } from '../../lib/ecosystems'
import { ArrowIcon } from '../ui/Button'

/**
 * Way back to the dashboard of whichever ecosystem the current URL belongs to.
 *
 * A section is reachable from several places — the product tab bar, the global nav, a
 * notification — so this reads the ecosystem off the URL rather than taking it as a prop, and
 * renders nothing outside a product area (public pages, /account, the shared builder pages when
 * visited directly). The dashboard is always the first path segment plus /dashboard, which is
 * the first entry of PRODUCT_NAV for every ecosystem.
 */
export function BackToDashboard({ compact = false, className = '' }) {
  const { pathname } = useLocation()
  const eco = ecosystemFromPath(pathname)
  if (!eco) return null

  const [, segment, page] = pathname.split('/')
  const dashboard = `/${segment}/dashboard`
  // Nothing to go back to from the dashboard itself, and onboarding's dashboard isn't reachable
  // yet — linking there would only bounce the user straight back.
  if (page === 'dashboard' || page === 'onboarding') return null

  if (compact) {
    return (
      <Link
        to={dashboard}
        aria-label="Back to dashboard"
        title="Back to dashboard"
        className={`mr-1 flex h-8 w-8 items-center justify-center rounded-full text-mute transition-colors hover:bg-line/[0.06] hover:text-bone ${className}`}
      >
        <ArrowIcon className="h-4 w-4 rotate-180" />
      </Link>
    )
  }

  return (
    <Link
      to={dashboard}
      className={`group inline-flex items-center gap-2 text-sm text-mute transition-colors hover:text-bone ${className}`}
    >
      <ArrowIcon className="h-4 w-4 rotate-180 transition-transform group-hover:-translate-x-0.5" />
      Back to dashboard
    </Link>
  )
}
