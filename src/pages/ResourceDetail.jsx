import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useResource } from '../lib/queries'
import { Badge, Tag, Spinner } from '../components/ui/atoms'
import { ArrowIcon, Button } from '../components/ui/Button'
import { titleCase, formatDate } from '../lib/format'
import { EASE } from '../lib/motion'
import { NotFoundInline } from './NotFound'

export default function ResourceDetail() {
  const { slug } = useParams()
  const { data: r, isLoading, isError } = useResource(slug)

  if (isLoading) {
    return (
      <div className="grid min-h-[100svh] place-items-center">
        <Spinner className="h-8 w-8 text-acid" />
      </div>
    )
  }
  if (isError || !r) return <NotFoundInline kind="resource" backTo="/resources" />

  return (
    <article className="pb-32 pt-36 md:pt-44">
      <div className="wrap max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
          <Link to="/resources" className="mb-6 inline-flex items-center gap-2 text-sm text-mute hover:text-bone">
            <ArrowIcon className="rotate-180" /> All resources
          </Link>
          <div className="mb-5 flex items-center gap-2.5">
            <Badge tone="violet">{titleCase(r.type)}</Badge>
            {r.publishedAt && <span className="text-sm text-mute">{formatDate(r.publishedAt)}</span>}
          </div>
          <h1 className="display-face text-balance text-huge">{r.title}</h1>
          {r.author?.name && <p className="mt-5 text-mute">By {r.author.name}</p>}
        </motion.div>

        {r.thumbnail?.url && (
          <div className="mt-10 aspect-[16/9] overflow-hidden rounded-2xl">
            <img src={r.thumbnail.url} alt={r.thumbnail.alt || ''} className="h-full w-full object-cover" />
          </div>
        )}

        {r.description && <p className="mt-10 text-lede text-bone/90">{r.description}</p>}

        {r.content ? (
          <div className="prose-editorial mt-8" dangerouslySetInnerHTML={{ __html: r.content }} />
        ) : r.externalUrl ? (
          <div className="mt-10">
            <Button href={r.externalUrl} magnetic={false}>
              {r.type === 'VIDEO' ? 'Watch' : 'Read'} on source <ArrowIcon />
            </Button>
          </div>
        ) : null}

        {r.tags?.length > 0 && (
          <div className="mt-12 flex flex-wrap gap-2 border-t border-line/10 pt-8">
            {r.tags.map((t) => (
              <Tag key={t.slug} className="px-3 py-1.5 text-sm">
                {t.name}
              </Tag>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
