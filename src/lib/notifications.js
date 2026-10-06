// Presentation + routing for in-app notifications (see NOTIFICATION_TYPES on the server).
// Shared by the nav notification bell and the builder dashboard feed so a given event
// looks and routes the same everywhere. `dot` colours the status pip, `tag` is the source
// label, and `to` is the fallback destination when the notification carries no data.path.
export const NOTIF_META = {
  HR_INVITATION: { tag: 'Recruiter', dot: 'bg-acid', to: '/notifications' },
  APPLICATION_STATUS: { tag: 'Application', dot: 'bg-amber-300', to: '/builders/applications' },
  SUBMISSION_STATUS: { tag: 'Submission', dot: 'bg-violet', to: '/builders/applications' },
  EVALUATION_COMPLETED: { tag: 'Evaluation', dot: 'bg-acid', to: '/builders/achievements' },
  EVALUATION_ASSIGNED: { tag: 'Evaluation', dot: 'bg-line/40', to: '/builders/projects' },
  PROJECT_TEAM: { tag: 'Team', dot: 'bg-acid', to: '/builders/projects' },
  PROJECT_SUBMITTED: { tag: 'Project', dot: 'bg-line/40', to: '/builders/projects' },
  PROJECT_MODERATION: { tag: 'Moderation', dot: 'bg-line/40', to: '/builders/projects' },
  PROJECT_UPVOTE: { tag: 'Community', dot: 'bg-violet', to: '/community' },
  ACHIEVEMENT: { tag: 'Achievement', dot: 'bg-amber-300', to: '/builders/achievements' },
  ACCESS_STATUS: { tag: 'Access', dot: 'bg-line/40', to: '/notifications' },
  INVESTOR_CONNECTION: { tag: 'Investor', dot: 'bg-flare', to: '/notifications' },
  ORGANIZATION_MEMBER: { tag: 'Organization', dot: 'bg-line/40', to: '/notifications' },
  PROFILE_REMINDER: { tag: 'Profile', dot: 'bg-line/40', to: '/builders/profile' },
  SYSTEM: { tag: 'System', dot: 'bg-line/40', to: '/notifications' },
}

export const notifMeta = (type) => NOTIF_META[type] || { tag: 'Update', dot: 'bg-line/40', to: '/notifications' }

// Where clicking a notification should land — its own data.path wins, else the type default.
export const notifTarget = (n) => n?.data?.path || notifMeta(n?.type).to
