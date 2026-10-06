// Minimal, privacy-first event tracking for ecosystem entry points and auth funnels.
// Events carry only coarse, non-personal properties (ecosystem key, page path, method) — never
// names, emails, ids or free text. If an analytics tag has installed `window.dataLayer`, events
// are pushed there; every event is also dispatched as a `studlyf:analytics` DOM event so any
// provider can subscribe later without touching call sites.

const ALLOWED_PROPS = new Set(['ecosystem', 'path', 'source', 'method', 'status'])

export function track(event, props = {}) {
  const clean = {}
  for (const [k, v] of Object.entries(props)) {
    if (ALLOWED_PROPS.has(k) && (typeof v === 'string' || typeof v === 'number')) clean[k] = String(v).slice(0, 80)
  }
  const payload = { event, ...clean, ts: Date.now() }
  try {
    if (Array.isArray(window.dataLayer)) window.dataLayer.push(payload)
    window.dispatchEvent(new CustomEvent('studlyf:analytics', { detail: payload }))
    if (import.meta.env.DEV) console.debug('[analytics]', payload)
  } catch {
    // analytics must never break the page
  }
}

/** ecosystem_builder_clicked, ecosystem_hr_clicked, … */
export const trackEcosystemClick = (key, source) =>
  track(`ecosystem_${key === 'ORGANIZER' ? 'organization' : key.toLowerCase()}_clicked`, { ecosystem: key, source })
