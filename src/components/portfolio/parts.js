import { titleCase } from '../../lib/format'

export const LINK_LABELS = { github: 'GitHub', linkedin: 'LinkedIn', portfolio: 'Portfolio', website: 'Website' }

// Derive the pieces every portfolio template renders from, so the switch in
// BuilderProfile stays thin and each template gets one consistent shape.
export function portfolioData(profile) {
  const links = Object.entries(profile.links || {}).filter(([, v]) => v)
  const current = profile.currentEducation
  const education = [
    ...(current
      ? [{
          school: current.college,
          program: [current.degree, current.branch].filter(Boolean).join(', '),
          year: current.graduationYear ? `Class of ${current.graduationYear}` : '',
          current: true,
        }]
      : []),
    ...(profile.education || []),
  ]
  return { links, education }
}

export const linkLabel = (k) => LINK_LABELS[k] || titleCase(k)
