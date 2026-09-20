import { useRef, useLayoutEffect } from 'react'
import { gsap } from '../lib/smooth'
import { testimonials } from '../data/studlyf'

const TINTS = ['#C7F24E', '#FF4A28', '#6C4BFF', '#0A0A0B']

/**
 * InteractiveCard — a square testimonial card that reacts to the pointer:
 *  • 3D tilt that follows the cursor (quickTo = smooth, GPU-friendly)
 *  • a soft spotlight glow tracking the pointer position
 *  • lifts on enter, springs back on leave
 * All motion is disabled under prefers-reduced-motion.
 */
function InteractiveCard({ t, i }) {
  const card = useRef(null)
  const glow = useRef(null)
  const inner = useRef(null)
  const tint = TINTS[i % TINTS.length]

  useLayoutEffect(() => {
    const el = card.current
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || !el) return

    const ctx = gsap.context(() => {
      const rotX = gsap.quickTo(el, 'rotationX', { duration: 0.5, ease: 'power3.out' })
      const rotY = gsap.quickTo(el, 'rotationY', { duration: 0.5, ease: 'power3.out' })
      const glowX = gsap.quickTo(glow.current, 'xPercent', { duration: 0.4, ease: 'power2.out' })
      const glowY = gsap.quickTo(glow.current, 'yPercent', { duration: 0.4, ease: 'power2.out' })
      const pushX = gsap.quickTo(inner.current, 'x', { duration: 0.6, ease: 'power3.out' })
      const pushY = gsap.quickTo(inner.current, 'y', { duration: 0.6, ease: 'power3.out' })

      gsap.set(el, { transformPerspective: 800, transformStyle: 'preserve-3d' })

      const onMove = (e) => {
        const r = el.getBoundingClientRect()
        const px = (e.clientX - r.left) / r.width
        const py = (e.clientY - r.top) / r.height
        rotY((px - 0.5) * 16)
        rotX((0.5 - py) * 16)
        glowX(px * 100)
        glowY(py * 100)
        pushX((px - 0.5) * 14)
        pushY((py - 0.5) * 14)
      }
      const onEnter = () => {
        gsap.to(el, { scale: 1.04, duration: 0.4, ease: 'power3.out' })
        gsap.to(glow.current, { autoAlpha: 1, duration: 0.4 })
      }
      const onLeave = () => {
        gsap.to(el, { rotationX: 0, rotationY: 0, scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.5)' })
        gsap.to(inner.current, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.5)' })
        gsap.to(glow.current, { autoAlpha: 0, duration: 0.5 })
      }

      el.addEventListener('pointermove', onMove)
      el.addEventListener('pointerenter', onEnter)
      el.addEventListener('pointerleave', onLeave)
      return () => {
        el.removeEventListener('pointermove', onMove)
        el.removeEventListener('pointerenter', onEnter)
        el.removeEventListener('pointerleave', onLeave)
      }
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <div style={{ perspective: '900px' }} className="shrink-0 w-[78vw] sm:w-[48vw] md:w-[30vw] lg:w-[24vw]">
      <figure
        ref={card}
        data-cursor="hover"
        className="group relative aspect-square flex flex-col justify-between rounded-[8px] border border-ink/15 p-7 md:p-8 bg-white/60 overflow-hidden will-change-transform"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <span
          ref={glow}
          aria-hidden
          className="pointer-events-none absolute -inset-1/2 opacity-0"
          style={{ background: `radial-gradient(circle at center, ${tint}44, transparent 60%)` }}
        />
        <span
          aria-hidden
          className="absolute left-0 top-0 h-1 w-full origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"
          style={{ background: tint }}
        />

        <div ref={inner} className="relative flex flex-col justify-between h-full" style={{ transform: 'translateZ(40px)' }}>
          <div className="flex items-center gap-1" aria-label="Rated 5 out of 5">
            {Array.from({ length: 5 }).map((_, s) => (
              <svg key={s} viewBox="0 0 20 20" className="h-4 w-4" style={{ fill: tint }} aria-hidden>
                <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L10 14.77l-5.2 2.73.99-5.79-4.21-4.1 5.82-.85z" />
              </svg>
            ))}
          </div>
          <blockquote className="serif-i text-lg md:text-xl leading-snug text-ink">
            {t.quote}
          </blockquote>
          <figcaption className="mt-6 flex items-center gap-4">
            <span
              className="grid place-items-center h-11 w-11 rounded-full font-display shrink-0"
              style={{ background: tint, color: tint === '#C7F24E' ? '#0A0A0B' : '#EFEAE0' }}
            >
              {t.name[0]}
            </span>
            <span>
              <span className="block font-medium">{t.name}</span>
              <span className="block text-xs tracking-widest text-ink/60">{t.track}</span>
            </span>
          </figcaption>
        </div>
      </figure>
    </div>
  )
}

/**
 * Row — a self-scrolling marquee of cards. Two copies of the set are rendered
 * so the loop is seamless; hovering pauses so a card can be read + tilted.
 * dir: 1 scrolls left, -1 scrolls right.
 */
function Row({ items, offset = 0, dir = 1 }) {
  const track = useRef(null)

  useLayoutEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const el = track.current
    const ctx = gsap.context(() => {
      const half = () => el.scrollWidth / 2
      // start the reverse row already shifted so the two rows never sync up
      if (dir < 0) gsap.set(el, { x: () => -half() })
      const tween = gsap.to(el, {
        x: dir > 0 ? () => -half() : 0,
        ease: 'none',
        duration: () => half() / 70, // ~70px/sec
        repeat: -1,
      })
      // Ease the whole row to a stop / back up to speed via timeScale instead of
      // pause()/play(). The tween never actually stops, so there is no re-init
      // "load" when the pointer leaves — it just glides back up smoothly.
      const slow = () => gsap.to(tween, { timeScale: 0, duration: 0.4, ease: 'power2.out', overwrite: true })
      const go = () => gsap.to(tween, { timeScale: 1, duration: 0.6, ease: 'power2.out', overwrite: true })
      el.addEventListener('pointerenter', slow)
      el.addEventListener('pointerleave', go)
    }, el)
    return () => ctx.revert()
  }, [dir])

  return (
    <div className="relative overflow-hidden">
      <div ref={track} className="flex items-stretch gap-4 md:gap-6 w-max px-[var(--gutter)]">
        {items.map((t, i) => (
          <InteractiveCard key={`a-${t.name}`} t={t} i={i + offset} />
        ))}
        {items.map((t, i) => (
          <InteractiveCard key={`b-${t.name}`} t={t} i={i + offset} />
        ))}
      </div>
    </div>
  )
}

export default function Talent() {
  const items = testimonials.items
  const mid = Math.ceil(items.length / 2)
  const rowA = items.slice(0, mid)
  const rowB = items.slice(mid)

  return (
    <section id="talent" className="relative bg-bone text-ink py-[16vh] overflow-hidden">
      <div className="gutter">
        <div className="grid md:grid-cols-12 gap-y-10 md:gap-8 items-end mb-14">
          <div className="md:col-span-9">
            <div className="flex items-baseline gap-4 mb-6">
              <span className="font-display giant-num leading-none text-ink" style={{ fontSize: 'clamp(3rem,10vw,10rem)' }}>
                06
              </span>
              <span className="eyebrow text-ink/60 pb-3">Stories</span>
            </div>
            <h2 className="font-display d-1 text-ink tracking-crush max-w-4xl">
              See how learners like you landed jobs, built skills, and
              <span className="serif-i text-flare lowercase"> changed their lives.</span>
            </h2>
          </div>
        </div>
      </div>

      {/* two self-scrolling rows moving in opposite directions */}
      <div className="space-y-4 md:space-y-6">
        <Row items={rowA} offset={0} dir={1} />
        <Row items={rowB} offset={mid} dir={-1} />
      </div>
    </section>
  )
}
