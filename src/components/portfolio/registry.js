import Editorial from './templates/Editorial'
import Minimal from './templates/Minimal'
import Terminal from './templates/Terminal'
import Spotlight from './templates/Spotlight'

// Portfolio template gallery for the public builder page. Ids are persisted on the
// builder profile (`profile.template`) and validated server-side — keep this list in
// sync with builder-profiles.schemas.js.
export const PORTFOLIO_TEMPLATES = [
  { id: 'editorial', name: 'Editorial', sub: 'Centered masthead, a clean single column. The classic.' },
  { id: 'minimal', name: 'Minimal', sub: 'Left-aligned, light type, quiet label rails. Lots of air.' },
  { id: 'terminal', name: 'Terminal', sub: 'A shell session — monospace, prompts, output blocks.' },
  { id: 'spotlight', name: 'Spotlight', sub: 'Oversized gradient name, projects lead as big cards.' },
]

const MAP = { editorial: Editorial, minimal: Minimal, terminal: Terminal, spotlight: Spotlight }

export const portfolioTemplate = (id) => MAP[id] || Editorial
export const portfolioTemplateMeta = (id) => PORTFOLIO_TEMPLATES.find((t) => t.id === id) || PORTFOLIO_TEMPLATES[0]
