import { useEffect, useRef } from 'react'
import { motion, useReducedMotion, useMotionValue, useTransform, animate } from 'framer-motion'
import { EASE } from '../../lib/motion'

// The real STUDLYF "S" monogram (transparent, violet→magenta→orange gradient).
const S_ICON = '/scraped/s77_stud.png'
const WORD = 'STUDLYF'.split('')
const GLYPH = 'clamp(8rem,24vmin,15rem)'
// Netflix-style easing — glides, then accelerates as the stage rushes toward the viewer.
const EXIT_EASE = [0.7, 0, 0.3, 1]

/**
 * STUDHub preloader — a clean, editorial intro built around the real STUDLYF "S".
 * The mark rises behind a mask out of soft focus, a single highlight sweep traces its
 * silhouette and a gentle arrival glow marks the beat, then the wordmark types up
 * letter-by-letter behind clip masks while a live counter fills a hairline rule — and the
 * whole stage zooms out and dissolves to reveal the page. The settled mark breathes so
 * the frame never feels frozen.
 *
 * Transform / opacity / clip / mask only — no WebGL. Skipped (instant onDone) under
 * prefers-reduced-motion.
 */
export function BrandIntro({ onDone, duration = 2800, label = 'STUDHub' }) {
  const reduce = useReducedMotion()
  const done = useRef(onDone)
  done.current = onDone
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => Math.round(v))
  const load = (duration - 500) / 1000

  useEffect(() => {
    if (reduce) {
      done.current?.()
      return
    }
    const anim = animate(count, 100, { duration: load, ease: EASE })
    const t = setTimeout(() => done.current?.(), duration)
    return () => {
      anim.stop()
      clearTimeout(t)
    }
  }, [count, load, duration, reduce])

  if (reduce) return null

  return (
    <motion.div
      className="grain fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-ink"
      initial={{ scale: 1, opacity: 1 }}
      exit={{ scale: 1.2, opacity: 0, filter: 'blur(8px)', transition: { duration: 1, ease: EXIT_EASE, opacity: { duration: 0.8, ease: 'easeIn' } } }}
      aria-hidden
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgb(0_0_0/0.6)_100%)]" />

      {/* top eyebrow */}
      <motion.span
        className="absolute left-1/2 top-10 -translate-x-1/2 text-[11px] uppercase tracking-[0.5em] text-mute"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
      >
        {label}
      </motion.span>
      {/* center lockup — the mark gently floats after it lands so the frame stays alive */}
      <motion.div
        className="relative flex flex-col items-center gap-8 px-6"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 5, ease: 'easeInOut', repeat: Infinity, delay: 1.4 }}
        exit={{ scale: 1.45, opacity: 0, transition: { duration: 1, ease: EXIT_EASE, opacity: { duration: 0.75, ease: 'easeIn' } } }}
      >
        <div className="relative grid place-items-center" style={{ width: GLYPH, height: GLYPH }}>
          {/* soft brand bloom — brightens once as the S arrives, then settles */}
          <motion.div
            className="pointer-events-none absolute h-[165%] w-[165%] rounded-full"
            style={{ background: 'radial-gradient(circle, rgb(229 48 138 / 0.22), rgb(123 47 247 / 0.14) 45%, transparent 70%)' }}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: [0, 1, 0.85], scale: [0.7, 1.05, 1] }}
            transition={{ duration: 1.6, ease: EASE, delay: 0.15, times: [0, 0.55, 1] }}
          />
          {/* the S rises behind a mask out of soft focus */}
          <div className="relative h-full w-full overflow-hidden">
            <motion.img
              src={S_ICON}
              alt=""
              className="h-full w-full object-contain"
              initial={{ y: '100%', scale: 1.05, filter: 'blur(10px)' }}
              animate={{ y: '0%', scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 1, ease: EASE, delay: 0.3 }}
            />
          </div>
          {/* a single arrival glow — one gentle beat as the mark settles */}
          <motion.div
            className="pointer-events-none absolute h-[120%] w-[120%] rounded-full"
            style={{ background: 'radial-gradient(circle, rgb(255 255 255 / 0.5), transparent 60%)', mixBlendMode: 'screen' }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 0.7, 0], scale: [0.8, 1.25, 1.5] }}
            transition={{ duration: 0.9, ease: EASE, delay: 1.05, times: [0, 0.4, 1] }}
          />
          {/* single highlight sweep traced through the exact S silhouette */}
          <motion.div
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'linear-gradient(115deg, transparent 38%, rgb(255 255 255 / 0.85) 50%, transparent 62%)',
              backgroundSize: '300% 100%',
              WebkitMaskImage: `url(${S_ICON})`, maskImage: `url(${S_ICON})`,
              WebkitMaskSize: 'contain', maskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center', maskPosition: 'center',
              mixBlendMode: 'screen',
            }}
            initial={{ backgroundPosition: '180% 0', opacity: 0 }}
            animate={{ backgroundPosition: '-110% 0', opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.3, ease: EASE, delay: 0.95, times: [0, 0.12, 0.88, 1] }}
          />
        </div>
        {/* wordmark types up letter-by-letter, each rising sharp out of a clip mask */}
        <div className="flex items-end leading-none">
          {WORD.map((ch, i) => (
            <span key={i} className="inline-block overflow-hidden pb-[0.08em]">
              <motion.span
                className="display-face inline-block tracking-crush text-[clamp(1.9rem,7.5vw,4.25rem)] text-bone"
                initial={{ y: '115%', filter: 'blur(6px)' }}
                animate={{ y: '0%', filter: 'blur(0px)' }}
                transition={{ duration: 0.7, ease: EASE, delay: 1.15 + i * 0.05 }}
              >
                {ch}
              </motion.span>
            </span>
          ))}
          <span className="inline-block overflow-hidden pb-[0.08em]">
            <motion.span
              className="display-face inline-block text-[clamp(1.9rem,7.5vw,4.25rem)] text-acid"
              initial={{ y: '115%' }}
              animate={{ y: '0%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 14, delay: 1.6 }}
            >
              .
            </motion.span>
          </span>
        </div>
      </motion.div>
      {/* compact live counter — a hairline rule fills as it climbs to 100 */}
      <div className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-3 px-8">
        <div className="flex w-full max-w-[240px] items-center justify-between text-[10px] uppercase tracking-[0.3em] text-mute">
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.3 }}>
            Loading
          </motion.span>
          <span className="tabular-nums text-bone">
            <motion.span>{rounded}</motion.span>%
          </span>
        </div>
        <div className="h-px w-full max-w-[240px] overflow-hidden rounded-full bg-line/15">
          <motion.div
            className="h-full bg-acid"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: load, ease: EASE }}
            style={{ transformOrigin: 'left' }}
          />
        </div>
      </div>
    </motion.div>
  )
}
