// Formatting helpers for API values (ISO dates, enums).

export function formatDate(iso, opts) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', opts || { day: 'numeric', month: 'short', year: 'numeric' })
}

// "in 5 days", "2 days ago", "today"
export function relativeDeadline(iso) {  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const ms = d.getTime() - Date.now()
  const days = Math.round(ms / 86400000)
  if (days === 0) return 'Closes today'
  if (days === 1) return 'Closes tomorrow'
  if (days > 1) return `${days} days left`
  if (days === -1) return 'Closed yesterday'
  return 'Closed'
}

export function deadlineUrgency(iso) {
  if (!iso) return 'none'
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86400000)
  if (days < 0) return 'closed'
  if (days <= 3) return 'urgent'
  if (days <= 10) return 'soon'
  return 'open'
}

// Compact "time since" for live feeds: "just now", "3m ago", "2h ago", "5d ago",
// then falls back to an absolute date for anything older than a week.
export function timeAgo(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const secs = Math.round((Date.now() - d.getTime()) / 1000)
  if (secs < 45) return 'just now'
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(iso)
}

// HACKATHON → Hackathon, OPPORTUNITY_RESOURCE → Opportunity resource
export function titleCase(str) {
  if (!str) return ''
  return str
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function initials(name) {
  if (!name) return '?'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

/**
 * A job's published compensation as one line. The server masks an undisclosed range, so `min`
 * being null here already means "not advertised" — this never invents a figure (§90).
 */
export function formatSalary(salary) {
  if (!salary || !salary.disclosed || (salary.min == null && salary.max == null)) return 'Not disclosed'
  const money = (n) => {
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: salary.currency || 'INR',
        maximumFractionDigits: 0,
      }).format(n)
    } catch {
      // An unknown currency code must not blank the field.
      return `${salary.currency || ''} ${n.toLocaleString('en-IN')}`.trim()
    }
  }
  const range = salary.min != null && salary.max != null && salary.max !== salary.min
    ? `${money(salary.min)} – ${money(salary.max)}`
    : money(salary.min ?? salary.max)
  const per = salary.period === 'MONTH' ? '/month' : salary.period === 'YEAR' ? '/year' : ''
  return `${range}${per}`
}
