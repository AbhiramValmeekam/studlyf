import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { categoryLabel } from '../../ui/cards'
import { titleCase, formatDate } from '../../../lib/format'
import { EASE } from '../../../lib/motion'
import { linkLabel } from '../parts'

// TERMINAL — a developer's portfolio rendered like a shell session: monospace
// throughout, `$`/`//` markers, a blinking caret, skill and project rows as output.
export default function Terminal({ profile, projects, education, links }) {
  return (
    <article className="pb-32 pt-36 font-mono md:pt-44">
      <div className="wrap">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-line/15 bg-ink2/50"
        >
          <div className="flex items-center gap-2 border-b border-line/10 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-flare/70" />
            <span className="h-3 w-3 rounded-full bg-amber-300/70" />
            <span className="h-3 w-3 rounded-full bg-lime-300/70" />
            <span className="ml-3 text-xs text-mute">{profile.username}@studlyf: ~</span>
          </div>
          <div className="space-y-1.5 p-5 text-sm sm:p-6">
            <p className="text-mute"><span className="text-acid">$</span> whoami</p>
            <p className="text-2xl font-semibold tracking-tight text-bone">
              {profile.headline || `@${profile.username}`}
              <span className="ml-1 inline-block h-5 w-2 translate-y-0.5 animate-pulse bg-acid align-middle" aria-hidden />
            </p>
            <p className="text-mute">
              {[profile.name, `@${profile.username}`, profile.location].filter(Boolean).join(' · ')}
              {profile.availability && <span className="text-lime-300"> [{titleCase(profile.availability)}]</span>}
            </p>
          </div>
        </motion.div>

        <div className="mx-auto mt-10 max-w-3xl space-y-10 text-sm">
          {profile.bio && (
            <Block cmd="cat about.txt">
              <p className="whitespace-pre-line leading-relaxed text-bone/85">{profile.bio}</p>
            </Block>
          )}

          {profile.skills?.length > 0 && (
            <Block cmd="ls skills/">
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((s) => (
                  <span key={s.slug} className="rounded border border-line/15 bg-ink2/40 px-2 py-1 text-[13px] text-acid">
                    {s.name}
                  </span>
                ))}
              </div>
            </Block>
          )}

          {education.length > 0 && (
            <Block cmd="cat education.log">
              <div className="space-y-2 text-bone/85">
                {education.map((e, i) => (
                  <p key={i}>
                    <span className="text-mute">{e.year || '····'}</span> — {e.school}
                    {e.program && <span className="text-mute"> · {e.program}</span>}
                  </p>
                ))}
              </div>
            </Block>
          )}

          {links.length > 0 && (
            <Block cmd="cat links.env">
              <div className="space-y-1 text-bone/85">
                {links.map(([k, v]) => (
                  <p key={k}>
                    <span className="text-violet">{linkLabel(k).toUpperCase()}</span>=
                    <a href={v} target="_blank" rel="noreferrer" className="text-acid hover:underline">{v}</a>
                  </p>
                ))}
              </div>
            </Block>
          )}

          {projects?.length > 0 && (
            <Block cmd="git log --projects">
              <div className="space-y-3">
                {projects.map((p) => (
                  <Link key={p.id} to={`/community/${p.slug}`} className="group block">
                    <p className="text-bone group-hover:text-acid">
                      <span className="text-amber-300">●</span> {p.title}
                      <span className="ml-2 text-xs text-mute">({categoryLabel(p.category)})</span>
                    </p>
                    {p.tagline && <p className="pl-4 text-mute">{p.tagline}</p>}
                  </Link>
                ))}
              </div>
            </Block>
          )}
        </div>

        {profile.joinedAt && (
          <p className="mx-auto mt-12 max-w-3xl text-xs text-mute">
            <span className="text-acid">$</span> since {formatDate(profile.joinedAt)}
          </p>
        )}
      </div>
    </article>
  )
}

function Block({ cmd, children }) {
  return (
    <section>
      <p className="mb-2 text-mute"><span className="text-acid">$</span> {cmd}</p>
      <div className="border-l border-line/10 pl-4">{children}</div>
    </section>
  )
}
