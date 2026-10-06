import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useMockDrill } from '../lib/queries'
import { Badge, Tag, Spinner } from '../components/ui/atoms'
import { ArrowIcon, Button } from '../components/ui/Button'
import { titleCase } from '../lib/format'
import { EASE } from '../lib/motion'
import { NotFoundInline } from './NotFound'

const KIND_LABEL = { TEST: 'Test', INTERVIEW: 'Interview' }
const START_LABEL = { TEST: 'Start test', INTERVIEW: 'Start mock interview' }

export default function MockDrillDetail() {
  const { slug } = useParams()
  const { data: d, isLoading, isError } = useMockDrill(slug)

  if (isLoading) {
    return (
      <div className="grid min-h-[100svh] place-items-center">
        <Spinner className="h-8 w-8 text-acid" />
      </div>
    )
  }
  if (isError || !d) return <NotFoundInline kind="drill" backTo="/mock-drills" />

  const meta = d.role || d.provider

  return (
    <article className="pb-32 pt-36 md:pt-44">
      <div className="wrap max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
          <Link to="/mock-drills" className="mb-6 inline-flex items-center gap-2 text-sm text-mute hover:text-bone">
            <ArrowIcon className="rotate-180" /> All drills
          </Link>
          <div className="mb-5 flex flex-wrap items-center gap-2.5">
            <Badge tone="violet">{KIND_LABEL[d.kind] || titleCase(d.kind)}</Badge>
            <Badge tone="open">{titleCase(d.level)}</Badge>
            {d.featured && <Badge tone="open">Featured</Badge>}
            {meta && <span className="text-sm text-mute">{meta}</span>}
          </div>
          <h1 className="display-face text-balance text-huge">{d.title}</h1>
          {d.summary && <p className="mt-5 text-lede text-bone/90">{d.summary}</p>}

          {(d.durationMinutes || d.questionCount) && (
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-mute">
              {d.durationMinutes ? <span>{d.durationMinutes} min</span> : null}
              {d.durationMinutes && d.questionCount ? <span aria-hidden>·</span> : null}
              {d.questionCount ? (
                <span>{d.questionCount} question{d.questionCount === 1 ? '' : 's'}</span>
              ) : null}
            </div>
          )}

          {d.startUrl && (
            <div className="mt-8">
              <Button href={d.startUrl} magnetic={false}>
                {START_LABEL[d.kind] || 'Start'} <ArrowIcon />
              </Button>
            </div>
          )}
        </motion.div>

        {d.thumbnail?.url && (
          <div className="mt-10 aspect-[16/9] overflow-hidden rounded-2xl">
            <img src={d.thumbnail.url} alt={d.thumbnail.alt || ''} className="h-full w-full object-cover" />
          </div>
        )}

        {d.description && (
          <div className="prose-editorial mt-10" dangerouslySetInnerHTML={{ __html: d.description }} />
        )}

        {d.skills?.length > 0 && (
          <div className="mt-12 flex flex-wrap gap-2 border-t border-line/10 pt-8">
            {d.skills.map((s) => (
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
