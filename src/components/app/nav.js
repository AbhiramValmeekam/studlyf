// Role-scoped navigation used by the Sidebar. Each ecosystem has its own set.
export const NAV = {
  builder: {
    label: 'Builder',
    accent: 'var(--acid)',
    home: '/builder',
    items: [
      { to: '/builder', label: 'Dashboard', end: true },
      { to: '/builder/profile', label: 'My Profile' },
      { to: '/builder/opportunities', label: 'Opportunities' },
      { to: '/builder/roadmap', label: 'Career Roadmap' },
      { to: '/builder/resume', label: 'Resume Builder' },
      { to: '/builder/portfolio', label: 'Portfolio' },
      { to: '/builder/hub', label: 'STUD Hub' },
      { to: '/builder/ott', label: 'STUD OTT' },
    ],
  },
  founder: {
    label: 'Startup',
    accent: 'var(--violet)',
    home: '/startup',
    items: [
      { to: '/startup', label: 'Workspace', end: true },
      { to: '/startup/founder-profile', label: 'Founder Profile' },
      { to: '/startup/profile', label: 'Startup Profile' },
      { to: '/startup/workspace/pitch-deck', label: 'Pitch Deck' },
      { to: '/startup/workspace/market', label: 'Market Analysis' },
      { to: '/startup/workspace/swot', label: 'SWOT' },
      { to: '/startup/workspace/gtm', label: 'GTM Strategy' },
      { to: '/startup/workspace/marketing', label: 'Marketing Plan' },
      { to: '/startup/workspace/competitors', label: 'Competitor Analysis' },
      { to: '/startup/workspace/readiness', label: 'Readiness' },
      { to: '/startup/workspace/intelligence', label: 'VC Intelligence' },
      { to: '/startup/investors', label: 'Investor Discovery' },
    ],
  },
  investor: {
    label: 'Investor',
    accent: 'var(--acid)',
    home: '/investor',
    items: [
      { to: '/investor', label: 'Dashboard', end: true },
      { to: '/investor/discover', label: 'Founder Discovery' },
      { to: '/investor/analytics', label: 'Analytics' },
    ],
  },
  hr: {
    label: 'HR · Talent',
    accent: 'var(--acid)',
    home: '/hr',
    items: [
      { to: '/hr', label: 'Overview', end: true },
      { to: '/hr/talent', label: 'Talent Discovery' },
      { to: '/hr/hiring', label: 'Hiring Pipeline' },
    ],
  },
  // Organisation — evaluation platform for running hackathons/challenges with jury scoring
  org: {
    label: 'Organisation',
    accent: 'var(--flare)',
    home: '/org',
    items: [
      { to: '/org', label: 'Dashboard', end: true },
      { to: '/org/events', label: 'My Events' },
      { to: '/org/evaluate', label: 'Jury Evaluation' },
      { to: '/org/leaderboard', label: 'Leaderboard' },
    ],
  },
}

// The ecosystem switcher — jumps between products.
export const SWITCHER = [
  { role: 'builder', to: '/builder', label: 'Builder' },
  { role: 'founder', to: '/startup', label: 'Startup' },
  { role: 'investor', to: '/investor', label: 'Investor' },
  { role: 'hr', to: '/hr', label: 'HR' },
  { role: 'org', to: '/org', label: 'Organisation' },
]
