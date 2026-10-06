import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useStudhubBenefit } from '../lib/queries'
import { Badge, Tag, Spinner } from '../components/ui/atoms'
import { ArrowIcon, Button } from '../components/ui/Button'
import { titleCase, formatDate, relativeDeadline, deadlineUrgency } from '../lib/format'
import { EASE } from '../lib/motion'
import { NotFoundInline } from './NotFound'

const CLAIM_LABEL = { SCHOLARSHIP: 'Apply', DISCOUNT: 'Redeem discount', PERK: 'Claim perk' }

export default function StudhubBenefit() {
  const { slug } = useParams()
  const { data: b, isLoading, isError } = useStudhubBenefit(slug)

  if (isLoading) {
    return (
      <div className="grid min-h-[100svh] place-items-center">
        <Spinner className="h-8 w-8 text-acid" />
      </div>
    )
  }
  if (isError || !b) return <NotFoundInline kind="benefit" backTo="/studhub" />

  const urgency = b.deadline ? deadlineUrgency(b.deadline) : null

  return (
    <article className="pb-32 pt-36 md:pt-44">
      <div className="wrap max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
          <Link to="/studhub" className="mb-6 inline-flex items-center gap-2 text-sm text-mute hover:text-bone">
            <ArrowIcon className="rotate-180" /> All benefits
          </Link>
          <div className="mb-5 flex flex-wrap items-center gap-2.5">
            <Badge tone="violet">{titleCase(b.type)}</Badge>
            {b.featured && <Badge tone="open">Featured</Badge>}
            {b.provider && <span className="text-sm text-mute">{b.provider}</span>}
          </div>
          <h1 className="display-face text-balance text-huge">{b.title}</h1>
          {b.summary && <p className="mt-5 text-lede text-bone/90">{b.summary}</p>}

          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
            {b.offer && (
              <span className="rounded-full border border-acid/40 bg-acid/10 px-3 py-1.5 font-medium text-acid">
                {b.offer}
              </span>
            )}
            {b.deadline && (
              <Badge tone={urgency === 'urgent' ? 'urgent' : urgency === 'soon' ? 'soon' : 'open'}>
                {relativeDeadline(b.deadline) || formatDate(b.deadline)}
              </Badge>
            )}
          </div>

          {b.claimUrl && (
            <div className="mt-8">
              <Button href={b.claimUrl} magnetic={false}>
                {CLAIM_LABEL[b.type] || 'Claim'} <ArrowIcon />
              </Button>
            </div>
          )}
        </motion.div>

        {b.thumbnail?.url && (
          <div className="mt-10 aspect-[16/9] overflow-hidden rounded-2xl">
            <img src={b.thumbnail.url} alt={b.thumbnail.alt || ''} className="h-full w-full object-cover" />
          </div>
        )}

        {b.eligibility && (
          <div className="mt-10 rounded-2xl border border-line/10 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-mute">Who qualifies</h2>
            <p className="mt-2 text-bone/90">{b.eligibility}</p>
          </div>
        )}

        {b.description && (
          <div className="prose-editorial mt-10" dangerouslySetInnerHTML={{ __html: b.description }} />
        )}

        {b.tags?.length > 0 && (
          <div className="mt-12 flex flex-wrap gap-2 border-t border-line/10 pt-8">
            {b.tags.map((t) => (
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
