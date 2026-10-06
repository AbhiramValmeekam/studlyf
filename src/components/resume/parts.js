// Shared, presentation-only helpers for resume template layouts. Kept free of any
// component imports so templates and the registry can both depend on it without a cycle.

// Accept either the editor form shape (skills as comma strings) or the API shape
// (skills as arrays) and produce one consistent object the templates render from.
const toList = (v) =>
  Array.isArray(v) ? v.filter(Boolean) : v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : []

export function normalizeResume(r = {}) {
  return {
    template: r.template || 'classic',
    fullName: (r.fullName || '').trim(),
    headline: (r.headline || '').trim(),
    email: (r.email || '').trim(),
    phone: (r.phone || '').trim(),
    location: (r.location || '').trim(),
    links: r.links || {},
    summary: (r.summary || '').trim(),
    experience: (r.experience || []).filter((e) => e && (e.company || e.role)),
    education: (r.education || []).filter((e) => e && e.school),
    projects: (r.projects || []).map((p) => ({ ...p, skills: toList(p?.skills) })).filter((p) => p.name),
    skills: toList(r.skills),
    certifications: (r.certifications || []).filter((c) => c && c.name),
  }
}

// "Jun 2024 – Present" / "2021 – 2023" / single value when only one side is set.
export function dateRange({ startDate, endDate, current } = {}) {
  const end = current ? 'Present' : (endDate || '').trim()
  const start = (startDate || '').trim()
  if (start && end) return `${start} – ${end}`
  return start || end || ''
}

// Strip protocol + trailing slash so links read cleanly on the page.
export function displayUrl(u) {
  if (!u) return ''
  return String(u).replace(/^https?:\/\//i, '').replace(/\/$/, '')
}

export const LINK_ORDER = ['github', 'linkedin', 'portfolio', 'website']
export const LINK_LABELS = { github: 'GitHub', linkedin: 'LinkedIn', portfolio: 'Portfolio', website: 'Website' }

// The ordered, non-empty links as [key, url] pairs.
export function linkPairs(links = {}) {
  return LINK_ORDER.filter((k) => links[k]).map((k) => [k, links[k]])
}

// True when the resume has essentially nothing to show yet (drives the preview placeholder).
export function isResumeEmpty(r) {
  return !r.fullName && !r.headline && !r.summary && !r.experience.length && !r.education.length && !r.projects.length && !r.skills.length
}
