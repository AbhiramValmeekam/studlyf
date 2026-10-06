import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Badge, Tag, Avatar } from './atoms'
import { TiltCard } from './3d-card'
import { titleCase, relativeDeadline, deadlineUrgency, formatDate, formatSalary } from '../../lib/format'
import { EASE } from '../../lib/motion'

function MediaImage({ media, className = '', fallbackLabel }) {
  if (media?.url) {
    return (
      <img
        src={media.url}
        alt={media.alt || ''}
        loading="lazy"
        className={`h-full w-full object-cover ${className}`}
      />
    )
  }
  return (
    <div className={`grid h-full w-full place-items-center bg-gradient-to-br from-ink3 to-ink2 ${className}`}>
      <span className="display-face text-4xl text-line/10">{fallbackLabel || 'STUDLYF'}</span>
    </div>
  )
}

export function OpportunityCard({ opp, index = 0 }) {
  const urgency = deadlineUrgency(opp.applicationDeadline)
  const isOpen = opp.applicationStatus === 'OPEN'

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: EASE, delay: Math.min(index * 0.05, 0.3) }}
      className="group"
    >
      <TiltCard className="h-full" max={8}>
        <Link
          to={`/opportunities/${opp.slug}`}
          className="card-surface flex h-full flex-col overflow-hidden transition-all duration-500 ease-editorial hover:-translate-y-1 hover:border-line/20"
        >
          <div className="relative aspect-[16/9] overflow-hidden">
            <div className="absolute inset-0 transition-transform duration-700 ease-editorial group-hover:scale-[1.04]">
              <MediaImage media={opp.banner} fallbackLabel={titleCase(opp.type)} />
            </div>
            <div className="absolute left-3 top-3 flex gap-2">
              <Badge tone="violet">{titleCase(opp.type)}</Badge>
              {opp.featured && <Badge tone="open">Featured</Badge>}
            </div>
          </div>

          <div className="flex flex-1 flex-col p-5">
            <div className="flex items-center gap-2.5">
              <Avatar src={opp.organization?.logo?.url} name={opp.organization?.name} size={26} />
              <span className="truncate text-sm text-mute">{opp.organization?.name}</span>
            </div>

            <h3 className="mt-3 text-balance text-lg font-semibold leading-tight tracking-tight text-bone">
              {opp.title}
            </h3>
            {opp.shortDescription && (
              <p className="mt-2 line-clamp-2 text-sm text-mute">{opp.shortDescription}</p>
            )}

            <div className="mt-auto flex items-center justify-between pt-5 text-sm">
              <span className="flex items-center gap-1.5 text-mute">
                <LocationDot />
                {titleCase(opp.mode)}
                {opp.location ? ` · ${opp.location}` : ''}
              </span>
              {isOpen ? (
                <Badge tone={urgency === 'urgent' ? 'urgent' : urgency === 'soon' ? 'soon' : 'open'}>
                  {relativeDeadline(opp.applicationDeadline) || 'Open'}
                </Badge>
              ) : (
                <Badge tone="closed">Closed</Badge>
              )}
            </div>
          </div>
        </Link>
      </TiltCard>
    </motion.article>
  )
}

/**
 * A published job post (spec §73). Same grammar as an opportunity card — banner, company line,
 * title, one-line summary, footer — so the two read as siblings while the footer carries what is
 * actually different about a job: the work mode, the compensation and whether it is still open.
 */
