import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useProjectBrief } from '../lib/queries'
import { Badge, Tag, Spinner } from '../components/ui/atoms'
import { ArrowIcon, Button } from '../components/ui/Button'
import { categoryLabel } from '../components/ui/cards'
import { titleCase } from '../lib/format'
import { EASE } from '../lib/motion'
import { NotFoundInline } from './NotFound'

export default function ProjectBriefDetail() {
  const { slug } = useParams()
  const { data: b, isLoading, isError } = useProjectBrief(slug)

  if (isLoading) {
    return (
      <div className="grid min-h-[100svh] place-items-center">
        <Spinner className="h-8 w-8 text-acid" />
      </div>
    )
  }
  if (isError || !b) return <NotFoundInline kind="project brief" backTo="/project-briefs" />

  return (
    <article className="pb-32 pt-36 md:pt-44">
      <div className="wrap max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
          <Link to="/project-briefs" className="mb-6 inline-flex items-center gap-2 text-sm text-mute hover:text-bone">
            <ArrowIcon className="rotate-180" /> All briefs
          </Link>
          <div className="mb-5 flex flex-wrap items-center gap-2.5">
            <Badge tone="violet">{categoryLabel(b.category)}</Badge>
            <Badge tone="open">{titleCase(b.difficulty)}</Badge>
            {b.featured && <Badge tone="open">Featured</Badge>}
            {b.estimatedHours ? <span className="text-sm text-mute">~{b.estimatedHours}h to build</span> : null}
          </div>
          <h1 className="display-face text-balance text-huge">{b.title}</h1>
          {b.summary && <p className="mt-5 text-lede text-bone/90">{b.summary}</p>}

          {b.starterUrl && (
            <div className="mt-8">
              <Button href={b.starterUrl} magnetic={false}>
                Get the starter <ArrowIcon />
              </Button>
            </div>
          )}
        </motion.div>

        {b.thumbnail?.url && (
          <div className="mt-10 aspect-[16/9] overflow-hidden rounded-2xl">
            <img src={b.thumbnail.url} alt={b.thumbnail.alt || ''} className="h-full w-full object-cover" />
          </div>
        )}

        {b.deliverables?.length > 0 && (
          <div className="mt-10 rounded-2xl border border-line/10 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-mute">What "done" looks like</h2>
            <ul className="mt-4 space-y-2.5">
              {b.deliverables.map((d, i) => (
                <li key={i} className="flex items-start gap-3 text-bone/90">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-acid" aria-hidden />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {b.description && (
          <div className="prose-editorial mt-10" dangerouslySetInnerHTML={{ __html: b.description }} />
        )}

        {b.skills?.length > 0 && (
          <div className="mt-12 flex flex-wrap gap-2 border-t border-line/10 pt-8">
            {b.skills.map((s) => (
              <Tag key={s.slug} className="px-3 py-1.5 text-sm">
                {s.name}
              </Tag>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
