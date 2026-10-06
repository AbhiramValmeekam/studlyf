import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Badge } from '../../ui/atoms'
import { categoryLabel } from '../../ui/cards'
import { titleCase, formatDate } from '../../../lib/format'
import { EASE } from '../../../lib/motion'
import { linkLabel } from '../parts'

// MINIMAL — left-aligned, Swiss whitespace. A light oversized name, then quiet
// label-rail rows. No cards, no avatar — just type, air, and hairlines.
export default function Minimal({ profile, projects, education, links }) {
  return (
    <article className="pb-32 pt-36 md:pt-44">
      <div className="wrap">
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="max-w-4xl"
        >
          <h1 className="display-face text-5xl font-light tracking-tight sm:text-6xl">
            {profile.headline || `@${profile.username}`}
          </h1>
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-mute">
            {profile.name && <span className="text-bone/90">{profile.name}</span>}
            <span className="font-mono">@{profile.username}</span>
            {profile.location && <span>· {profile.location}</span>}
            {profile.availability && <Badge tone="open">{titleCase(profile.availability)}</Badge>}
          </p>
          {links.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-4 text-sm">
              {links.map(([k, v]) => (
                <a key={k} href={v} target="_blank" rel="noreferrer" className="text-bone underline-offset-4 hover:text-acid hover:underline">
                  {linkLabel(k)}
                </a>
              ))}
            </div>
          )}
        </motion.header>

        <div className="mt-16 max-w-4xl">
          {profile.bio && (
            <Row label="About">
              <p className="whitespace-pre-line text-lede font-light text-bone/90">{profile.bio}</p>
            </Row>
          )}

          {profile.skills?.length > 0 && (
            <Row label="Skills">
              <p className="text-[15px] leading-relaxed text-bone/80">
                {profile.skills.map((s) => s.name).join('   ·   ')}
              </p>
            </Row>
          )}

          {education.length > 0 && (
            <Row label="Education">
              <div className="space-y-4">
                {education.map((e, i) => (
                  <div key={i} className="flex items-baseline justify-between gap-4">
                    <div>
                      <p className="font-medium text-bone">{e.school}</p>
                      <p className="text-sm text-mute">{e.program || '—'}</p>
                    </div>
                    <span className="shrink-0 text-sm text-mute">{e.year}</span>
                  </div>
                ))}
              </div>
            </Row>
          )}

          {projects?.length > 0 && (
            <Row label="Projects">
              <div className="divide-y divide-line/10">
                {projects.map((p) => (
                  <Link key={p.id} to={`/community/${p.slug}`} className="group flex items-baseline justify-between gap-4 py-3 first:pt-0">
                    <div>
                      <p className="font-medium text-bone group-hover:text-acid">{p.title}</p>
                      {p.tagline && <p className="mt-0.5 line-clamp-1 text-sm text-mute">{p.tagline}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-mute">{categoryLabel(p.category)}</span>
                  </Link>
                ))}
              </div>
            </Row>
          )}
        </div>

        {profile.joinedAt && (
          <p className="mt-14 max-w-4xl text-xs text-mute">On STUDLYF since {formatDate(profile.joinedAt)}</p>
        )}
      </div>
    </article>
  )
}

// A section as a label rail + content, one thin rule per section.
function Row({ label, children }) {
  return (
    <section className="grid gap-4 border-t border-line/10 py-8 first:border-t-0 sm:grid-cols-[160px_1fr] sm:gap-10">
      <div className="eyebrow pt-1">{label}</div>
      <div>{children}</div>
    </section>
  )
}
