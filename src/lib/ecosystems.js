// The five STUDLYF ecosystems, and the ONE place that decides where a signed-in person goes.
//
// Access is never decided here: the API computes every ecosystem's state (`user.ecosystems`,
// from /me) straight from the database. This file only chooses BETWEEN those states — by the
// ecosystem the visitor was heading to (`?role=`), by the one they used last, or by asking.
// A `?role=` value is a hint about the entry point, never proof of permission.

export const ECOSYSTEMS = {
  BUILDER: {
    key: 'BUILDER',
    label: 'Builder',
    plural: 'Builders',
    landing: '/builders',
    home: '/builders/dashboard',
    accent: 'text-acid',
    accentBg: 'bg-acid',
    blurb: 'Students & builders — projects, opportunities, proof of work.',
  },
  FOUNDER: {
    key: 'FOUNDER',
    label: 'Founder',
    plural: 'Founders',
    landing: '/founders',
    home: '/founders/dashboard',
    accent: 'text-violet',
    accentBg: 'bg-violet',
    blurb: 'Structure your startup and get discovered by investors.',
  },
  INVESTOR: {
    key: 'INVESTOR',
    label: 'Investor',
    plural: 'Investors',
    landing: '/investors',
    home: '/investors/dashboard',
    accent: 'text-flare',
    accentBg: 'bg-flare',
    blurb: 'Verified access to founders, startups and signals.',
    gated: true,
  },
  HR: {
    key: 'HR',
    label: 'HR & Talent',
    plural: 'HR & Talent',
    landing: '/hr',
    home: '/hr/dashboard',
    accent: 'text-lime-300',
    accentBg: 'bg-lime-300',
    blurb: 'Hire builders on real evidence of their work.',
    gated: true,
  },
  ORGANIZER: {
    key: 'ORGANIZER',
    label: 'Organization',
    plural: 'Organizations',
    landing: '/organizations',
    home: '/organizations/dashboard',
    accent: 'text-amber-300',
    accentBg: 'bg-amber-300',
    blurb: 'Run hackathons, challenges and programs end to end.',
    gated: true,
  },
}

export const ECOSYSTEM_KEYS = Object.keys(ECOSYSTEMS)

/** The ecosystem key whose PUBLIC landing page is exactly this path (e.g. '/founders' → FOUNDER),
 *  or null for any other path. Used to paint each landing's shared accent backdrop. */
export function landingEcosystem(pathname) {
  return ECOSYSTEM_KEYS.find((k) => ECOSYSTEMS[k].landing === pathname) || null
}

/** Accepts BUILDER/builder/Builder and the friendly aliases used in links. Anything else → null. */
export function parseRole(value) {
  if (!value || typeof value !== 'string') return null
  const v = value.trim().toUpperCase()
  const alias = { BUILDERS: 'BUILDER', STUDENT: 'BUILDER', FOUNDERS: 'FOUNDER', INVESTORS: 'INVESTOR', ORGANIZATION: 'ORGANIZER', ORGANIZATIONS: 'ORGANIZER', ORG: 'ORGANIZER' }
  const key = alias[v] || v
  return ECOSYSTEMS[key] ? key : null
}

/** Which ecosystem's product area a path belongs to (null for public/shared pages). */
export function ecosystemFromPath(pathname) {
  const seg = pathname.split('/')[1] || ''
  const map = { builders: 'BUILDER', founders: 'FOUNDER', investors: 'INVESTOR', hr: 'HR', organizations: 'ORGANIZER' }
  const key = map[seg]
  // "/founders" alone is the PUBLIC landing page; only sub-routes are the product.
  if (!key || pathname.split('/').filter(Boolean).length < 2) return null
  // /builders/:username is a public builder profile, not the builder product.
  if (key === 'BUILDER' && !BUILDER_PRODUCT_PAGES.has(pathname.split('/')[2])) return null
  return key
}

export const BUILDER_PRODUCT_PAGES = new Set(['dashboard', 'profile', 'projects', 'opportunities', 'applications', 'achievements', 'roadmap', 'onboarding'])

// Pages that belong to the builder journey even though they aren't under /builders.
const BUILDER_SHARED = ['/welcome', '/opportunities', '/community', '/courses', '/studhub', '/ott', '/mock-drills', '/project-briefs', '/resume-builder', '/resources', '/search']

export function isBuilderSharedPath(pathname) {
  return BUILDER_SHARED.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

// ---- remembered ecosystem (per-browser convenience only) --------------------------

const LAST_KEY = 'studlyf:last-ecosystem'

function safe(fn, fallback = null) {
  try {
    return fn()
  } catch {
    return fallback
  }
}

export const rememberEcosystem = (key) => ECOSYSTEMS[key] && safe(() => localStorage.setItem(LAST_KEY, key))
export const lastEcosystem = () => parseRole(safe(() => localStorage.getItem(LAST_KEY)))

// ---- the resolver -----------------------------------------------------------------

/** Ecosystems the person has entered in any way (active, onboarding, pending, rejected, suspended). */
export function engagedEcosystems(user) {
  const eco = user?.ecosystems || {}
  return ECOSYSTEM_KEYS.filter((k) => eco[k] && eco[k].status !== 'NONE')
}

export function activeEcosystems(user) {
  const eco = user?.ecosystems || {}
  return ECOSYSTEM_KEYS.filter((k) => eco[k]?.active)
}

/**
 * Where should this signed-in person go?
 *   1. an explicit deep link they were bounced from (`from`)
 *   2. the ecosystem they were heading to (`intent`) — its dashboard, onboarding or status page
 *   3. their primary ecosystem, when it is active — an HR lead who also owns an organization goes
 *      to the HR dashboard, not the chooser
 *   4. exactly one ecosystem → that one
 *   5. several (and no active primary) → the "Where do you want to go?" selector
 *   6. none → "Choose your path"
 * Returns a path. Admins with no ecosystem land on the admin console.
 */
export function resolveDestination(user, { intent = null, from = null } = {}) {
  if (!user) return '/login'
  if (from && from !== '/' && !from.startsWith('/login') && !from.startsWith('/signup')) return from

  const eco = user.ecosystems || {}
  const wanted = parseRole(intent)
  if (wanted && eco[wanted]) return eco[wanted].destination

  // The account's primary ecosystem (`user.role`, set by the server) wins over the "several →
  // ask" branch below: someone who is an HR lead AND owns an organization goes straight to the
  // HR dashboard they signed up for, rather than a chooser. Only counts when it is ACTIVE.
  const primary = parseRole(user.role)
  if (primary && eco[primary]?.active) return eco[primary].destination

  const engaged = engagedEcosystems(user)
  if (engaged.length === 1) return eco[engaged[0]].destination
  if (engaged.length > 1) return '/choose'
  if (user.admin) return '/admin'
  return '/choose'
}

/** The link that starts an ecosystem for a visitor or a signed-in account. */
export function startPath(key, user) {
  const e = ECOSYSTEMS[key]
  if (!user) return `/signup?role=${key}`
  return user.ecosystems?.[key]?.destination || e.home
}
