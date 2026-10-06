import { motion, useReducedMotion } from 'framer-motion'
import { EASE, clipUp, toWords } from '../../lib/motion'
import { RevealGroup, RevealItem, trackSpotlight } from '../ui/Reveal'
import { EmptyState, ErrorState, Skeleton } from '../ui/atoms'

// Shared chrome for the Learn / Job Prep library pages (Courses, STUDHub, Mock Drills,
// Project Briefs, Resume Builder). Same dark editorial language as the rest of STUDLYF —
// animated split headline, accent cursor-glow, quiet grain — and every effect degrades to a
// clean, fully-visible static state under prefers-reduced-motion.

// ACID glow follows the pointer across the hero (via --mx/--my written by trackSpotlight).
const HERO_GLOW = {
  background:
    'radial-gradient(34rem 34rem at var(--mx, 50%) var(--my, 28%), rgb(76 201 255 / 0.10), transparent 62%)',
}

export function ExploreHero({ eyebrow, title, lead, children }) {
  const reduce = useReducedMotion()
  const words = toWords(title)
  return (
    <header
      onMouseMove={reduce ? undefined : trackSpotlight}
      className="grain relative overflow-hidden border-b border-line/10 pb-14 pt-36 md:pt-44"
    >
      {!reduce && <div className="pointer-events-none absolute inset-0" style={HERO_GLOW} aria-hidden />}
      <div className="wrap relative">
        <motion.p
          className="eyebrow mb-6 flex items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <span className="inline-block h-px w-8 bg-acid" />
          {eyebrow}
        </motion.p>
        <h1 className="display-face text-mega text-balance leading-[0.95]">
          {reduce
            ? title
            : words.map((w, i) => (
                <span key={`${w}-${i}`} className="mr-[0.24em] inline-block overflow-hidden align-bottom">
                  <motion.span className="inline-block will-change-transform" variants={clipUp} initial="hidden" animate="show" custom={i}>
                    {w}
                  </motion.span>
                </span>
              ))}
        </h1>
        {lead && (
          <motion.p
            className="mt-6 max-w-2xl text-lede text-mute"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.25 }}
          >
            {lead}
          </motion.p>
        )}
        {children && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.35 }}
          >
            {children}
          </motion.div>
        )}
      </div>
    </header>
  )
}

// A compact row of headline stats, staggered in as it scrolls up.
export function StatPills({ items, className = '' }) {
  return (
    <RevealGroup className={`grid grid-cols-2 gap-3 sm:grid-cols-4 ${className}`}>
      {items.map((s) => (
        <RevealItem
          key={s.label}
          onMouseMove={trackSpotlight}
          className="spotlight-card card-surface px-4 py-3.5"
        >
          <div className="text-[10px] uppercase tracking-[0.2em] text-mute">{s.label}</div>
          <div className="display-face mt-1.5 text-xl text-bone">{s.value}</div>
        </RevealItem>
      ))}
    </RevealGroup>
  )
}

// A centered (or left) section heading: accent eyebrow + display title + optional lead,
// revealed on scroll. Shared so every library section reads in one editorial voice.
export function SectionLabel({ eyebrow, title, lead, align = 'center', className = '' }) {
  const reduce = useReducedMotion()
  const centered = align === 'center'
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={reduce ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: EASE }}
      className={`${centered ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'} ${className}`}
    >
      {eyebrow && (
        <p className={`eyebrow flex items-center gap-3 ${centered ? 'justify-center' : ''}`}>
          <span className="inline-block h-px w-8 bg-acid" />
          {eyebrow}
        </p>
      )}
      <h2 className="display-face mt-5 text-3xl tracking-tight text-bone sm:text-4xl">{title}</h2>
      {lead && <p className="mt-4 text-mute">{lead}</p>}
    </motion.div>
  )
}

// A toolbar row: search / chips / sort, on the site's hairline divider.
export function Toolbar({ children, className = '' }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-6 gap-y-4 border-b border-line/10 pb-8 ${className}`}>
      {children}
    </div>
  )
}

// Grid of pulse skeletons while a query loads.
export function GridSkeletons({ count = 6, className = 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3', itemClassName = 'h-56' }) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={`w-full ${itemClassName}`} />
      ))}
    </div>
  )
}

/** loading → skeleton, error → retryable, empty → friendly state, else the results. */
export function GridState({ isLoading, isError, isEmpty, onRetry, skeleton, emptyTitle, emptyHint, children }) {
  if (isError) return <ErrorState onRetry={onRetry} />
  if (isLoading) return skeleton
  if (isEmpty) return <EmptyState title={emptyTitle} hint={emptyHint} />
  return children
}
