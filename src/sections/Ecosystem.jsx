import { useRef, useLayoutEffect } from 'react'
import { gsap } from '../lib/smooth'
import { masterPath } from '../data/studlyf'

const LAYERS = masterPath.steps.map((s) => ({ n: s.n, w: s.name, d: s.note }))

export default function Ecosystem() {
  const root = useRef(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray('.eco-item')
      gsap.set(items, { autoAlpha: 0, yPercent: 60 })
      gsap.set(items[0], { autoAlpha: 1, yPercent: 0 })

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: '+=' + LAYERS.length * 60 + '%',
          pin: true,
          scrub: 0.6,
        },
      })

      items.forEach((it, i) => {
        if (i === 0) return
        tl.to(items[i - 1], { autoAlpha: 0, yPercent: -60, duration: 0.5 })
        tl.fromTo(it, { autoAlpha: 0, yPercent: 60 }, { autoAlpha: 1, yPercent: 0, duration: 0.5 }, '<0.1')
      })

      gsap.to('.eco-progress', {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: '+=' + LAYERS.length * 60 + '%',
          scrub: true,
        },
      })
    }, root.current)
    return () => ctx.revert()
  }, [])

  return (
    <section id="ecosystem" ref={root} className="relative h-[100svh] flex items-center overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-bone/10">
        <div className="eco-progress h-full bg-acid origin-left scale-x-0" />
      </div>

      <p className="absolute top-10 gutter eyebrow text-bone2">
        {masterPath.title} — {masterPath.sub}
      </p>

      <div className="relative w-full gutter">
        {LAYERS.map((l) => (
          <div key={l.n} className="eco-item absolute inset-x-0 gutter">
            <div className="flex items-start gap-4 md:gap-8">
              <span className="font-display text-2xl md:text-4xl text-acid pt-4 md:pt-8">{l.n}</span>
              <div>
                <h2 className="font-display d-hero text-bone tracking-crush leading-[0.82]">{l.w}</h2>
                <p className="serif-i text-2xl md:text-4xl text-bone2 mt-4">{l.d}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <span className="absolute bottom-8 right-[var(--gutter)] eyebrow text-bone2">Scroll ↓</span>
    </section>
  )
}
