import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { EASE, inView, toWords } from '../../lib/motion'
import { SectionHeading } from '../ui/SectionHeading'

// Rich, content-driven landing sections shared by the ecosystem pages so each one carries the
// same depth as the Builders page. All copy is passed in by the page — these components only
// enforce the STUDLYF editorial look and the scroll-reveal motion. `accent` is the persona's
// text-* class (e.g. 'text-violet'); the matching bg-* is derived and is safe because every
// bg-<accent> literal already exists in lib/ecosystems.js, so Tailwind's JIT emits it.
const bgOf = (accent) => accent.replace('text-', 'bg-')

/** One deep-dive row: copy beside a list of specifics, with a large ghost index numeral behind
 *  it and a gentle scroll-parallax offset between the two columns. */
function SplitRow({ it, i, accent, dot }) {
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const yA = useTransform(scrollYProgress, [0, 1], [28, -28])
  const yB = useTransform(scrollYProgress, [0, 1], [-20, 20])
  const flip = i % 2
  return (
    <motion.article
      ref={ref}
      className="card-surface relative grid gap-8 overflow-hidden p-8 md:grid-cols-[0.95fr_1.05fr] md:items-center md:p-10"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={inView}
      transition={{ duration: 0.6, ease: EASE }}
    >
      {/* Oversized ghost numeral — depth cue, aria-hidden. */}
      <span aria-hidden className="display-face pointer-events-none absolute -top-8 right-4 select-none text-[9rem] leading-none text-line/[0.04] md:text-[12rem]">
        {String(i + 1).padStart(2, '0')}
      </span>
      <motion.div style={reduce ? undefined : { y: yA }} className={`relative ${flip ? 'md:order-2' : ''}`}>
        <span className={`font-mono text-xs ${accent}`}>{String(i + 1).padStart(2, '0')} — {it.kicker}</span>
        <h3 className="display-face mt-4 text-balance text-3xl md:text-4xl">{it.title}</h3>
        <p className="mt-4 leading-relaxed text-mute">{it.text}</p>
      </motion.div>
      <motion.ul style={reduce ? undefined : { y: yB }} className={`relative grid gap-3 ${flip ? 'md:order-1' : ''}`}>
        {it.points.map((p, j) => (
          <motion.li
            key={p}
            className="flex items-start gap-3 rounded-2xl border border-line/10 bg-ink2/40 px-4 py-3 text-sm text-bone transition-colors duration-300 hover:border-line/25"
            initial={{ opacity: 0, x: 12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={inView}
            transition={{ duration: 0.45, ease: EASE, delay: 0.1 + j * 0.08 }}
          >
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            {p}
          </motion.li>
        ))}
      </motion.ul>
    </motion.article>
  )
}

/** Alternating two-column "deep dive" rows: a titled block of copy beside a list of specifics. */
export function SplitFeatures({ eyebrow, title, aside, accent = 'text-acid', items }) {
  const dot = bgOf(accent)
  return (
    <section className="py-20 md:py-28">
      <div className="wrap">
        <SectionHeading eyebrow={eyebrow} title={title} accent={dot} aside={aside && <p className="text-mute">{aside}</p>} />
        <div className="mt-14 space-y-4">
          {items.map((it, i) => (
            <SplitRow key={it.title} it={it} i={i} accent={accent} dot={dot} />
          ))}
        </div>
      </div>
    </section>
  )
}

/** Before/after contrast — the old scattered way beside the STUDLYF way. Accent lives on the
 *  eyebrow and the check marks (both bg-<accent>, JIT-safe); borders stay neutral. */
export function Comparison({ eyebrow, title, subtitle, accent = 'text-acid', oldLabel = 'The old way', newLabel = 'On STUDLYF', oldWay, newWay }) {
  const check = bgOf(accent)
  return (
    <section className="py-20 md:py-28">
      <div className="wrap">
        <div className="max-w-3xl">
          <SectionHeading eyebrow={eyebrow} title={title} accent={check} />
          {subtitle && <p className="mt-5 text-lede text-mute">{subtitle}</p>}
        </div>
        <div className="relative mt-14 flex flex-col items-stretch gap-6 md:flex-row md:items-center">
          {/* Muted "old way" column. */}
          <div className="flex-1 rounded-3xl border border-line/10 bg-ink2/30 p-8 md:opacity-70">
            <p className="eyebrow mb-6">{oldLabel}</p>
            <ul className="space-y-4">
              {oldWay.map((it, i) => (
                <motion.li key={it} className="flex items-center gap-3 text-lg" initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={inView} transition={{ duration: 0.5, ease: EASE, delay: i * 0.07 }}>
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-line/10 text-xs text-mute">✕</span>
                  <span className="text-mute line-through decoration-line/30">{it}</span>
                </motion.li>
              ))}
            </ul>
          </div>
          {/* Center "vs" chip — a middle flex child, so it sits between the columns in both row and stacked layouts. */}
          <div className="z-10 grid shrink-0 place-items-center">
            <span className="grid h-11 w-11 place-items-center rounded-full border border-line/15 bg-ink font-mono text-xs uppercase tracking-widest text-mute shadow-lg">vs</span>
          </div>
          {/* Emphasized "On STUDLYF" column — subtle accent glow + slight scale. */}
          <div className="relative flex-1 overflow-hidden rounded-3xl border border-line/25 bg-ink2/50 p-8 md:scale-[1.02]">
            <div aria-hidden className={`absolute -right-16 -top-16 h-48 w-48 rounded-full ${check} opacity-10 blur-3xl`} />
            <p className={`eyebrow relative mb-6 ${accent}`}>{newLabel}</p>
            <ul className="relative space-y-4">
              {newWay.map((it, i) => (
                <motion.li key={it} className="flex items-center gap-3 text-lg" initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={inView} transition={{ duration: 0.5, ease: EASE, delay: i * 0.07 }}>
                  <motion.span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${check} text-xs text-ink`}
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={inView}
                    transition={{ duration: 0.4, ease: EASE, delay: 0.15 + i * 0.07 }}
                  >
                    ✓
                  </motion.span>
                  <span className="text-bone">{it}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

/** Oversized editorial statement with an optional three-up of supporting points. */
export function Manifesto({ eyebrow, statement, accent = 'text-acid', points }) {
  const reduce = useReducedMotion()
  return (
    <section className="py-24 md:py-32">
      <div className="wrap">
        <p className="eyebrow mb-8 flex items-center gap-3">
          <span className={`inline-block h-px w-8 ${bgOf(accent)}`} />
          {eyebrow}
        </p>
        {reduce ? (
          <h2 className="display-face max-w-4xl text-balance text-[clamp(1.6rem,3.4vw,2.9rem)] leading-[1.25]">{statement}</h2>
        ) : (
          <motion.h2
            className="display-face max-w-4xl text-balance text-[clamp(1.6rem,3.4vw,2.9rem)] leading-[1.25]"
            aria-label={statement}
            initial="hidden"
            whileInView="show"
            viewport={inView}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } } }}
          >
            {toWords(statement).map((w, i, arr) => (
              <span key={`${w}-${i}`} className="inline-block whitespace-pre" aria-hidden>
                <motion.span
                  className="inline-block"
                  variants={{ hidden: { y: '0.4em', opacity: 0 }, show: { y: 0, opacity: 1, transition: { duration: 0.6, ease: EASE } } }}
                >
                  {w}
                </motion.span>
                {i < arr.length - 1 ? ' ' : ''}
              </span>
            ))}
          </motion.h2>
        )}
        {points?.length ? (
          <div className="mt-14 grid gap-8 border-t border-line/10 pt-10 md:grid-cols-3">
            {points.map((p, i) => (
              <motion.div key={p.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={inView} transition={{ duration: 0.55, ease: EASE, delay: i * 0.08 }}>
                <span className={`font-mono text-xs ${accent}`}>{String(i + 1).padStart(2, '0')}</span>
                <h3 className="mt-3 text-lg font-semibold text-bone">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mute">{p.text}</p>
              </motion.div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