export function JobCard({ job, index = 0 }) {
  const isOpen = job.applicationStatus !== 'CLOSED'
  const urgency = deadlineUrgency(job.applicationDeadline)

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: EASE, delay: Math.min(index * 0.05, 0.3) }}
      className="group"
    >
      <TiltCard className="h-full" max={8}>
        <Link
          to={`/jobs/${job.slug}`}
          className="card-surface flex h-full flex-col overflow-hidden transition-all duration-500 ease-editorial hover:-translate-y-1 hover:border-line/20"
        >
          <div className="relative aspect-[16/9] overflow-hidden">
            <div className="absolute inset-0 transition-transform duration-700 ease-editorial group-hover:scale-[1.04]">
              <MediaImage media={job.banner} fallbackLabel={job.company?.name} />
            </div>
            <div className="absolute left-3 top-3 flex flex-wrap gap-2">
              <Badge tone="violet">{titleCase(job.employmentType)}</Badge>
              {job.featured && <Badge tone="open">Featured</Badge>}
            </div>
          </div>

          <div className="flex flex-1 flex-col p-5">
            <div className="flex items-center gap-2.5">
              <Avatar name={job.company?.name} size={26} />
              <span className="truncate text-sm text-mute">{job.company?.name}</span>
            </div>

            <h3 className="mt-3 text-balance text-lg font-semibold leading-tight tracking-tight text-bone">{job.title}</h3>
            {job.summary && <p className="mt-2 line-clamp-2 text-sm text-mute">{job.summary}</p>}

            <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-5 text-sm">
              <span className="flex items-center gap-1.5 text-mute">
                <LocationDot />
                {titleCase(job.workMode)}
                {job.location ? ` · ${job.location}` : ''}
              </span>
              <span className="text-mute">{formatSalary(job.salary)}</span>
              <span className="ml-auto">
                {isOpen ? (
                  <Badge tone={urgency === 'urgent' ? 'urgent' : urgency === 'soon' ? 'soon' : 'open'}>
                    {relativeDeadline(job.applicationDeadline) || 'Open'}
                  </Badge>
                ) : (
                  <Badge tone="closed">Closed</Badge>
                )}
              </span>
            </div>
          </div>
        </Link>
      </TiltCard>
    </motion.article>
  )
}

export function ResourceCard({ resource, index = 0 }) {
  const external = !!resource.externalUrl
  const to = external ? undefined : `/resources/${resource.slug}`

  const inner = (
    <>
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl">
        <div className="absolute inset-0 transition-transform duration-700 ease-editorial group-hover:scale-[1.04]">
          <MediaImage media={resource.thumbnail} fallbackLabel={titleCase(resource.type)} />
        </div>
        <div className="absolute left-3 top-3">
          <Badge>{titleCase(resource.type)}</Badge>
        </div>
      </div>
      <h3 className="mt-4 text-balance text-lg font-semibold leading-tight tracking-tight text-bone">
        {resource.title}
      </h3>
      {resource.description && <p className="mt-2 line-clamp-2 text-sm text-mute">{resource.description}</p>}
      <div className="mt-4 flex items-center justify-between text-sm text-mute">
        <span>{resource.author?.name || 'STUDLYF'}</span>
        {resource.publishedAt && <span>{formatDate(resource.publishedAt)}</span>}
      </div>
    </>
  )

  const cls =
    'group block rounded-2xl p-2 transition-colors duration-300 hover:bg-line/[0.03]'

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: EASE, delay: Math.min(index * 0.05, 0.3) }}
    >
      <TiltCard max={6}>
        {external ? (
          <a href={resource.externalUrl} target="_blank" rel="noreferrer" className={cls}>
            {inner}
          </a>
        ) : (
          <Link to={to} className={cls}>
            {inner}
          </Link>
        )}
      </TiltCard>
    </motion.article>
  )
}

// Display labels for the project categories (the raw enum is SCREAMING_SNAKE).
export const CATEGORY_LABELS = {
  WEB: 'Web',
  MOBILE: 'Mobile',
  AI_ML: 'AI / ML',
  BLOCKCHAIN: 'Blockchain',
  DEVTOOLS: 'DevTools',
  GAMING: 'Gaming',
  IOT: 'IoT',
  FINTECH: 'FinTech',
  HEALTHTECH: 'HealthTech',
  EDUCATION: 'Education',
  OTHER: 'Other',
}

export const categoryLabel = (c) => CATEGORY_LABELS[c] || titleCase(c)

