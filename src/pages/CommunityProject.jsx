import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { useCommunityProject, useBuilderProfile } from '../lib/queries'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { Badge, Tag, Avatar, Spinner } from '../components/ui/atoms'
import { Button, ArrowIcon } from '../components/ui/Button'
import { UpvoteButton, categoryLabel } from '../components/ui/cards'
import { DetailSection, MediaGallery, MetaList } from '../components/detail/sections'
import { formatDate, titleCase } from '../lib/format'
import { EASE } from '../lib/motion'
import { NotFoundInline } from './NotFound'

const LINK_LABELS = { repo: 'Source code', demo: 'Live demo', video: 'Video', website: 'Website' }

export default function CommunityProject() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { isAuthed, isBuilder } = useAuth()
  const { data: project, isLoading, isError, error } = useCommunityProject(slug)
  const { data: myProfile } = useBuilderProfile(isBuilder)

  if (isLoading) {
    return (
      <div className="grid min-h-[100svh] place-items-center">
        <Spinner className="h-8 w-8 text-acid" />
      </div>
    )
  }
  if (isError && error?.status === 404) return <NotFoundInline kind="project" backTo="/community" />
  if (isError || !project) return <NotFoundInline kind="project" backTo="/community" />

  const isOwner = !!myProfile && project.author?.username === myProfile.username
  const links = Object.entries(project.links || {}).filter(([, url]) => !!url)

  // The stack the author typed ("React Native") is shown as written; the tag filter needs the
  // facet spelling the server derives ("react-native"), so mine both from the same list.
  const technologies = project.technologies ?? []
  const stack = technologies.length
    ? technologies.map((name) => ({ name, slug: facetOf(name) }))
    : (project.tags ?? []).map((name) => ({ name, slug: name }))
  const buildRange = dateRange(project.startDate, project.endDate)
  const media = project.media ?? []

  const upvote = async () => {
    try {
      const { data: result } = await api.upvoteProject(project.id)
      qc.setQueryData(['community-project', slug], (old) =>
        old ? { ...old, upvoted: result.upvoted, upvoteCount: result.upvoteCount } : old,
      )
      qc.invalidateQueries({ queryKey: ['community-projects'] })
      qc.invalidateQueries({ queryKey: ['community-leaderboard'] })
    } catch {
      qc.invalidateQueries({ queryKey: ['community-project', slug] })
    }
  }

  return (
    <article className="pb-32">
      <div className="relative">
        <div className="relative h-[38vh] min-h-[300px] w-full overflow-hidden md:h-[50vh]">
          {project.coverImage?.url ? (
            <img src={project.coverImage.url} alt={project.coverImage.alt || ''} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-violet/30 via-ink2 to-ink" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
        </div>

        <div className="wrap relative -mt-24 md:-mt-28">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
            <Link to="/community" className="mb-6 inline-flex items-center gap-2 text-sm text-mute hover:text-bone">
              <ArrowIcon className="rotate-180" /> All projects
            </Link>
            <div className="mb-5 flex flex-wrap items-center gap-2.5">
              <Badge tone="violet">{categoryLabel(project.category)}</Badge>
              {project.publishedAt && <span className="text-sm text-mute">{formatDate(project.publishedAt)}</span>}
            </div>
            <h1 className="display-face max-w-4xl text-balance text-huge">{project.title}</h1>
            {project.tagline && <p className="mt-4 max-w-2xl text-lede text-mute">{project.tagline}</p>}
          </motion.div>
        </div>
      </div>

      <div className="wrap mt-12 grid gap-12 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-10">
          <DetailSection>
            {project.description ? (
              <div className="prose-editorial" dangerouslySetInnerHTML={{ __html: project.description }} />
            ) : (
              <p className="text-mute">No write-up yet.</p>
            )}
          </DetailSection>

          {project.problemStatement ? (
            <DetailSection eyebrow="What it addresses" title="Problem">
              <div className="prose-editorial" dangerouslySetInnerHTML={{ __html: project.problemStatement }} />
            </DetailSection>
          ) : null}

          {project.solution ? (
            <DetailSection eyebrow="How it works" title="Solution">
              <div className="prose-editorial" dangerouslySetInnerHTML={{ __html: project.solution }} />
            </DetailSection>
          ) : null}

          {project.impact ? (
            <DetailSection eyebrow="What changed" title="Impact">
              <div className="prose-editorial" dangerouslySetInnerHTML={{ __html: project.impact }} />
            </DetailSection>
          ) : null}

          {media.length > 0 ? (
            <DetailSection eyebrow="Screens" title="Gallery">
              <MediaGallery media={media} />
            </DetailSection>
          ) : null}

          {stack.length > 0 ? (
            <DetailSection eyebrow="Built with" title="Tech stack">
              <div className="flex flex-wrap gap-2">
                {stack.map((t) => (
                  <Link key={t.slug} to={`/community?tag=${encodeURIComponent(t.slug)}`}>
                    <Tag className="px-3 py-1.5 text-sm hover:!text-bone">{t.name}</Tag>
                  </Link>
                ))}
              </div>
            </DetailSection>
          ) : null}

          {project.teamName ? (
            <DetailSection eyebrow="Team" title="Built by">
              <div className="card-surface flex flex-wrap items-center gap-4 p-5">
                <Avatar src={project.author?.photo?.url} name={project.teamName} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="text-lg text-bone">{project.teamName}</p>
                  {project.author?.username && (
                    <Link to={`/builders/${project.author.username}`} className="text-sm text-mute hover:text-acid">
                      @{project.author.username}
                    </Link>
                  )}
                </div>
              </div>
            </DetailSection>
          ) : null}

          {project.skills?.length > 0 && (
            <DetailSection eyebrow="Skills" title="What it took">
              <div className="flex flex-wrap gap-2">
                {project.skills.map((s) => (
                  <Link key={s.slug} to={`/community?tag=${encodeURIComponent(s.slug)}`}>
                    <Tag className="px-3 py-1.5 text-sm hover:!text-bone">{s.name}</Tag>
                  </Link>
                ))}
              </div>
            </DetailSection>
          )}
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="card-surface p-6">
            {project.author?.username && (
              <Link to={`/builders/${project.author.username}`} className="flex items-center gap-3 hover:text-bone">
                <Avatar src={project.author.photo?.url} name={project.author.username} size={44} />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-bone">@{project.author.username}</span>
                  {project.author.headline && <span className="block truncate text-sm text-mute">{project.author.headline}</span>}
                </span>
              </Link>
            )}

            <div className="mt-6 flex items-center gap-3">
              {isAuthed && !isOwner && (
                <UpvoteButton count={project.upvoteCount} upvoted={project.upvoted} onClick={upvote} />
              )}
              {(isOwner || !isAuthed) && (
                <span className="inline-flex items-center gap-1.5 text-sm text-mute">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path d="M8 3l5 6H3l5-6Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                  </svg>
                  {project.upvoteCount} upvote{project.upvoteCount === 1 ? '' : 's'}
                </span>
              )}
            </div>

            <MetaList
              className="mt-6 border-t border-line/10 pt-6"
              items={[
                project.projectType && { label: 'Type', value: titleCase(project.projectType) },
                project.category && { label: 'Category', value: categoryLabel(project.category) },
                buildRange && { label: 'Built', value: buildRange },
                project.completedAt && { label: 'Completed', value: formatDate(project.completedAt) },
                project.publishedAt && { label: 'Published', value: formatDate(project.publishedAt) },
              ]}
            />

            {links.length > 0 && (
              <div className="mt-6 space-y-2 border-t border-line/10 pt-6">
                {links.map(([key, url]) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between text-sm text-mute hover:text-acid"
                  >
                    {LINK_LABELS[key] || key} <ArrowIcon className="h-4 w-4 -rotate-45" />
                  </a>
                ))}
              </div>
            )}

            {isOwner && (
              <div className="mt-6 flex gap-3 border-t border-line/10 pt-6">
                <Button to={`/community/${project.slug}/edit`} variant="outline" size="sm" magnetic={false}>
                  Edit
                </Button>
                <DeleteButton id={project.id} onDone={() => navigate('/community/mine', { replace: true })} qc={qc} />
              </div>
            )}
          </div>
        </aside>
      </div>
    </article>
  )
}

/** "React Native" → "react-native" — the same facet spelling the server derives in `tagify`. */
const facetOf = (name) => String(name).trim().toLowerCase().replace(/\s+/g, '-')

const dateRange = (from, to) => {
  const a = formatDate(from)
  const b = formatDate(to)
  if (a && b) return `${a} → ${b}`
  return a || b || null
}

function DeleteButton({ id, onDone, qc }) {
  const remove = async () => {
    if (!window.confirm('Delete this project? This cannot be undone.')) return
    try {
      await api.deleteProject(id)
      qc.invalidateQueries({ queryKey: ['community-projects'] })
      qc.invalidateQueries({ queryKey: ['community-my-projects'] })
      onDone()
    } catch {
      /* surfaced by navigation staying put */
    }
  }
  return (
    <button onClick={remove} className="text-sm text-flare hover:underline">
      Delete
    </button>
  )
}
