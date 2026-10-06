import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useOpportunity } from '../lib/queries'
import { useAuth } from '../context/AuthContext'
import { api, ApiError } from '../lib/api'
import { Badge, Tag, Avatar, Spinner } from '../components/ui/atoms'
import { SaveButton } from '../components/ui/SaveButton'
import { Button, ArrowIcon } from '../components/ui/Button'
import { DetailSection, FaqList, MetaList, PrizeTable, Timeline } from '../components/detail/sections'
import { titleCase, formatDate, relativeDeadline, deadlineUrgency } from '../lib/format'
import { EASE } from '../lib/motion'
import { NotFoundInline } from './NotFound'

export default function OpportunityDetail() {
  const { slug } = useParams()
  const { data: opp, isLoading, isError, error } = useOpportunity(slug)

  if (isLoading) {
    return (
      <div className="grid min-h-[100svh] place-items-center">
        <Spinner className="h-8 w-8 text-acid" />
      </div>
    )
  }
  if (isError && error?.status === 404) return <NotFoundInline kind="opportunity" backTo="/opportunities" />
  if (isError || !opp) return <NotFoundInline kind="opportunity" backTo="/opportunities" />

  const isOpen = opp.applicationStatus === 'OPEN'
  const urgency = deadlineUrgency(opp.applicationDeadline)

  const meta = [
    { label: 'Type', value: titleCase(opp.type) },
    { label: 'Mode', value: titleCase(opp.mode) },
    opp.location && { label: 'Location', value: opp.location },
    { label: 'Deadline', value: formatDate(opp.applicationDeadline) || '—' },
    opp.startDate && { label: 'Starts', value: formatDate(opp.startDate) },
    opp.endDate && { label: 'Ends', value: formatDate(opp.endDate) },
  ].filter(Boolean)

  const rounds = opp.rounds ?? []
  const hasTimeline = rounds.length > 0 || (opp.timeline ?? []).length > 0
  const prizes = opp.prizes ?? []
  const faqs = opp.faqs ?? []
  const contact = opp.contact ?? {}
  const hasContact = !!(contact.name || contact.email || contact.phone || contact.website)
  const orgSlug = opp.organization?.slug

  return (
    <article className="pb-32">
      {/* Hero banner */}
      <div className="relative">
        <div className="relative h-[42vh] min-h-[340px] w-full overflow-hidden md:h-[56vh]">
          {opp.banner?.url ? (
            <img src={opp.banner.url} alt={opp.banner.alt || ''} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-violet/30 via-ink2 to-ink" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
        </div>

        <div className="wrap relative -mt-28 md:-mt-32">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <Link
              to="/opportunities"
              className="mb-6 inline-flex items-center gap-2 text-sm text-mute hover:text-bone"
            >
              <ArrowIcon className="rotate-180" /> All opportunities
            </Link>
            <div className="mb-5 flex flex-wrap items-center gap-2.5">
              <Badge tone="violet">{titleCase(opp.type)}</Badge>
              {opp.featured && <Badge tone="open">Featured</Badge>}
              {isOpen ? (
                <Badge tone={urgency === 'urgent' ? 'urgent' : urgency === 'soon' ? 'soon' : 'open'}>
                  {relativeDeadline(opp.applicationDeadline) || 'Open'}
                </Badge>
              ) : (
                <Badge tone="closed">Closed</Badge>
              )}
              <SaveButton entityType="OPPORTUNITY" entityId={opp.id} className="ml-auto" />
            </div>
            <h1 className="display-face max-w-4xl text-balance text-huge">{opp.title}</h1>
            <div className="mt-6 flex items-center gap-3">
              <Avatar src={opp.organization?.logo?.url} name={opp.organization?.name} size={40} />
              <span className="text-lg text-bone">{opp.organization?.name}</span>
              {opp.organization?.partner && (
                <Badge tone="neutral" className="ml-1">
                  Verified partner
                </Badge>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Body */}
      <div className="wrap mt-14 grid gap-12 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-10">
          {opp.shortDescription && <p className="text-lede text-bone/90">{opp.shortDescription}</p>}
          {opp.description ? (
            <div
              className="prose-editorial"
              // Backend sanitises this HTML on save (see API.md).
              dangerouslySetInnerHTML={{ __html: opp.description }}
            />
          ) : null}

          {opp.eligibility ? (
            <DetailSection eyebrow="Who can take part" title="Eligibility">
              <div className="prose-editorial" dangerouslySetInnerHTML={{ __html: opp.eligibility }} />
            </DetailSection>
          ) : null}

          {hasTimeline ? (
            <DetailSection eyebrow="Process" title="Stages and timelines">
              <Timeline
                rounds={rounds.length ? rounds : fallbackRounds(opp)}
                empty={
                  (opp.timeline ?? []).length ? (
                    <ul className="space-y-3">
                      {opp.timeline.map((t, i) => (
                        <li key={`${t.label}-${i}`} className="flex items-baseline justify-between gap-4 border-b border-line/10 pb-3">
                          <span className="text-bone">{t.label}</span>
                          <span className="shrink-0 text-sm text-mute">{formatDate(t.date) || '—'}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null
                }
              />
            </DetailSection>
          ) : null}

          {prizes.length || opp.prizeInformation ? (
            <DetailSection eyebrow="What you can win" title="Rewards and prizes">
              {prizes.length ? <PrizeTable prizes={prizes} /> : null}
              {opp.prizeInformation ? (
                <div className="prose-editorial mt-6" dangerouslySetInnerHTML={{ __html: opp.prizeInformation }} />
              ) : null}
            </DetailSection>
          ) : null}

          {opp.applicationQuestions?.length || opp.projectSubmissions?.acceptsProjects ? (
            <DetailSection eyebrow="Before you apply" title="How to apply">
              {opp.projectSubmissions?.acceptsProjects ? (
                <div className="mb-6 rounded-2xl border border-line/12 p-5">
                  <p className="font-medium text-bone">This program accepts project submissions</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {opp.projectSubmissions.requireRepository && <Tag>Repository required</Tag>}
                    {opp.projectSubmissions.requireDemo && <Tag>Live demo required</Tag>}
                    {opp.projectSubmissions.requireVideo && <Tag>Video required</Tag>}
                    {opp.projectSubmissions.minTeamSize && (
                      <Tag>
                        Team {opp.projectSubmissions.minTeamSize}
                        {opp.projectSubmissions.maxTeamSize ? `–${opp.projectSubmissions.maxTeamSize}` : '+'}
                      </Tag>
                    )}
                    {opp.projectSubmissions.deadline && <Tag>Due {formatDate(opp.projectSubmissions.deadline)}</Tag>}
                  </div>
                  {opp.projectSubmissions.guidelines && (
                    <div className="prose-editorial mt-4 text-sm" dangerouslySetInnerHTML={{ __html: opp.projectSubmissions.guidelines }} />
                  )}
                </div>
              ) : null}

              {opp.applicationQuestions?.length ? (
                <ol className="space-y-3">
                  {opp.applicationQuestions.map((q, i) => (
                    <li key={q.id ?? i} className="flex items-start gap-3">
                      <span className="mt-0.5 text-sm text-mute">{String(i + 1).padStart(2, '0')}</span>
                      <span className="text-bone">
                        {q.label}
                        {q.required && <span className="ml-2 text-xs text-flare">required</span>}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </DetailSection>
          ) : null}

          {faqs.length ? (
            <DetailSection eyebrow="Questions" title="FAQ">
              <FaqList faqs={faqs} />
            </DetailSection>
          ) : null}

          {orgSlug || hasContact ? (
            <DetailSection eyebrow="Organiser" title="About the organizer">
              <div className="card-surface flex flex-wrap items-center gap-4 p-5">
                <Avatar src={opp.organization?.logo?.url} name={opp.organization?.name} size={52} />
                <div className="min-w-0 flex-1">
                  <p className="text-lg text-bone">{opp.organization?.name}</p>
                  {opp.organization?.type && <p className="text-sm text-mute">{titleCase(opp.organization.type)}</p>}
                </div>
                {orgSlug && (
                  <Button to={`/organizations/${orgSlug}`} variant="outline" size="sm" magnetic={false}>
                    View organizer <ArrowIcon />
                  </Button>
                )}
              </div>
              {hasContact && (
                <div className="mt-5">
                  <MetaList
                    items={[
                      contact.name && { label: 'Contact', value: contact.designation ? `${contact.name} · ${contact.designation}` : contact.name },
                      contact.email && { label: 'Email', value: contact.email },
                      contact.phone && { label: 'Phone', value: contact.phone },
                      contact.website && { label: 'Website', value: contact.website },
                    ]}
                  />
                </div>
              )}
            </DetailSection>
          ) : null}

          {opp.skills?.length > 0 && (
            <DetailSection eyebrow="Skills" title="What you'll use">
              <div className="flex flex-wrap gap-2">
                {opp.skills.map((s) => (
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
              <ApplyRail opp={opp} isOpen={isOpen} />
            </div>
            {opp.category && (
              <p className="mt-4 text-center text-xs text-mute">
                in <span className="text-bone">{opp.category.name}</span>
              </p>
            )}
          </div>
        </aside>
      </div>
    </article>
  )
}

/** When a program has no explicit rounds, its own start/end dates are the timeline. */
function fallbackRounds(opp) {
  if (!opp.startDate && !opp.endDate) return []
  return [{ title: 'Program window', startsAt: opp.startDate, endsAt: opp.endDate, mode: opp.mode, location: opp.location }]
}

function ApplyRail({ opp, isOpen }) {
  const { isAuthed, isBuilder } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const apply = async () => {
    setBusy(true)
    setError(null)
    try {
      const { data } = await api.createApplication({ opportunityId: opp.id })
      navigate(`/builders/applications/${data.id}`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        navigate('/builders/applications')
      } else if (err instanceof ApiError && err.status === 400) {
        // No builder profile yet — send them to create one.
        navigate('/builders/profile')
      } else if (err instanceof ApiError) {
        setError(err.message)
      }
    } finally {
      setBusy(false)
    }
  }

  if (!isOpen) {
    return opp.externalUrl ? (
      <Button href={opp.externalUrl} className="w-full" variant="outline" magnetic={false}>
        View details <ArrowIcon />
      </Button>
    ) : (
      <Button className="w-full" variant="outline" magnetic={false} disabled>
        Applications closed
      </Button>
    )
  }

  return (
    <div className="space-y-3">
      {!isAuthed ? (
        <Button to="/login" className="w-full" magnetic={false}>
          Sign in to apply
        </Button>
      ) : !isBuilder ? (
        <Button to="/onboarding" className="w-full" magnetic={false}>
          Become a builder to apply
        </Button>
      ) : (
        <Button onClick={apply} className="w-full" magnetic={false} disabled={busy}>
          {busy ? <Spinner className="h-5 w-5" /> : <>Apply now <ArrowIcon /></>}
        </Button>
      )}
      {opp.externalUrl && (
        <a
          href={opp.externalUrl}
          target="_blank"
          rel="noreferrer"
          className="block text-center text-sm text-mute hover:text-bone"
        >
          Or apply on the organiser’s site →
        </a>
      )}
      {error && <p className="text-center text-sm text-flare">{error}</p>}
    </div>
  )
}
