import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Avatar, Tag, Badge } from '../../ui/atoms'
import { categoryLabel } from '../../ui/cards'
import { titleCase, formatDate } from '../../../lib/format'
import { EASE, fadeUp, stagger, inView } from '../../../lib/motion'
import { linkLabel } from '../parts'

// SPOTLIGHT — bold and project-forward: an oversized gradient masthead, then the
// projects lead as large spotlight cards. Skills & education read as a compact rail.
export default function Spotlight({ profile, projects, education, links }) {
  return (
    <article className="pb-32 pt-36 md:pt-44">
      <div className="wrap">
        <motion.header
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE }}
          className="relative"
        >
          <div className="flex flex-wrap items-center gap-4">
            <Avatar src={profile.profilePhoto?.url} name={profile.name || profile.username} size={64} />
            <p className="text-sm text-mute">
              {profile.name && <span className="text-bone/90">{profile.name} · </span>}
              <span className="font-mono">@{profile.username}</span>
            </p>
          </div>
          <h1 className="grad-heading mt-6 max-w-5xl text-balance text-6xl font-bold leading-[0.95] tracking-tight sm:text-7xl md:text-8xl">
            {profile.headline || `@${profile.username}`}
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-mute">
            {profile.location && <span>{profile.location}</span>}
            {profile.availability && <Badge tone="open">{titleCase(profile.availability)}</Badge>}
            {links.map(([k, v]) => (
              <a key={k} href={v} target="_blank" rel="noreferrer" className="rounded-full border border-line/20 px-4 py-1.5 text-bone hover:border-acid/50">
                {linkLabel(k)}
              </a>
            ))}
          </div>
          {profile.bio && (
            <p className="mt-8 max-w-2xl whitespace-pre-line text-lede text-bone/90">{profile.bio}</p>
          )}
        </motion.header>

        {projects?.length > 0 && (
          <motion.section
            variants={stagger(0.08)}
            initial="hidden"
            whileInView="show"
            viewport={inView}
            className="mt-20"
          >
            <p className="eyebrow mb-6">Selected work</p>
            <div className="grid gap-5 md:grid-cols-2">
              {projects.map((p) => (
                <motion.div key={p.id} variants={fadeUp}>
                  <Link to={`/community/${p.slug}`} className="spotlight-card group flex h-full flex-col rounded-3xl border border-line/12 p-7 transition-transform hover:-translate-y-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge tone="violet">{categoryLabel(p.category)}</Badge>
                      {p.featured && <Badge tone="open">Featured</Badge>}
                    </div>
                    <p className="text-2xl font-semibold tracking-tight text-bone group-hover:text-acid">{p.title}</p>
                    {p.tagline && <p className="mt-2 text-mute">{p.tagline}</p>}
                    <div className="mt-5 flex flex-wrap items-center gap-2 pt-2">
                      {p.tags?.slice(0, 4).map((t) => <Tag key={t}>#{t}</Tag>)}
                      <span className="ml-auto text-xs text-mute">{p.upvoteCount} upvote{p.upvoteCount === 1 ? '' : 's'}</span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        <div className="mt-20 grid gap-12 md:grid-cols-2">
          {profile.skills?.length > 0 && (
            <section>
              <p className="eyebrow mb-5">Skills</p>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((s) => (
                  <Tag key={s.slug} className="px-3 py-1.5 text-sm">
                    {s.name}
                    {s.proficiency && <span className="ml-1.5 text-mute/60">· {titleCase(s.proficiency)}</span>}
                  </Tag>
                ))}
              </div>
            </section>
          )}
          {education.length > 0 && (
            <section>
              <p className="eyebrow mb-5">Education</p>
              <ul className="space-y-4">
                {education.map((e, i) => (
                  <li key={i}>
                    <p className="font-semibold text-bone">
                      {e.school}
                      {e.current && <Badge tone="open" className="ml-2 align-middle">Current</Badge>}
                    </p>
                    <p className="text-sm text-mute">{[e.program, e.year].filter(Boolean).join(' · ') || '—'}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {profile.joinedAt && (
          <p className="mt-16 text-xs text-mute">On STUDLYF since {formatDate(profile.joinedAt)}</p>
        )}
      </div>
    </article>
  )
}
