import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useBuilderDashboard } from '../../lib/queries'
import { api } from '../../lib/api'
import { titleCase, formatDate, timeAgo } from '../../lib/format'
import { EASE, inView } from '../../lib/motion'
import { Button } from '../../components/ui/Button'
import { ProductPage, Panel, Stat, QueryState, Notice } from '../../components/ecosystem/product'
import { OpportunityCard } from '../../components/ui/cards'
import { Badge } from '../../components/ui/atoms'

// The builder's home. Real data only — profile completion, applications, proof of work
// (projects, submissions, evaluations, achievements), notifications and recommended
// opportunities — in the STUDLYF dark editorial system with the builder `acid` accent.

const STATUS_TONE = {
  DRAFT: 'neutral', SUBMITTED: 'open', UNDER_REVIEW: 'soon',
  SHORTLISTED: 'violet', SELECTED: 'open', REJECTED: 'urgent', WITHDRAWN: 'closed',
}
const STATUS_ORDER = ['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'SELECTED', 'DRAFT', 'REJECTED', 'WITHDRAWN']

// Labels for the profile-completion check keys returned by the server (completion.js).
const MISSING_LABELS = {
  phone: 'Phone number', education: 'Education', links: 'Social links', location: 'Location',
  interests: 'Interests', photo: 'Profile photo', headline: 'Headline', bio: 'Bio (40+ chars)',
  skills: '3+ skills', availability: 'Availability',
}

// Per-type presentation for the live notification feed (see NOTIFICATION_TYPES on the server).
// `dot` colours the status pip; `tag` labels the source; `to` is the fallback destination when
// the notification carries no explicit data.path.
const NOTIF_META = {
  HR_INVITATION: { tag: 'Recruiter', dot: 'bg-acid', to: '/notifications' },
  APPLICATION_STATUS: { tag: 'Application', dot: 'bg-amber-300', to: '/builders/applications' },
  SUBMISSION_STATUS: { tag: 'Submission', dot: 'bg-violet', to: '/builders/applications' },
  EVALUATION_COMPLETED: { tag: 'Evaluation', dot: 'bg-acid', to: '/builders/achievements' },
  EVALUATION_ASSIGNED: { tag: 'Evaluation', dot: 'bg-line/40', to: '/builders/projects' },
  PROJECT_TEAM: { tag: 'Team', dot: 'bg-acid', to: '/builders/projects' },
  PROJECT_SUBMITTED: { tag: 'Project', dot: 'bg-line/40', to: '/builders/projects' },
  PROJECT_MODERATION: { tag: 'Moderation', dot: 'bg-line/40', to: '/builders/projects' },
  PROJECT_UPVOTE: { tag: 'Community', dot: 'bg-violet', to: '/community' },
  ACHIEVEMENT: { tag: 'Achievement', dot: 'bg-amber-300', to: '/builders/achievements' },
  ACCESS_STATUS: { tag: 'Access', dot: 'bg-line/40', to: '/notifications' },
  INVESTOR_CONNECTION: { tag: 'Investor', dot: 'bg-flare', to: '/notifications' },
  ORGANIZATION_MEMBER: { tag: 'Organization', dot: 'bg-line/40', to: '/notifications' },
  PROFILE_REMINDER: { tag: 'Profile', dot: 'bg-line/40', to: '/builders/profile' },
  SYSTEM: { tag: 'System', dot: 'bg-line/40', to: '/notifications' },
}
const notifMeta = (type) => NOTIF_META[type] || { tag: 'Update', dot: 'bg-line/40', to: '/notifications' }

function Reveal({ children, delay = 0, className = '' }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={inView}
      transition={{ duration: 0.55, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}

// Animated SVG completion ring — draws to `score` on scroll-in; static under reduced-motion.
function CompletionRing({ score = 0 }) {
  const reduce = useReducedMotion()
  const R = 52
  const CIRC = 2 * Math.PI * R
  const pct = Math.max(0, Math.min(100, score))
  const offset = CIRC * (1 - pct / 100)
  return (
    <div className="relative grid h-36 w-36 shrink-0 place-items-center">
      <svg viewBox="0 0 120 120" className="h-36 w-36 -rotate-90">
        <circle cx="60" cy="60" r={R} fill="none" strokeWidth="9" stroke="currentColor" className="text-line/10" />
        <motion.circle
          cx="60" cy="60" r={R} fill="none" strokeWidth="9" strokeLinecap="round"
          stroke="currentColor" className="text-acid"
          strokeDasharray={CIRC}
          initial={{ strokeDashoffset: reduce ? offset : CIRC }}
          whileInView={{ strokeDashoffset: offset }}
          viewport={inView}
          transition={{ duration: reduce ? 0 : 1.2, ease: EASE }}
        />
      </svg>
      <div className="absolute flex items-baseline">
        <span className="display-face text-4xl text-bone">{pct}</span>
        <span className="text-xl text-mute">%</span>
      </div>
    </div>
  )
}

// A compact labelled metric tile used in the proof-of-work grid.
function Metric({ label, value }) {
  return (
    <div className="rounded-xl border border-line/10 bg-white/[0.02] px-3 py-3 text-center transition-colors hover:border-line/20">
      <p className="display-face text-2xl text-bone">{value ?? 0}</p>
      <p className="mt-0.5 text-[11px] leading-tight text-mute">{label}</p>
    </div>
  )
}

// A tappable row for a project / submission with an optional status badge.
function ListRow({ to, label, sub, status }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-3 rounded-xl border border-line/10 bg-white/[0.02] px-3.5 py-3 transition-colors hover:border-line/25"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm text-bone">{label}</span>
        {sub && <span className="block truncate text-[11px] text-mute">{sub}</span>}
      </span>
      {status && <Badge tone={STATUS_TONE[status] || 'neutral'}>{titleCase(status)}</Badge>}
    </Link>
  )
}

// A small "Live" indicator — a softly pulsing accent pip that reassures the feed is
// auto-updating. `busy` swaps the label to "Updating…" during a background refetch.
function LivePip({ busy }) {
  const reduce = useReducedMotion()
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-mute">
      <span className="relative grid h-2 w-2 place-items-center">
        {!reduce && (
          <motion.span
            className="absolute inset-0 rounded-full bg-acid"
            animate={{ scale: [1, 2.4], opacity: [0.5, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        <span className="relative h-2 w-2 rounded-full bg-acid" />
      </span>
      {busy ? 'Updating…' : 'Live'}
    </span>
  )
}

// Prominent treatment for a company reaching out (HR_INVITATION). This is the moment the
// dashboard exists for, so it gets an accent card above the fold rather than a feed line.
function RecruiterCard({ n, onOpen }) {
  const company = n.data?.company || 'A verified company'
  const stage = n.data?.stage
  return (
    <motion.button
      type="button"
      onClick={() => onOpen(n)}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="group relative w-full overflow-hidden rounded-2xl border border-acid/30 bg-gradient-to-br from-acid/[0.12] to-transparent p-5 text-left transition-colors hover:border-acid/50"
    >
      <div aria-hidden className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-acid opacity-10 blur-2xl transition-opacity group-hover:opacity-20" />
      <div className="relative flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-acid/15 font-mono text-sm font-semibold text-acid ring-1 ring-acid/30">
          {(company[0] || 'C').toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="eyebrow text-acid">Recruiter interest</span>
            {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-acid" />}
          </div>
          <p className="mt-1 text-sm font-medium text-bone">{n.title}</p>
          {n.body && <p className="mt-1 text-xs text-mute">{n.body}</p>}
          <p className="mt-2 text-[11px] text-mute">{stage ? `${titleCase(stage)} · ` : ''}{timeAgo(n.createdAt)}</p>
        </div>
        <span className="shrink-0 self-center text-acid transition-transform group-hover:translate-x-0.5" aria-hidden>→</span>
      </div>
    </motion.button>
  )
}

// A tappable notification row for the live feed — marks itself read and routes on click.
function NotificationRow({ n, onOpen }) {
  const meta = notifMeta(n.type)
  return (
    <motion.button
      type="button"
      onClick={() => onOpen(n)}
      layout
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className={`flex w-full gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
        n.read ? 'border-transparent hover:border-line/15' : 'border-line/10 bg-white/[0.02] hover:border-line/25'
      }`}
    >
      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.read ? 'bg-line/30' : meta.dot}`} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={`truncate text-sm ${n.read ? 'text-mute' : 'text-bone'}`}>{n.title}</span>
        </span>
        {n.body && <span className="mt-0.5 block truncate text-[11px] text-mute">{n.body}</span>}
        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-mute">
          <span className="rounded bg-line/[0.08] px-1.5 py-0.5 text-[10px] uppercase tracking-wide">{meta.tag}</span>
          {timeAgo(n.createdAt)}
        </span>
      </span>
    </motion.button>
  )
}

// Animated count-up for the headline metrics — rolls from 0 to the real value once on
// mount; renders the final value instantly under reduced-motion.
function CountUp({ to = 0, suffix = '' }) {
  const reduce = useReducedMotion()
  const mv = useMotionValue(0)
  const rounded = useTransform(mv, (v) => Math.round(v))
  const [display, setDisplay] = useState(reduce ? to : 0)
  useEffect(() => {
    if (reduce) { setDisplay(to); return }
    const controls = animate(mv, to, { duration: 1.1, ease: EASE })
    const unsub = rounded.on('change', setDisplay)
    return () => { controls.stop(); unsub() }
  }, [to, reduce, mv, rounded])
  return <>{display}{suffix}</>
}

// The application journey — Applied → In review → Shortlisted → Selected. Counts are real and
// cumulative (applications.funnel): an application that has reached "Shortlisted" is still
// counted under "Applied", so each stage reads as "reached at least this far" and the numbers
// never fall as a builder advances. The track fills to the furthest stage reached and the
// leading node keeps a soft live pulse — this is where "I applied / I got shortlisted" shows up
// the instant the 25s poll (or a focus refetch) picks up the status change.
const PIPELINE = [
  { key: 'SUBMITTED', label: 'Applied' },
  { key: 'UNDER_REVIEW', label: 'In review' },
  { key: 'SHORTLISTED', label: 'Shortlisted' },
  { key: 'SELECTED', label: 'Selected' },
]

function ApplicationPipeline({ counts: byStage = {} }) {
  const reduce = useReducedMotion()
  const counts = PIPELINE.map((s) => byStage[s.key] || 0)
  const furthest = counts.reduce((acc, n, i) => (n > 0 ? i : acc), -1)
  const progress = furthest <= 0 ? 0 : furthest / (PIPELINE.length - 1)
  return (
    <div className="relative px-2 py-2">
      <div className="pointer-events-none absolute left-[12%] right-[12%] top-6 hidden h-0.5 -translate-y-1/2 sm:block">
        <div className="h-full w-full rounded-full bg-line/10" />
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-acid via-violet to-acid"
          style={{ width: `${progress * 100}%`, transformOrigin: 'left' }}
          initial={{ scaleX: reduce ? 1 : 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={inView}
          transition={{ duration: 1, ease: EASE, delay: 0.2 }}
        />
      </div>
      <div className="relative grid grid-cols-2 gap-y-6 sm:grid-cols-4">
        {PIPELINE.map((s, i) => {
          const count = counts[i]
          const active = i <= furthest
          const edge = i === furthest && furthest >= 0
          return (
            <div key={s.key} className="flex flex-col items-center gap-2 text-center">
              <div className={`relative grid h-12 w-12 place-items-center rounded-full border transition-colors ${active ? 'border-acid/50 bg-acid/10' : 'border-line/15 bg-white/[0.02]'}`}>
                {edge && !reduce && (
                  <motion.span
                    className="absolute inset-0 rounded-full border border-acid"
                    animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                  />
                )}
                <span className={`display-face text-lg ${active ? 'text-bone' : 'text-mute'}`}>{count}</span>
              </div>
              <span className={`text-xs ${active ? 'text-bone' : 'text-mute'}`}>{s.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Application/submission updates that are genuine wins (shortlist, selection, offer) — matched
// on the status the server sends plus the human title/body, so it works regardless of the exact
// data field name. These get a celebratory card above the fold, next to recruiter interest.
const APP_UPDATE_TYPES = new Set(['APPLICATION_STATUS', 'SUBMISSION_STATUS'])
const isAppUpdate = (n) => APP_UPDATE_TYPES.has(n.type)
const isWin = (n) => {
  const s = `${n.data?.status || n.data?.stage || ''} ${n.title || ''} ${n.body || ''}`.toLowerCase()
  return /shortlist|select|accept|offer|hired|congrat/.test(s)
}

// A celebratory milestone card for a shortlist/selection — the payoff moment the builder
// is waiting for, so it lands above the fold with an accent glow rather than in the feed.
function MilestoneCard({ n, onOpen }) {
  return (
    <motion.button
      type="button"
      onClick={() => onOpen(n)}
      layout
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="group relative w-full overflow-hidden rounded-2xl border border-violet/40 bg-gradient-to-br from-violet/[0.16] via-acid/[0.06] to-transparent p-5 text-left"
    >
      <div aria-hidden className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet opacity-20 blur-2xl transition-opacity group-hover:opacity-30" />
      <div className="relative flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet/20 ring-1 ring-violet/40">
          <svg className="h-5 w-5 text-violet-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.12" /><circle cx="12" cy="8" r="6" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <span className="eyebrow text-violet-200">Milestone unlocked</span>
          <p className="mt-1 text-sm font-medium text-bone">{n.title}</p>
          {n.body && <p className="mt-1 text-xs text-mute">{n.body}</p>}
          <p className="mt-2 text-[11px] text-mute">{timeAgo(n.createdAt)}</p>
        </div>
        <span className="shrink-0 self-center text-violet-200 transition-transform group-hover:translate-x-0.5" aria-hidden>→</span>
      </div>
    </motion.button>
  )
}

export default function BuilderDashboard() {
  const { user } = useAuth()
  const q = useBuilderDashboard()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const d = q.data
  const first = user?.name?.split(' ')[0]

  const profile = d?.profile
  const username = profile?.username
  const visibility = profile?.visibility || 'PRIVATE'
  const completion = profile?.completion || { score: 0, missing: [], isComplete: false }
  const applications = d?.applications || { total: 0, byStatus: {}, funnel: {} }
  const byStatus = applications.byStatus || {}
  const funnel = applications.funnel || {}
  const pow = d?.proofOfWork
  const metrics = pow?.metrics || {}
  const notifications = d?.notifications || { unreadCount: 0, recent: [] }
  const recent = notifications.recent || []
  const recommendations = d?.recommendations || []

  const activeStatuses = STATUS_ORDER.filter((s) => byStatus[s])
  const missing = (completion.missing || []).filter((k) => MISSING_LABELS[k])
  // Companies reaching out — the headline event the dashboard surfaces above the fold.
  const recruiterInterest = recent.filter((n) => n.type === 'HR_INVITATION')
  // Live application/submission activity, and the wins (shortlist/selection) worth celebrating.
  const appUpdates = recent.filter(isAppUpdate)
  const wins = appUpdates.filter(isWin).slice(0, 2)

  // Optimistically flip a notification to read, tell the server, then open its target.
  const openNotification = (n) => {
    if (!n.read) {
      qc.setQueryData(['builder-dashboard'], (prev) =>
        prev
          ? {
              ...prev,
              notifications: {
                ...prev.notifications,
                unreadCount: Math.max(0, (prev.notifications?.unreadCount || 0) - 1),
                recent: (prev.notifications?.recent || []).map((x) => (x.id === n.id ? { ...x, read: true } : x)),
              },
            }
          : prev,
      )
      api.readNotification(n.id).catch(() => {}).finally(() => qc.invalidateQueries({ queryKey: ['builder-dashboard'] }))
    }
    navigate(n.data?.path || notifMeta(n.type).to)
  }

  const markAllRead = () => {
    qc.setQueryData(['builder-dashboard'], (prev) =>
      prev
        ? {
            ...prev,
            notifications: {
              ...prev.notifications,
              unreadCount: 0,
              recent: (prev.notifications?.recent || []).map((x) => ({ ...x, read: true })),
            },
          }
        : prev,
    )
    api.readAllNotifications().catch(() => {}).finally(() => qc.invalidateQueries({ queryKey: ['builder-dashboard'] }))
  }

  return (
    <ProductPage
      eco="BUILDER"
      title={first ? `Welcome back, ${first}` : 'Builder dashboard'}
      subtitle="Your proof of work, applications and next steps — all in one place."
      actions={
        <>
          {username ? (
            <Button to={`/builders/${username}`} magnetic={false}>View portfolio</Button>
          ) : (
            <Button to="/builders/profile" magnetic={false}>Create your profile</Button>
          )}
          <Button to="/builders/opportunities" variant="outline" magnetic={false}>Find opportunities</Button>
        </>
      }
    >
      <QueryState query={q}>
        {d && (
          <div className="space-y-6">
            {/* Headline metrics (all real) */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Profile completion" value={<CountUp to={completion.score} suffix="%" />} hint={titleCase(visibility)} accent="text-acid" />
              <Stat label="Applications" value={<CountUp to={applications.total} />} hint={`${activeStatuses.length} active status${activeStatuses.length === 1 ? '' : 'es'}`} />
              <Stat label="Projects" value={<CountUp to={metrics.totalProjects ?? 0} />} hint={`${metrics.publishedProjects ?? 0} published`} />
              <Stat label="Achievements" value={<CountUp to={metrics.achievements ?? 0} />} hint={`${metrics.evaluations ?? 0} evaluation${metrics.evaluations === 1 ? '' : 's'}`} />
            </div>

            {/* Companies reaching out — surfaced above the fold when present. */}
            <AnimatePresence>
              {recruiterInterest.length > 0 && (
                <motion.div
                  key="recruiter-interest"
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.45, ease: EASE }}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span className="eyebrow flex items-center gap-2 text-acid"><span className="h-1.5 w-1.5 rounded-full bg-acid" /> A company reached out to you</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <AnimatePresence initial={false}>
                      {recruiterInterest.map((n) => (
                        <RecruiterCard key={n.id} n={n} onOpen={openNotification} />
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Wins worth celebrating — shortlist / selection — surfaced above the fold. */}
            <AnimatePresence>
              {wins.length > 0 && (
                <motion.div key="wins" layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.45, ease: EASE }}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <AnimatePresence initial={false}>
                      {wins.map((n) => (
                        <MilestoneCard key={n.id} n={n} onOpen={openNotification} />
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Your application journey — live pipeline + the most recent status changes. */}
            <Reveal>
              <Panel title="Your application journey" action={<LivePip busy={q.isFetching && !q.isLoading} />}>
                <ApplicationPipeline counts={funnel} />
                {appUpdates.length > 0 ? (
                  <div className="mt-6 border-t border-line/10 pt-4">
                    <p className="mb-2 text-xs uppercase tracking-[0.14em] text-mute">Latest status changes</p>
                    <div className="space-y-1">
                      <AnimatePresence initial={false}>
                        {appUpdates.slice(0, 4).map((n) => (
                          <NotificationRow key={n.id} n={n} onOpen={openNotification} />
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                ) : applications.total > 0 ? (
                  <p className="mt-6 border-t border-line/10 pt-4 text-sm text-mute">
                    Status changes will appear here as your applications move forward.
                  </p>
                ) : (
                  <p className="mt-6 border-t border-line/10 pt-4 text-sm text-mute">
                    No application activity yet. <Link to="/builders/opportunities" className="text-acid hover:underline">Find opportunities →</Link>
                  </p>
                )}
              </Panel>
            </Reveal>

            <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
              {/* LEFT column */}
              <div className="space-y-6">
                <Reveal>
                  <Panel title="Complete your profile" action={<Link to="/builders/profile" className="text-sm text-acid hover:underline">Edit</Link>}>
                    <div className="flex flex-col items-center gap-6 sm:flex-row">
                      <CompletionRing score={completion.score} />
                      <div className="min-w-0 flex-1">
                        {missing.length ? (
                          <>
                            <p className="text-sm text-mute">A stronger profile gets you discovered by verified hiring teams. Add:</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {missing.map((k) => (
                                <Link key={k} to="/builders/profile" className="rounded-full border border-acid/25 bg-acid/[0.06] px-3 py-1.5 text-xs text-acid transition-colors hover:bg-acid/15">
                                  + {MISSING_LABELS[k]}
                                </Link>
                              ))}
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-bone">
                            Your profile is complete.{' '}
                            {visibility === 'PUBLIC' ? 'It’s public and discoverable by hiring teams.' : 'Set it to public so hiring teams can find you.'}
                          </p>
                        )}
                      </div>
                    </div>
                  </Panel>
                </Reveal>

                <Reveal delay={0.05}>
                  <Panel title="Proof of work" action={<Link to="/builders/projects" className="text-sm text-acid hover:underline">All projects</Link>}>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      <Metric label="Projects" value={metrics.totalProjects} />
                      <Metric label="Published" value={metrics.publishedProjects} />
                      <Metric label="Completed" value={metrics.completedProjects} />
                      <Metric label="Participated" value={metrics.opportunitiesParticipated} />
                      <Metric label="Shortlisted" value={metrics.shortlistedProjects} />
                      <Metric label="Selected" value={metrics.selectedProjects} />
                    </div>
                    {pow?.projects?.length ? (
                      <div className="mt-5 space-y-2">
                        {pow.projects.map((p) => (
                          <ListRow
                            key={p.id}
                            to="/builders/projects"
                            label={p.title}
                            sub={[p.completed ? 'Completed' : titleCase(p.status || 'Draft'), p.teamSize > 1 ? `${p.teamSize} members` : 'Solo'].join(' · ')}
                            status={p.submissions?.latest?.status}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="mt-5 text-sm text-mute">
                        No projects yet. <Link to="/builders/projects" className="text-acid hover:underline">Start building →</Link>
                      </p>
                    )}
                  </Panel>
                </Reveal>

                {pow?.recentEvaluations?.length > 0 && (
                  <Reveal delay={0.1}>
                    <Panel title="Recent evaluations" action={<Link to="/builders/achievements" className="text-sm text-acid hover:underline">Achievements</Link>}>
                      <div className="space-y-3">
                        {pow.recentEvaluations.map((ev) => (
                          <div key={ev.id} className="flex items-center justify-between gap-3 rounded-xl border border-line/10 bg-white/[0.02] px-3.5 py-3">
                            <span className="min-w-0">
                              <span className="block truncate text-sm text-bone">{ev.project?.title || ev.templateName}</span>
                              <span className="block truncate text-[11px] text-mute">{ev.opportunity?.title || 'Evaluation'}{ev.completedAt ? ` · ${formatDate(ev.completedAt)}` : ''}</span>
                            </span>
                            {ev.scoresVisible && ev.overallScore != null ? (
                              <span className="shrink-0 rounded-md bg-acid/15 px-2.5 py-1 font-mono text-xs text-acid">{ev.overallScore}<span className="text-mute">/{ev.maxScore}</span></span>
                            ) : (
                              <Badge tone="neutral">Feedback</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </Panel>
                  </Reveal>
                )}
              </div>

              {/* RIGHT column */}
              <div className="space-y-6">
                <Reveal delay={0.05}>
                  <div className="relative overflow-hidden rounded-2xl border border-acid/20 bg-gradient-to-br from-acid/[0.10] to-transparent p-6">
                    <div aria-hidden className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-acid opacity-10 blur-3xl" />
                    <p className="eyebrow relative text-acid">Your portfolio</p>
                    <p className="relative mt-3 text-sm text-mute">
                      {username ? 'Your public portfolio is live — share it with recruiters.' : 'Set a username to publish a shareable portfolio link.'}
                    </p>
                    {username && <p className="relative mt-2 truncate font-mono text-xs text-bone/70">studlyf.in/builders/{username}</p>}
                    <div className="relative mt-5">
                      {username ? (
                        <Button to={`/builders/${username}`} magnetic={false} className="w-full">View live portfolio</Button>
                      ) : (
                        <Button to="/builders/profile" magnetic={false} className="w-full">Set your username</Button>
                      )}
                    </div>
                  </div>
                </Reveal>

                <Reveal delay={0.1}>
                  <Panel title="Applications" action={<Link to="/builders/applications" className="text-sm text-acid hover:underline">View all</Link>}>
                    {activeStatuses.length ? (
                      <ul className="space-y-2">
                        {activeStatuses.map((s) => (
                          <li key={s}>
                            <Link to="/builders/applications" className="flex items-center justify-between gap-3 rounded-lg border border-line/10 bg-white/[0.02] px-3 py-2.5 text-sm transition-colors hover:border-line/25">
                              <span className="flex items-center gap-2 text-mute">
                                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_TONE[s] === 'urgent' ? 'bg-flare' : STATUS_TONE[s] === 'soon' ? 'bg-amber-300' : STATUS_TONE[s] === 'violet' ? 'bg-violet' : STATUS_TONE[s] === 'open' ? 'bg-acid' : 'bg-line/40'}`} />
                                {titleCase(s)}
                              </span>
                              <span className="font-mono text-bone">{byStatus[s]}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-mute">
                        No applications yet. <Link to="/builders/opportunities" className="text-acid hover:underline">Browse opportunities →</Link>
                      </p>
                    )}
                  </Panel>
                </Reveal>

                {pow?.pendingInvitations > 0 && (
                  <Reveal delay={0.12}>
                    <Notice tone="success">
                      You have {pow.pendingInvitations} pending team invitation{pow.pendingInvitations === 1 ? '' : 's'}.{' '}
                      <Link to="/builders/projects" className="font-medium text-acid hover:underline">Review →</Link>
                    </Notice>
                  </Reveal>
                )}

                <Reveal delay={0.15}>
                  <Panel
                    title="Notifications"
                    action={
                      <div className="flex items-center gap-3">
                        <LivePip busy={q.isFetching && !q.isLoading} />
                        {notifications.unreadCount > 0 && (
                          <>
                            <span className="rounded-full bg-acid/15 px-2.5 py-0.5 text-xs font-medium text-acid">{notifications.unreadCount} new</span>
                            <button type="button" onClick={markAllRead} className="text-xs text-mute transition-colors hover:text-bone">Mark all read</button>
                          </>
                        )}
                      </div>
                    }
                  >
                    {recent.length ? (
                      <div className="space-y-1">
                        <AnimatePresence initial={false}>
                          {recent.map((n) => (
                            <NotificationRow key={n.id} n={n} onOpen={openNotification} />
                          ))}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <p className="text-sm text-mute">You’re all caught up.</p>
                    )}
                  </Panel>
                </Reveal>
              </div>
            </div>

            {/* Recommended opportunities */}
            {recommendations.length > 0 && (
              <Reveal delay={0.05}>
                <div className="pt-4">
                  <div className="mb-6 flex items-end justify-between gap-4">
                    <div>
                      <p className="eyebrow mb-2 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-acid" /> Recommended for you
                      </p>
                      <h2 className="display-face text-2xl tracking-tight text-bone sm:text-3xl">Opportunities matched to your profile</h2>
                    </div>
                    <Link to="/builders/opportunities" className="hidden shrink-0 text-sm text-acid hover:underline sm:block">Browse all</Link>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {recommendations.slice(0, 3).map((opp, i) => (
                      <OpportunityCard key={opp.id || opp.slug} opp={opp} index={i} />
                    ))}
                  </div>
                </div>
              </Reveal>
            )}
          </div>
        )}
      </QueryState>
    </ProductPage>
  )
}

