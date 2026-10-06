import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useJob } from '../lib/queries'
import { Badge, Tag, Avatar, Spinner } from '../components/ui/atoms'
import { SaveButton } from '../components/ui/SaveButton'
import { Button, ArrowIcon } from '../components/ui/Button'
import { DetailSection, FaqList, MetaList, Timeline } from '../components/detail/sections'
import { titleCase, formatDate, formatSalary, relativeDeadline, deadlineUrgency } from '../lib/format'
import { EASE } from '../lib/motion'
import { NotFoundInline } from './NotFound'

const years = (min, max) => {
  if (min == null && max == null) return null
  if (min != null && max != null && min !== max) return `${min}–${max} years`
  return `${min ?? max}+ years`
}

/**
 * The public job page (spec §73). Its grammar is the opportunity detail page's — same hero,
 * same sections, same rail — because a builder should not have to learn a second reading pattern
 * for a job. What differs is the vocabulary: compensation in place of prizes, rounds in place of
 * stages, and an apply CTA that leaves STUDLYF when the employer uses their own ATS.
 */
export default function JobDetail() {
  const { slug } = useParams()
  const { data: job, isLoading, isError, error } = useJob(slug)

  if (isLoading) {
    return (
      <div className="grid min-h-[100svh] place-items-center">
        <Spinner className="h-8 w-8 text-acid" />
      </div>
    )
  }
  if (isError && error?.status === 404) return <NotFoundInline kind="job" backTo="/jobs" />
  if (isError || !job) return <NotFoundInline kind="job" backTo="/jobs" />

  const isOpen = job.applicationStatus === 'OPEN'
  const urgency = deadlineUrgency(job.applicationDeadline)
  const rounds = job.rounds ?? []
  const faqs = job.faqs ?? []
  const perks = job.perks ?? []
  const salary = formatSalary(job.salary)
  const experience = years(job.minExperienceYears, job.maxExperienceYears)

  const meta = [
    { label: 'Type', value: titleCase(job.employmentType) },
    { label: 'Mode', value: titleCase(job.workMode) },
    job.experienceLevel && { label: 'Seniority', value: titleCase(job.experienceLevel) },
    experience && { label: 'Experience', value: experience },
    job.location && { label: 'Location', value: job.location },
    job.openings > 1 && { label: 'Openings', value: String(job.openings) },
    { label: 'Salary', value: salary },
    { label: 'Applications close', value: formatDate(job.applicationDeadline) || 'Open until filled' },
    job.startDate && { label: 'Starts', value: formatDate(job.startDate) },
  ].filter(Boolean)

  return (
    <article className="pb-32">
      {/* Hero banner */}
      <div className="relative">
        <div className="relative h-[42vh] min-h-[340px] w-full overflow-hidden md:h-[56vh]">
          {job.banner?.url ? (
            <img src={job.banner.url} alt={job.banner.alt || ''} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-acid/25 via-ink2 to-ink" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
        </div>

        <div className="wrap relative -mt-28 md:-mt-32">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <Link to="/jobs" className="mb-6 inline-flex items-center gap-2 text-sm text-mute hover:text-bone">
              <ArrowIcon className="rotate-180" /> All jobs
            </Link>
            <div className="mb-5 flex flex-wrap items-center gap-2.5">
              <Badge tone="violet">{titleCase(job.employmentType)}</Badge>
              <Badge tone="neutral">{titleCase(job.workMode)}</Badge>
              {job.featured && <Badge tone="open">Featured</Badge>}
              {isOpen ? (
                <Badge tone={urgency === 'urgent' ? 'urgent' : urgency === 'soon' ? 'soon' : 'open'}>
                  {relativeDeadline(job.applicationDeadline) || 'Open'}
                </Badge>
              ) : (
                <Badge tone="closed">Closed</Badge>
              )}
              <SaveButton entityType="JOB" entityId={job.id} className="ml-auto" />
            </div>
            <h1 className="display-face max-w-4xl text-balance text-huge">{job.title}</h1>
            <div className="mt-6 flex items-center gap-3">
              <Avatar name={job.company?.name} size={40} />
              <span className="text-lg text-bone">{job.company?.name}</span>
              {job.company?.verified && (
                <Badge tone="neutral" className="ml-1">
                  Verified employer
                </Badge>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Body */}
      <div className="wrap mt-14 grid gap-12 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-10">
          {job.summary && <p className="text-lede text-bone/90">{job.summary}</p>}

          {job.description ? (
            <DetailSection eyebrow="The role" title="About the role">
              <div
                className="prose-editorial"
                // Backend sanitises this HTML on save (see API.md).
                dangerouslySetInnerHTML={{ __html: job.description }}
              />
            </DetailSection>
          ) : null}

          {job.responsibilities ? (
            <DetailSection eyebrow="Day to day" title="What you'll do">
              <div className="prose-editorial" dangerouslySetInnerHTML={{ __html: job.responsibilities }} />
            </DetailSection>
          ) : null}

          {job.requirements ? (
            <DetailSection eyebrow="The bar" title="What we're looking for">
              <div className="prose-editorial" dangerouslySetInnerHTML={{ __html: job.requirements }} />
            </DetailSection>
          ) : null}

          {perks.length > 0 && (
            <DetailSection eyebrow="Beyond the salary" title="Perks and benefits">
              <ul className="grid gap-3 sm:grid-cols-2">
                {perks.map((p, i) => (
                  <li key={`${p}-${i}`} className="flex items-start gap-3 rounded-xl border border-line/12 p-4">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-acid" />
                    <span className="text-sm text-bone">{p}</span>
                  </li>
                ))}
              </ul>
            </DetailSection>
          )}

          {rounds.length > 0 && (
            <DetailSection eyebrow="Process" title="Hiring rounds">
              <Timeline rounds={rounds} />
            </DetailSection>
          )}

          {faqs.length > 0 && (
            <DetailSection eyebrow="Questions" title="FAQ">
              <FaqList faqs={faqs} />
            </DetailSection>
          )}

          {job.skills?.length > 0 && (
            <DetailSection eyebrow="Skills" title="What you'll work with">
              <div className="flex flex-wrap gap-2">
                {job.skills.map((s) => (
                  <Tag key={s.slug} className="px-3 py-1.5 text-sm">
                    {s.name}
                  </Tag>
                ))}
              </div>
            </DetailSection>
          )}
        </div>

        {/* Sticky apply rail */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="card-surface p-6">
            <dl className="space-y-4">
              {meta.map((m) => (
                <div key={m.label} className="flex items-center justify-between gap-4 text-sm">
                  <dt className="text-mute">{m.label}</dt>
                  <dd className="text-right font-medium text-bone">{m.value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-6">
              <ApplyRail job={job} isOpen={isOpen} />
            </div>
            {job.category && (
              <p className="mt-4 text-center text-xs text-mute">
                in <span className="text-bone">{job.category.name}</span>
              </p>
            )}
          </div>

          {job.contactEmail && (
            <div className="mt-4">
              <MetaList items={[{ label: 'Questions?', value: job.contactEmail }]} />
            </div>
          )}
        </aside>
      </div>
    </article>
  )
}

/**
 * There is no in-product application flow for a job: the employer collects them. So the CTA is
 * either their own ATS or a mailto — never a button that pretends to submit something (§90).
 */
function ApplyRail({ job, isOpen }) {
  if (!isOpen) {
    return job.externalUrl ? (
      <Button href={job.externalUrl} className="w-full" variant="outline" magnetic={false}>
        View on the employer's site <ArrowIcon />
      </Button>
    ) : (
      <Button className="w-full" variant="outline" magnetic={false} disabled>
        Applications closed
      </Button>
    )
  }

  if (job.externalUrl) {
    return (
      <div className="space-y-3">
        <Button href={job.externalUrl} className="w-full" magnetic={false}>
          Apply now <ArrowIcon />
        </Button>
        <p className="text-center text-xs text-mute">Opens on the employer's site.</p>
      </div>
    )
  }

  if (job.contactEmail) {
    return (
      <div className="space-y-3">
        <Button href={`mailto:${job.contactEmail}`} className="w-full" magnetic={false}>
          Apply by email <ArrowIcon />
        </Button>
        <p className="text-center text-xs text-mute">Sends to {job.contactEmail}</p>
      </div>
    )
  }

  // A published job with no way to apply is a content gap, not a UI state to hide.
  return (
    <p className="rounded-xl border border-line/12 px-4 py-3 text-center text-xs text-mute">
      The employer has not added an application link. Check back shortly.
    </p>
  )
}
