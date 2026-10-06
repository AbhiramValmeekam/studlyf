import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { journey } from '../../data/studlyf'
import { EASE, inView } from '../../lib/motion'

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const num = (i) => String(i + 1).padStart(2, '0')

// Pinned vertical "ticker": the five steps translate upward through a focal
// band as the section scrolls, with the active step bright and neighbours
// fading to ghosts — reproducing the reference Master Your Path section.
export function MasterYourPath() {
  const steps = journey.steps
  const sectionRef = useRef(null)
  const stageRef = useRef(null)
  const trackRef = useRef(null)
  const itemRefs = useRef([])
  const centers = useRef([])
  const [reduced, setReduced] = useState(false)

  useLayoutEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  useEffect(() => {
    if (reduced) return
    const section = sectionRef.current
    const stage = stageRef.current
    const track = trackRef.current
    if (!section || !stage || !track) return

    const measure = () => {
      centers.current = itemRefs.current.map((el) => (el ? el.offsetTop + el.offsetHeight / 2 : 0))
    }

    let raf = 0
    const update = () => {
      raf = 0
      const total = section.offsetHeight - window.innerHeight
      const p = total > 0 ? clamp(-section.getBoundingClientRect().top / total, 0, 1) : 0
      const f = p * (steps.length - 1)
      const base = Math.floor(f)
      const frac = f - base
      const c = centers.current
      if (!c.length) return
      const target = c[base] + ((c[Math.min(base + 1, c.length - 1)] || c[base]) - c[base]) * frac
      track.style.transform = `translate3d(0, ${stage.clientHeight * 0.5 - target}px, 0)`
      itemRefs.current.forEach((el, i) => {
        if (!el) return
        const d = Math.abs(i - f)
        el.style.opacity = String(Math.max(0, 1 - d * 0.9))
        el.style.filter = d > 0.6 ? `blur(${Math.min(6, (d - 0.6) * 6)}px)` : 'none'
      })
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    const onResize = () => { measure(); onScroll() }

    measure()
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [reduced, steps.length])

  // Reduced-motion / no-JS fallback: a plain readable list.
  if (reduced) {
    return (
      <section className="relative py-28 md:py-36">
        <div className="wrap">
          <p className="eyebrow mb-10">Master your path — {journey.subtitle}</p>
          <ol className="space-y-8">
            {steps.map((s, i) => (
              <li key={s.key} className="flex items-baseline gap-5">
                <span className="font-mono text-lg text-acid">{num(i)}</span>
                <div>
                  <h3 className="display-face text-4xl uppercase tracking-tightest text-bone md:text-5xl">{s.key}</h3>
                  <p className="mt-2 font-serif text-lg italic text-mute">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    )
  }

  return (
    <section ref={sectionRef} className="relative h-[320vh]">
      <div ref={stageRef} className="sticky top-0 h-screen overflow-hidden">
        {/* ambient glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[42vh] w-[70vw] -translate-x-1/2 rounded-full bg-acid/12 blur-[120px]" />

        <motion.p
          className="eyebrow absolute inset-x-0 top-0 wrap pt-28 md:pt-32"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={inView}
          transition={{ duration: 0.6, ease: EASE }}
        >
          Master your path — {journey.subtitle}
        </motion.p>

        <div ref={trackRef} className="absolute inset-x-0 top-0 will-change-transform">
          <div className="wrap">
            {steps.map((s, i) => (
              <div
                key={s.key}
                ref={(el) => (itemRefs.current[i] = el)}
                className="flex items-start gap-4 py-6 md:gap-7"
              >
                <span className="mt-3 font-mono text-xl text-acid md:mt-5 md:text-2xl">{num(i)}</span>
                <div>
                  <h3 className="display-face font-display uppercase leading-[0.82] tracking-tightest text-bone text-[clamp(3rem,11vw,9rem)]">
                    {s.key}
                  </h3>
                  <p className="mt-2 font-serif italic text-mute text-[clamp(1.1rem,2.2vw,1.75rem)]">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <span className="eyebrow absolute bottom-8 right-6 text-mute/70 md:right-10">Scroll ↓</span>
      </div>
    </section>
  )
}
