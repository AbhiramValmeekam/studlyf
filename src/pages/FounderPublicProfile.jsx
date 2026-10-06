import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { usePublicFounder } from '../lib/queries'
import { useSeo } from '../lib/seo'
import { formatDate, titleCase, timeAgo } from '../lib/format'
import { EASE } from '../lib/motion'
import { Avatar, Badge, EmptyState, Spinner } from '../components/ui/atoms'
import { Button, ArrowIcon } from '../components/ui/Button'
import { NotFoundInline } from './NotFound'

/**
 * Public startup page (spec §68/§82). Only a founder who chose PUBLIC has an address here; the
 * API answers 404 for everyone else, so an unpublished startup is indistinguishable from one
 * that never existed.
 */
export default function FounderPublicProfile() {
  const { slug } = useParams()
  const { data: page, isLoading, isError, error } = usePublicFounder(slug)

  useSeo({
    title: page?.startup?.name ? `${page.startup.name} — ${page.founder?.name ?? 'Founder'} | STUDLYF` : 'Founder | STUDLYF',
    description: page?.startup?.oneLiner || 'A startup building on STUDLYF.',
    path: `/founders/${slug}`,
  })

  if (isLoading) {
    return (
      <div className="grid min-h-[100svh] place-items-center">
        <Spinner className="h-8 w-8 text-acid" />
      </div>
    )
  }
  if (isError) return <NotFoundInline kind="startup" backTo="/founders" />
  if (!page || !page.startup) return <NotFoundInline kind="startup" backTo="/founders" />

  const { founder, startup, updates = [] } = page

  return (
    <article className="pb-28">
      <header className="wrap border-b border-line/10 pb-12 pt-36 md:pt-44">
        <motion.p
          className="eyebrow mb-6 flex items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <span className="inline-block h-px w-8 bg-acid" />
          Startup
        </motion.p>

        <motion.h1
          className="display-face text-balance text-mega"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          {startup.name}
        </motion.h1>
        {startup.oneLiner && <p className="mt-5 max-w-2xl text-lede text-bone/90">{startup.oneLiner}</p>}

        <div className="mt-8 flex flex-wrap gap-2">
          {startup.stage && <Badge tone="violet">{titleCase(startup.stage)}</Badge>}
          {startup.fundingStage && <Badge tone="open">{titleCase(startup.fundingStage)}</Badge>}
          {startup.industry && <Badge>{startup.industry}</Badge>}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-10 gap-y-5 text-sm">
          <div className="flex items-center gap-3">
            <Avatar src={founder.photo?.url} name={founder.name} size={40} />
            <div>
              <p className="text-bone">{founder.name}</p>
              {founder.headline && <p className="text-xs text-mute">{founder.headline}</p>}
            </div>
          </div>
          {(startup.location || founder.location) && (
            <div>
              <p className="eyebrow mb-1">Based in</p>
              <p className="text-bone">{startup.location || founder.location}</p>
            </div>
          )}
          {startup.teamSize != null && (
            <div>
              <p className="eyebrow mb-1">Team</p>
              <p className="text-bone">{startup.teamSize}</p>
            </div>
          )}
          {startup.foundedYear && (
            <div>
              <p className="eyebrow mb-1">Founded</p>
              <p className="text-bone">{startup.foundedYear}</p>
            </div>
          )}
          {startup.website && (
            <div>
              <p className="eyebrow mb-1">Website</p>
              <a href={startup.website} target="_blank" rel="noreferrer" className="text-amber-300 hover:underline">
                {startup.website.replace(/^https?:\/\//, '')} ↗
              </a>
            </div>
          )}
        </div>
      </header>

      <div className="wrap grid gap-14 py-14 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section>
          <h2 className="display-face text-3xl tracking-tight">About</h2>
          {startup.description ? (
            <p className="mt-5 whitespace-pre-line text-lede text-mute">{startup.description}</p>
          ) : (
            <p className="mt-5 text-mute">{founder.name} hasn’t written a longer description yet.</p>
          )}
        </section>

        <section>
          <h2 className="display-face text-3xl tracking-tight">Updates</h2>
          {updates.length === 0 ? (
            <div className="mt-5">
              <EmptyState title="No updates yet" hint="Progress notes will show up here as they’re posted." />
            </div>
          ) : (
            <ol className="mt-5 space-y-6">
              {updates.map((u) => (
                <li key={u.id} className="border-l border-line/15 pl-5">
                  <p className="text-xs text-mute">{timeAgo(u.createdAt)}</p>
                  <p className="mt-1 font-medium text-bone">{u.title}</p>
                  {u.body && <p className="mt-1 text-sm text-mute">{u.body}</p>}
                </li>
              ))}
            </ol>
          )}
          {page.memberSince && <p className="mt-8 text-xs text-mute">On STUDLYF since {formatDate(page.memberSince)}</p>}
        </section>
      </div>
    </article>
  )
}
