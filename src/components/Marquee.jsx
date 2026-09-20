import { useRef, useLayoutEffect } from 'react'
import { gsap, ScrollTrigger } from '../lib/smooth'

/**
 * Marquee — infinite horizontal track. Base drift + scroll-velocity skew.
 */
export default function Marquee({ items = [], speed = 40, className = '', sep = '✦' }) {
  const track = useRef(null)

  useLayoutEffect(() => {
    const el = track.current
    const ctx = gsap.context(() => {
      let half = el.scrollWidth / 2
      let tween

      const build = () => {
        tween?.kill()
        gsap.set(el, { x: 0 })
        half = el.scrollWidth / 2
        if (half <= 0) return
        tween = gsap.to(el, {
          x: -half,
          duration: half / speed,
          ease: 'none',
          repeat: -1,
          // wrap seamlessly; guard against half being 0
          modifiers: { x: (x) => `${parseFloat(x) % half}px` },
        })
      }

      build()
      // fonts change the measured width — rebuild once they're ready
      document.fonts?.ready?.then(build)

      // scrub skew from scroll velocity onto an INNER prop only,
      // and never overwrite the running x tween
      const st = ScrollTrigger.create({
        onUpdate: (self) => {
          const v = gsap.utils.clamp(-30, 30, self.getVelocity() / -70)
          gsap.to(el, { skewX: v * 0.25, duration: 0.5, overwrite: 'auto' })
        },
      })

      return () => {
        tween?.kill()
        st.kill()
      }
    }, el)
    return () => ctx.revert()
  }, [speed])

  const row = [...items, ...items]

  return (
    <div className={`overflow-hidden whitespace-nowrap ${className}`}>
      <div ref={track} className="inline-flex items-center gap-10 will-change-transform">
        {row.map((it, i) => (
          <span key={i} className="inline-flex items-center gap-10">
            <span>{it}</span>
            <span className="text-acid/80">{sep}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
