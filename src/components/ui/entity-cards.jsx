import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Badge, Tag, Avatar } from './atoms'
import { TiltCard } from './3d-card'
import { SaveButton } from './SaveButton'
import {
  OpportunityCard,
  JobCard,
  ResourceCard,
  CourseCard,
  StudhubCard,
  MockDrillCard,
  ProjectBriefCard,
  ProjectCard,
} from './cards'
import { EASE } from '../../lib/motion'
import { titleCase } from '../../lib/format'

/**
 * Result cards for the entities unified search reaches (spec §56) and the saved list reuses
 * (spec §57) — one card shape per entity, so a builder or a startup reads identically wherever
 * it surfaces. `href` comes from the caller: the registry builds it from the document, so a
 * saved row can never point at a dead URL after a slug change.
 */

function CardShell({ children, index = 0 }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: EASE, delay: Math.min(index * 0.05, 0.3) }}
      className="group"
    >
      <TiltCard className="h-full" max={8}>
        <div className="card-surface flex h-full flex-col p-5 transition-all duration-500 ease-editorial hover:-translate-y-1 hover:border-line/20">
          {children}
        </div>
      </TiltCard>
    </motion.article>
  )
}

export function BuilderCard({ item, href, index = 0, entityId }) {
  return (
    <CardShell index={index}>
      <div className="flex items-center gap-3">
        <Avatar src={item.profilePhoto?.url} name={item.name || item.username} size={44} />
        <div className="min-w-0">
          <Link to={href} className="block truncate font-semibold tracking-tight text-bone group-hover:text-acid">
            {item.name || `@${item.username}`}
          </Link>
          <span className="truncate text-sm text-mute">@{item.username}</span>
        </div>
      </div>

      {item.headline && <p className="mt-4 line-clamp-2 text-sm text-mute">{item.headline}</p>}

      {item.skills?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.skills.map((s) => (
            <Tag key={s.slug}>{s.name}</Tag>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <span className="truncate text-sm text-mute">{item.location || 'Location private'}</span>
        <SaveButton entityType="BUILDER" entityId={entityId} />
      </div>
    </CardShell>
  )
}

export function FounderCard({ item, href, index = 0, entityId }) {
  const s = item.startup ?? {}
  return (
    <CardShell index={index}>
      <div className="flex flex-wrap items-center gap-2">
        {s.industry && <Badge tone="violet">{s.industry}</Badge>}
        {s.stage && <Badge tone="neutral">{titleCase(s.stage)}</Badge>}
      </div>

      <Link to={href} className="mt-4 block">
        <h3 className="text-balance text-lg font-semibold leading-tight tracking-tight text-bone group-hover:text-acid">
          {s.name || item.name}
        </h3>
      </Link>
      {s.oneLiner && <p className="mt-2 line-clamp-2 text-sm text-mute">{s.oneLiner}</p>}

      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <span className="truncate text-sm text-mute">
          {item.name}
          {s.location ? ` · ${s.location}` : ''}
        </span>
        <SaveButton entityType="FOUNDER" entityId={entityId} />
      </div>
    </CardShell>
  )
}

export function OrganizationCard({ item, href, index = 0, entityId }) {
  return (
    <CardShell index={index}>
      <div className="flex items-center gap-3">
        <Avatar src={item.logo?.url} name={item.name} size={44} />
        <div className="min-w-0">
          <Link to={href} className="block truncate font-semibold tracking-tight text-bone group-hover:text-acid">
            {item.name}
          </Link>
          <span className="text-sm text-mute">{item.city || titleCase(item.type)}</span>
        </div>
      </div>

      <div className="mt-4">
        <Badge tone="neutral">{titleCase(item.type)}</Badge>
      </div>
      {item.description && <p className="mt-3 line-clamp-3 text-sm text-mute">{item.description}</p>}

      <div className="mt-auto flex items-center justify-end pt-5">
        <SaveButton entityType="ORGANIZATION" entityId={entityId} />
      </div>
    </CardShell>
  )
}

/** A saved STUD OTT title or roadmap template — neither has a card of its own elsewhere. */
export function SimpleEntityCard({ item, href, index = 0, entityId, entityType, badge }) {
  return (
    <CardShell index={index}>
      {badge && (
        <div className="mb-4">
          <Badge tone="neutral">{badge}</Badge>
        </div>
      )}
      <Link to={href} className="block">
        <h3 className="text-balance text-lg font-semibold leading-tight tracking-tight text-bone group-hover:text-acid">
          {item.title || item.role}
        </h3>
      </Link>
      {item.summary && <p className="mt-2 line-clamp-3 text-sm text-mute">{item.summary}</p>}
      <div className="mt-auto flex items-center justify-end pt-5">
        <SaveButton entityType={entityType} entityId={entityId} />
      </div>
    </CardShell>
  )
}

/** The community project card plus the bookmark the shared card has no slot for. */
export function ProjectResultCard({ item, entityId, index = 0 }) {
  return (
    <div className="flex h-full flex-col gap-3">
      <ProjectCard project={item} index={index} />
      <div className="flex justify-end">
        <SaveButton entityType="PROJECT" entityId={entityId} />
      </div>
    </div>
  )
}

const CONTENT_CARDS = {
  OPPORTUNITY: { Card: OpportunityCard, prop: 'opp' },
  JOB: { Card: JobCard, prop: 'job' },
  RESOURCE: { Card: ResourceCard, prop: 'resource' },
  COURSE: { Card: CourseCard, prop: 'course' },
  STUDHUB: { Card: StudhubCard, prop: 'benefit' },
  MOCK_DRILL: { Card: MockDrillCard, prop: 'drill' },
  PROJECT_BRIEF: { Card: ProjectBriefCard, prop: 'brief' },
}

/**
 * Renders one saved row (`{entityType, entityId, href, item}`) as the entity's own card. The
 * eight content types reuse their listing card verbatim; the four search-only entities use the
 * cards above.
 */
export function SavedEntityCard({ row, index = 0 }) {
  const { entityType, entityId, href, item } = row
  const content = CONTENT_CARDS[entityType]
  if (content) return <content.Card {...{ [content.prop]: item }} index={index} />
  if (entityType === 'PROJECT') return <ProjectResultCard item={item} entityId={entityId} index={index} />
  if (entityType === 'BUILDER') return <BuilderCard item={item} href={href} entityId={entityId} index={index} />
  if (entityType === 'FOUNDER') return <FounderCard item={item} href={href} entityId={entityId} index={index} />
  if (entityType === 'ORGANIZATION') return <OrganizationCard item={item} href={href} entityId={entityId} index={index} />
  if (entityType === 'OTT') return <SimpleEntityCard item={item} href={href} entityId={entityId} entityType="OTT" badge="STUD OTT" index={index} />
  return <SimpleEntityCard item={item} href={href} entityId={entityId} entityType="ROADMAP" badge="Career roadmap" index={index} />
}