export function UpvoteButton({ count = 0, upvoted, onClick, busy, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-pressed={!!upvoted}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-200 disabled:opacity-50 ${
        upvoted
          ? 'border-acid/50 bg-acid/15 text-acid'
          : 'border-line/15 text-mute hover:border-line/35 hover:text-bone'
      } ${className}`}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M8 3l5 6H3l5-6Z" fill={upvoted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
      {count}
    </button>
  )
}

export function ProjectCard({ project, index = 0, onUpvote, upvoting }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: EASE, delay: Math.min(index * 0.05, 0.3) }}
      className="group"
    >
      <TiltCard className="h-full" max={8}>
        <div className="card-surface flex h-full flex-col overflow-hidden transition-all duration-500 ease-editorial hover:-translate-y-1 hover:border-line/20">
          <Link to={`/community/${project.slug}`} className="block">
            <div className="relative aspect-[16/9] overflow-hidden">
              <div className="absolute inset-0 transition-transform duration-700 ease-editorial group-hover:scale-[1.04]">
                <MediaImage media={project.coverImage} fallbackLabel={categoryLabel(project.category)} />
              </div>
              <div className="absolute left-3 top-3">
                <Badge tone="violet">{categoryLabel(project.category)}</Badge>
              </div>
            </div>
          </Link>

          <div className="flex flex-1 flex-col p-5">
            <Link to={`/community/${project.slug}`}>
              <h3 className="text-balance text-lg font-semibold leading-tight tracking-tight text-bone group-hover:text-acid">
                {project.title}
              </h3>
            </Link>
            {project.tagline && <p className="mt-2 line-clamp-2 text-sm text-mute">{project.tagline}</p>}

            {project.tags?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {project.tags.slice(0, 4).map((t) => (
                  <Tag key={t}>#{t}</Tag>
                ))}
              </div>
            )}

            <div className="mt-auto flex items-center justify-between gap-3 pt-5">
              {project.author?.username ? (
                <Link
                  to={`/builders/${project.author.username}`}
                  className="flex min-w-0 items-center gap-2 text-sm text-mute hover:text-bone"
                >
                  <Avatar src={project.author.photo?.url} name={project.author.username} size={24} />
                  <span className="truncate">@{project.author.username}</span>
                </Link>
              ) : (
                <span className="text-sm text-mute">Anonymous</span>
              )}
              <UpvoteButton
                count={project.upvoteCount}
                upvoted={project.upvoted}
                busy={upvoting}
                onClick={(e) => {
                  e.preventDefault()
                  onUpvote?.(project)
                }}
              />
            </div>
          </div>
        </div>
      </TiltCard>
    </motion.article>
  )
}

// Course / learning-module card. `audience` (STUDENT vs COMPANY) and `level`
// drive the badges; COMPANY modules surface their provider, STUDENT tracks their role.
export function CourseCard({ course, index = 0 }) {
  const meta = course.audience === 'COMPANY' ? course.provider : course.role
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: EASE, delay: Math.min(index * 0.05, 0.3) }}
      className="group"
    >
      <TiltCard className="h-full" max={8}>
        <Link
          to={`/courses/${course.slug}`}
          className="card-surface flex h-full flex-col overflow-hidden transition-all duration-500 ease-editorial hover:-translate-y-1 hover:border-line/20"
        >
          <div className="relative aspect-[16/9] overflow-hidden">
            <div className="absolute inset-0 transition-transform duration-700 ease-editorial group-hover:scale-[1.04]">
              <MediaImage media={course.thumbnail} fallbackLabel={titleCase(course.level)} />
            </div>
            <div className="absolute left-3 top-3 flex gap-2">
              <Badge tone="violet">{titleCase(course.level)}</Badge>
              {course.featured && <Badge tone="open">Featured</Badge>}
            </div>
          </div>

          <div className="flex flex-1 flex-col p-5">
            {meta && <span className="truncate text-sm text-mute">{meta}</span>}
            <h3 className="mt-2 text-balance text-lg font-semibold leading-tight tracking-tight text-bone group-hover:text-acid">
              {course.title}
            </h3>
            {course.summary && <p className="mt-2 line-clamp-2 text-sm text-mute">{course.summary}</p>}

            {course.skills?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {course.skills.slice(0, 4).map((s) => (
                  <Tag key={s.slug}>{s.name}</Tag>
                ))}
              </div>
            )}

            <div className="mt-auto flex items-center gap-3 pt-5 text-sm text-mute">
              <span>{course.moduleCount} module{course.moduleCount === 1 ? '' : 's'}</span>
              <span aria-hidden>·</span>
              <span>{course.lessonCount} lesson{course.lessonCount === 1 ? '' : 's'}</span>
              {course.durationHours ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{course.durationHours}h</span>
                </>
              ) : null}
            </div>
          </div>
        </Link>
      </TiltCard>
    </motion.article>
  )
}

const STUDHUB_TONE = { SCHOLARSHIP: 'open', DISCOUNT: 'violet', PERK: 'soon' }

// STUDHub benefit card — scholarships, software discounts and student perks share
// this card; the `offer` headline (e.g. "Free for 1 year") is the focal point,
// with a deadline badge for time-boxed scholarships.
export function StudhubCard({ benefit, index = 0 }) {
  const urgency = benefit.deadline ? deadlineUrgency(benefit.deadline) : null
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: EASE, delay: Math.min(index * 0.05, 0.3) }}
      className="group"
    >
      <TiltCard className="h-full" max={8}>
        <Link
          to={`/studhub/${benefit.slug}`}
          className="card-surface flex h-full flex-col overflow-hidden transition-all duration-500 ease-editorial hover:-translate-y-1 hover:border-line/20"
        >
          <div className="relative aspect-[16/9] overflow-hidden">
            <div className="absolute inset-0 transition-transform duration-700 ease-editorial group-hover:scale-[1.04]">
              <MediaImage media={benefit.thumbnail} fallbackLabel={titleCase(benefit.type)} />
            </div>
            <div className="absolute left-3 top-3 flex gap-2">
              <Badge tone={STUDHUB_TONE[benefit.type] || 'violet'}>{titleCase(benefit.type)}</Badge>
              {benefit.featured && <Badge tone="open">Featured</Badge>}
            </div>
            {benefit.offer && (
              <div className="absolute bottom-3 right-3 rounded-full bg-ink/80 px-3 py-1 text-sm font-medium text-bone backdrop-blur">
                {benefit.offer}
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col p-5">
            {benefit.provider && <span className="truncate text-sm text-mute">{benefit.provider}</span>}
            <h3 className="mt-2 text-balance text-lg font-semibold leading-tight tracking-tight text-bone group-hover:text-acid">
              {benefit.title}
            </h3>
            {benefit.summary && <p className="mt-2 line-clamp-2 text-sm text-mute">{benefit.summary}</p>}

            {benefit.tags?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {benefit.tags.slice(0, 4).map((t) => (
                  <Tag key={t.slug}>{t.name}</Tag>
                ))}
              </div>
            )}

            {benefit.deadline && (
              <div className="mt-auto flex items-center justify-end pt-5 text-sm">
                <Badge tone={urgency === 'urgent' ? 'urgent' : urgency === 'soon' ? 'soon' : 'open'}>
                  {relativeDeadline(benefit.deadline) || 'Open'}
                </Badge>
              </div>
            )}
          </div>
        </Link>
      </TiltCard>
    </motion.article>
  )
}

const LEVEL_TONE = { BEGINNER: 'open', INTERMEDIATE: 'soon', ADVANCED: 'urgent' }
const KIND_LABEL = { TEST: 'Test', INTERVIEW: 'Interview' }

// Mock drill card — timed TEST assessments and mock INTERVIEW sets share this card.
// The `kind` badge separates the two surfaces; a footer shows duration and (for
// tests) the question count so the time commitment is legible at a glance.
export function MockDrillCard({ drill, index = 0 }) {
  const meta = drill.role || drill.provider
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: EASE, delay: Math.min(index * 0.05, 0.3) }}
      className="group"
    >
      <TiltCard className="h-full" max={8}>
        <Link
          to={`/mock-drills/${drill.slug}`}
          className="card-surface flex h-full flex-col overflow-hidden transition-all duration-500 ease-editorial hover:-translate-y-1 hover:border-line/20"
        >
          <div className="relative aspect-[16/9] overflow-hidden">
            <div className="absolute inset-0 transition-transform duration-700 ease-editorial group-hover:scale-[1.04]">
              <MediaImage media={drill.thumbnail} fallbackLabel={KIND_LABEL[drill.kind] || titleCase(drill.kind)} />
            </div>
            <div className="absolute left-3 top-3 flex gap-2">
              <Badge tone="violet">{KIND_LABEL[drill.kind] || titleCase(drill.kind)}</Badge>
              <Badge tone={LEVEL_TONE[drill.level] || 'open'}>{titleCase(drill.level)}</Badge>
              {drill.featured && <Badge tone="open">Featured</Badge>}
            </div>
          </div>

          <div className="flex flex-1 flex-col p-5">
            {meta && <span className="truncate text-sm text-mute">{meta}</span>}
            <h3 className="mt-2 text-balance text-lg font-semibold leading-tight tracking-tight text-bone group-hover:text-acid">
              {drill.title}
            </h3>
            {drill.summary && <p className="mt-2 line-clamp-2 text-sm text-mute">{drill.summary}</p>}

            {drill.skills?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {drill.skills.slice(0, 4).map((s) => (
                  <Tag key={s.slug}>{s.name}</Tag>
                ))}
              </div>
            )}

            {(drill.durationMinutes || drill.questionCount) && (
              <div className="mt-auto flex items-center gap-3 pt-5 text-sm text-mute">
                {drill.durationMinutes ? <span>{drill.durationMinutes} min</span> : null}
                {drill.durationMinutes && drill.questionCount ? <span aria-hidden>·</span> : null}
                {drill.questionCount ? (
                  <span>{drill.questionCount} question{drill.questionCount === 1 ? '' : 's'}</span>
                ) : null}
              </div>
            )}
          </div>
        </Link>
      </TiltCard>
    </motion.article>
  )
}

// Project brief card — a build-ready challenge from the "Build A Project" catalog.
// The category + difficulty badges frame the scope; the footer shows the rough
// time-to-build so a builder can gauge commitment at a glance.
export function ProjectBriefCard({ brief, index = 0 }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: EASE, delay: Math.min(index * 0.05, 0.3) }}
      className="group"
    >
      <TiltCard className="h-full" max={8}>
        <Link
          to={`/project-briefs/${brief.slug}`}
          className="card-surface flex h-full flex-col overflow-hidden transition-all duration-500 ease-editorial hover:-translate-y-1 hover:border-line/20"
        >
          <div className="relative aspect-[16/9] overflow-hidden">
            <div className="absolute inset-0 transition-transform duration-700 ease-editorial group-hover:scale-[1.04]">
              <MediaImage media={brief.thumbnail} fallbackLabel={categoryLabel(brief.category)} />
            </div>
            <div className="absolute left-3 top-3 flex gap-2">
              <Badge tone="violet">{categoryLabel(brief.category)}</Badge>
              <Badge tone={LEVEL_TONE[brief.difficulty] || 'open'}>{titleCase(brief.difficulty)}</Badge>
              {brief.featured && <Badge tone="open">Featured</Badge>}
            </div>
          </div>

          <div className="flex flex-1 flex-col p-5">
            <h3 className="mt-1 text-balance text-lg font-semibold leading-tight tracking-tight text-bone group-hover:text-acid">
              {brief.title}
            </h3>
            {brief.summary && <p className="mt-2 line-clamp-2 text-sm text-mute">{brief.summary}</p>}

            {brief.skills?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {brief.skills.slice(0, 4).map((s) => (
                  <Tag key={s.slug}>{s.name}</Tag>
                ))}
              </div>
            )}

            {brief.estimatedHours ? (
              <div className="mt-auto flex items-center gap-3 pt-5 text-sm text-mute">
                <span>~{brief.estimatedHours}h to build</span>
              </div>
            ) : null}
          </div>
        </Link>
      </TiltCard>
    </motion.article>
  )
}

function LocationDot() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 14s5-4.2 5-8A5 5 0 0 0 3 6c0 3.8 5 8 5 8Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="6" r="1.6" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}
