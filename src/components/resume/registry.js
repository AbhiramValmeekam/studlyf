import Classic from './templates/Classic'
import Modern from './templates/Modern'
import Minimal from './templates/Minimal'
import Technical from './templates/Technical'

// The résumé template gallery. `swatch` colours the picker thumbnail; `sidebar` marks
// layouts that render a full-bleed column (no page padding) so the preview sheet can
// drop its inner padding for them. Ids are persisted on the resume (`resume.template`)
// and validated server-side — keep this list in sync with resumes.schemas.js.
export const RESUME_TEMPLATES = [
  { id: 'classic', name: 'Classic', tag: 'Timeless', sub: 'Centered serif masthead, ATS-friendly single column.', swatch: '#1a1a1a', sidebar: false },
  { id: 'modern', name: 'Modern', tag: 'Two-column', sub: 'Tinted sidebar for skills & contact, content on the right.', swatch: '#5B2CFF', sidebar: true },
  { id: 'minimal', name: 'Minimal', tag: 'Editorial', sub: 'Swiss whitespace, a light name, a quiet label rail.', swatch: '#888888', sidebar: false },
  { id: 'technical', name: 'Technical', tag: 'For devs', sub: 'Monospace scaffolding, skill chips, projects first.', swatch: '#0f766e', sidebar: true },
]

const MAP = { classic: Classic, modern: Modern, minimal: Minimal, technical: Technical }

export const resumeTemplate = (id) => MAP[id] || Classic
export const resumeTemplateMeta = (id) => RESUME_TEMPLATES.find((t) => t.id === id) || RESUME_TEMPLATES[0]
