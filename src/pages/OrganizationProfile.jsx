import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { usePublicOrganization } from '../lib/queries'
import { useSeo } from '../lib/seo'
import { formatDate, titleCase } from '../lib/format'
import { EASE } from '../lib/motion'
import { Avatar, Badge, EmptyState, Spinner } from '../components/ui/atoms'
import { Button, ArrowIcon } from '../components/ui/Button'
import { OpportunityCard } from '../components/ui/cards'
import { NotFoundInline } from './NotFound'

/**
 * Public organization profile (spec §82). Anyone can open a verified organization and see who
 * they are and what they run — no account needed. The API only ever resolves ACTIVE
 * organizations, so a pending or rejected one lands on the 404 exactly like a bad slug.
 */
export default function OrganizationProfile() {
  const { slug } = useParams()
  const { data: org, isLoading, isError, error } = usePublicOrganization(slug)

  useSeo({
    title: org ? `${org.name} | STUDLYF` : 'Organization | STUDLYF',
    description: org?.description || 'A verified organization running programs on STUDLYF.',
    path: `/organizations/${slug}`,
  })

  if (isLoading) {
    return (
      <div className="grid min-h-[100svh] place-items-center">
        <Spinner className="h-8 w-8 text-acid" />
      </div>
    )
  }
  if (isError && error?.status === 404) return <NotFoundInline kind="organization" backTo="/opportunities" />
  if (isError || !org) return <NotFoundInline kind="organization" backTo="/opportunities" />

  const programs = org.programs ?? []

  return (
    <article className="pb-28">
      <header className="wrap border-b border-line/10 pb-12 pt-36 md:pt-44">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar src={org.logo?.url} name={org.name} size={72} />
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone="violet">{titleCase(org.type)}</Badge>
              <Badge tone="open">Verified</Badge>
            </div>
            <motion.h1
              className="display-face text-balance text-mega"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE }}
            >
              {org.name}
            </motion.h1>
          </div>
        </div>

        {org.description && <p className="mt-6 max-w-2xl text-lede text-mute">{org.description}</p>}

        <dl className="mt-9 flex flex-wrap gap-x-10 gap-y-4 text-sm">
          {org.city && (
            <div>
              <dt className="eyebrow mb-1">Based in</dt>
              <dd className="text-bone">{org.city}</dd>
            </div>
          )}
          <div>
            <dt className="eyebrow mb-1">Programs</dt>
            <dd className="text-bone">{org.programCount}</dd>
          </div>
          {org.verifiedAt && (
            <div>
              <dt className="eyebrow mb-1">Verified</dt>
              <dd className="text-bone">{formatDate(org.verifiedAt)}</dd>
            </div>
          )}
          {org.website && (
            <div>
              <dt className="eyebrow mb-1">Website</dt>
              <dd>
                <a href={org.website} target="_blank" rel="noreferrer" className="text-amber-300 hover:underline">
                  {org.website.replace(/^https?:\/\//, '')} ↗
                </a>
              </dd>
            </div>
          )}
        </dl>
      </header>

      <section className="wrap py-14">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="display-face text-3xl tracking-tight">Open programs</h2>
          {org.programCount > programs.length && (
            <Link to="/opportunities" className="text-sm text-mute hover:text-bone">
              See all {org.programCount} →
            </Link>
          )}
        </div>

        {programs.length === 0 ? (
          <EmptyState
            title="Nothing open right now"
            hint={`${org.name} hasn’t published a program yet — check back soon.`}
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((opp, i) => (
              <OpportunityCard key={opp.id} opp={opp} index={i} />
            ))}
          </div>
        )}

        <div className="mt-16 flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-line/12 p-8">
          <div>
            <p className="display-face text-2xl tracking-tight">Want to run a program here?</p>
            <p className="mt-2 max-w-lg text-sm text-mute">
              Organizations on STUDLYF host hackathons, challenges and hiring programs for the builder
              community.
            </p>
          </div>
          <Button to="/organizations" magnetic={false}>
            Host a program <ArrowIcon />
          </Button>
        </div>
      </section>
    </article>
  )
}
