import { motion } from 'framer-motion'
import { ECOSYSTEMS } from '../../lib/ecosystems'
import { formatDate } from '../../lib/format'
import { EASE } from '../../lib/motion'
import { Button, ArrowIcon } from '../ui/Button'
import { StatusPill } from './EcosystemSelector'

const COPY = {
  PENDING: {
    title: 'We’re verifying your request.',
    text: 'The STUDLYF team reviews every request before access is granted. You’ll get a notification as soon as it’s decided — most are answered within two working days.',
  },
  ACTIVE: { title: 'You’re verified.', text: 'Your access is active.' },
  REJECTED: {
    title: 'Your request wasn’t approved.',
    text: 'Read the note from our team below, update your details and resubmit — it goes straight back into review.',
  },
  SUSPENDED: {
    title: 'Access is suspended.',
    text: 'Your dashboard is locked while this is reviewed. Contact the STUDLYF team at support@studlyf.in if you think this is a mistake.',
  },
}

/**
 * VerificationGate status page for controlled ecosystems (investor, HR, organization). Shows the
 * server's state, the reviewer's note and the one next step that makes sense for that state.
 */
export function AccessStatus({ ecosystem, request, what, editHref, children }) {
  const e = ECOSYSTEMS[ecosystem]
  const status = request?.status ?? 'NONE'
  const copy = COPY[status]
  return (
    <div className="wrap max-w-3xl pb-24 pt-32 md:pt-40">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
        <p className="eyebrow mb-4 flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${e.accentBg}`} /> {what}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="display-face text-balance text-[clamp(2.2rem,5.5vw,4rem)] leading-[0.98] tracking-tight">{copy?.title ?? 'Not requested yet.'}</h1>
        </div>
        <div className="mt-4">
          <StatusPill status={status} />
        </div>
        <p className="mt-5 max-w-xl text-mute">{copy?.text ?? 'Start your request to use this ecosystem.'}</p>

        {request?.statusNote && (
          <div className="mt-6 rounded-2xl border border-line/15 bg-line/[0.04] p-5">
            <p className="eyebrow mb-2">Note from the STUDLYF team</p>
            <p className="text-bone">{request.statusNote}</p>
          </div>
        )}

        {request && (
          <dl className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="card-surface p-4">
              <dt className="text-xs text-mute">Submitted</dt>
              <dd className="text-bone">{formatDate(request.submittedAt) ?? '—'}</dd>
            </div>
            <div className="card-surface p-4">
              <dt className="text-xs text-mute">Last reviewed</dt>
              <dd className="text-bone">{formatDate(request.reviewedAt) ?? 'Not yet'}</dd>
            </div>
          </dl>
        )}
        {children}

        <div className="mt-10 flex flex-wrap gap-3">
          {status === 'ACTIVE' && (
            <Button to={e.home} magnetic={false}>
              Open {e.label} dashboard <ArrowIcon />
            </Button>
          )}
          {(status === 'PENDING' || status === 'REJECTED' || status === 'NONE') && editHref && (
            <Button to={editHref} variant={status === 'REJECTED' || status === 'NONE' ? 'primary' : 'outline'} magnetic={false}>
              {status === 'REJECTED' ? 'Update and resubmit' : status === 'NONE' ? 'Start request' : 'Edit request'}
            </Button>
          )}
          <Button to={e.landing} variant="ghost" magnetic={false}>
            About STUDLYF for {e.plural}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
