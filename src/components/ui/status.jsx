import { Badge } from './atoms'
import { titleCase } from '../../lib/format'

// Application status → badge tone. Shared across the dashboard, list and detail.
const STATUS_TONE = {
  DRAFT: 'neutral',
  SUBMITTED: 'violet',
  UNDER_REVIEW: 'soon',
  SHORTLISTED: 'soon',
  SELECTED: 'open',
  REJECTED: 'urgent',
  WITHDRAWN: 'closed',
}

export function StatusBadge({ status, className = '' }) {
  return (
    <Badge tone={STATUS_TONE[status] || 'neutral'} className={className}>
      {titleCase(status)}
    </Badge>
  )
}
