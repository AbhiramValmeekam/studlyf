import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Avatar, Tag, Badge } from '../../ui/atoms'
import { categoryLabel } from '../../ui/cards'
import { titleCase, formatDate } from '../../../lib/format'
import { EASE } from '../../../lib/motion'
import { linkLabel } from '../parts'

// EDITORIAL — the signature STUDLYF portfolio: a centered masthead, a single
// generous column of stacked sections, projects in a two-up grid. Refined default.
export default function Editorial({ profile, projects, education, links }) {
  return (
    <article className="pb-32 pt-36 md:pt-44">
      <div className="wrap">
        <motion.header
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="flex flex-col items-center gap-5 text-center"
        >
          <Avatar src={profile.profilePhoto?.url} name={profile.name || profile.username} size={96} />
          <div>
            <h1 className="display-face text-balance text-5xl tracking-tight">
              {profile.headline || `@${profile.username}`}
            </h1>
            <p className="mt-2 text-sm text-mute">
              {profile.name && <span className="text-bone/90">{profile.name} · </span>}
              <span className="font-mono">@{profile.username}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-mute">
            {profile.location && <span>{profile.location}</span>}
            {profile.availability && (
              <>
                {profile.location && <span aria-hidden>·</span>}
                <Badge tone="open">{titleCase(profile.availability)}</Badge>
              </>
            )}
          </div>
          {links.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3">
              {links.map(([k, v]) => (
                <a key={k} href={v} target="_blank" rel="noreferrer" className="rounded-full border border-line/20 px-4 py-1.5 text-sm text-bone hover:border-line/40">
                  {linkLabel(k)}
                </a>
              ))}
            </div>
          )}
        </motion.header>

        <div className="mx-auto mt-16 grid max-w-3xl gap-12">
          {profile.bio && (
            <section>
              <p className="eyebrow mb-4">About</p>
              <p className="whitespace-pre-line text-lede text-bone/90">{profile.bio}</p>
            </section>
          )}

          {profile.skills?.length > 0 && (
            <section>
              <p className="eyebrow mb-4">Skills</p>
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
              <p className="eyebrow mb-4">Education</p>
              <ul className="space-y-4">
                {education.map((e, i) => (
                  <li key={i} className="card-surface p-5">
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

          {projects?.length > 0 && (
            <section>
              <p className="eyebrow mb-4">Projects</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {projects.map((p) => (
                  <Link key={p.id} to={`/community/${p.slug}`} className="card-surface group flex flex-col p-5 transition-colors hover:border-line/30">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge tone="violet">{categoryLabel(p.category)}</Badge>
                      {p.featured && <Badge tone="open">Featured</Badge>}
                    </div>
                    <p className="font-semibold tracking-tight text-bone group-hover:text-acid">{p.title}</p>
                    {p.tagline && <p className="mt-1 line-clamp-2 text-sm text-mute">{p.tagline}</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {p.tags?.slice(0, 3).map((t) => <Tag key={t}>#{t}</Tag>)}
                      <span className="ml-auto text-xs text-mute">{p.upvoteCount} upvote{p.upvoteCount === 1 ? '' : 's'}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {profile.joinedAt && (
          <p className="mt-16 text-center text-xs text-mute">On STUDLYF since {formatDate(profile.joinedAt)}</p>
        )}
      </div>
    </article>
  )
}
