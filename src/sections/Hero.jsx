import { useRef, useLayoutEffect, useEffect } from 'react'
import { gsap } from '../lib/smooth'
import Marquee from '../components/Marquee'
import MagneticButton from '../components/MagneticButton'
import { scrollTo } from '../lib/smooth'
import { hero, experience } from '../data/studlyf'

export default function Hero({ play }) {
  const root = useRef(null)
  const rotWord = useRef(null)

  // Cycle the rotating word imperatively so the swap is one smooth GSAP
  // motion (old word slides up + fades out, new word rises in from below)
  // instead of a hard React remount. "Learn" and "by" stay static.
  useEffect(() => {
    if (!play || !rotWord.current) return
    const el = rotWord.current
    let i = 0
    let id

    const ctx = gsap.context(() => {
      const swap = () => {
        const next = hero.rotating[(i + 1) % hero.rotating.length]
        gsap
          .timeline({
            defaults: { duration: 0.55, ease: 'power3.inOut' },
            onComplete: () => {
              i = (i + 1) % hero.rotating.length
            },
          })
          // ease the current word up and out
          .to(el, { yPercent: -100, autoAlpha: 0 })
          // swap text while it's hidden, drop it below the mask
          .add(() => {
            el.textContent = next
            gsap.set(el, { yPercent: 100, autoAlpha: 0 })
          })
          // float the new word up into place
          .to(el, { yPercent: 0, autoAlpha: 1 })
      }
      id = setInterval(swap, 2200)
    }, root.current)

    return () => {
      clearInterval(id)
      ctx.revert()
    }
  }, [play])

  useLayoutEffect(() => {
    if (!play) return
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } })
      tl.from('.hero-line .line-inner', {
        yPercent: 120,
        duration: 1.1,
        stagger: 0.1,
      })
        .from('.hero-sub', { autoAlpha: 0, y: 24, duration: 0.9 }, '-=0.6')
        .from('.hero-cta', { autoAlpha: 0, y: 20, duration: 0.7 }, '-=0.5')
        .from('.hero-meta', { autoAlpha: 0, duration: 0.8 }, '-=0.6')

      gsap.to('.hero-mark', {
        yPercent: 30,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
      })
      gsap.to('.hero-title', {
        yPercent: -12,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
      })
    }, root.current)
    return () => ctx.revert()
  }, [play])

  return (
    <section
      id="top"
      ref={root}
      className="relative min-h-[100svh] flex flex-col justify-between pt-28 pb-6 overflow-hidden"
    >
      <span
        className="hero-mark pointer-events-none select-none absolute -right-[6vw] top-[8vh] font-display text-acid/10 leading-none"
        style={{ fontSize: 'min(46vw, 620px)' }}
        aria-hidden
      >
        ✳
      </span>

      <div className="gutter relative z-10 flex-1 flex flex-col justify-center">
        <p className="hero-meta eyebrow text-bone2 mb-8 flex items-center gap-3">
          <span className="inline-block h-2 w-2 rounded-full bg-acid animate-pulse" />
          {hero.eyebrow}
        </p>

        <h1 className="hero-title font-display d-hero text-bone tracking-crush">
          <span className="hero-line line-mask">
            <span className="line-inner block">{hero.lead}</span>
          </span>
          <span className="hero-line line-mask">
            <span className="line-inner block whitespace-nowrap">
              <span className="serif-i text-acid lowercase">{hero.by} </span>
              <span className="rot-mask serif-i text-acid lowercase">
                <span ref={rotWord} className="rot-word">
                  {hero.rotating[0]}
                </span>
              </span>
            </span>
          </span>
        </h1>

        <div className="mt-10 flex flex-col md:flex-row md:items-end gap-8 md:gap-16 max-w-4xl">
          <p className="hero-sub text-lg md:text-xl text-bone2 max-w-md leading-snug">
            {hero.sub}
          </p>
          <MagneticButton
            as="a"
            href="#founders"
            onClick={(e) => {
              e.preventDefault()
              scrollTo('#founders')
            }}
            data-cursor="hover"
            data-cursor-label="Enter"
            className="hero-cta group inline-flex items-center gap-4 shrink-0"
          >
            <span className="grid place-items-center h-16 w-16 rounded-full bg-acid text-ink text-xl transition-transform group-hover:scale-110">
              ↓
            </span>
            <span className="font-medium text-bone">
              Start <br /> learning
            </span>
          </MagneticButton>
        </div>
      </div>

      <div className="hero-meta relative z-10 border-t border-bone/10 pt-4">
        <Marquee
          items={experience.map((e) => `${e.n} — ${e.label}`)}
          className="font-display text-2xl md:text-3xl text-bone/80"
          speed={70}
        />
      </div>
    </section>
  )
}
