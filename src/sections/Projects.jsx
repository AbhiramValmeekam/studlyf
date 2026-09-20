import { useRef, useLayoutEffect } from 'react'
import { gsap } from '../lib/smooth'
import { founders } from '../data/studlyf'

function Card({ f, i }) {
  return (
    <article
      data-cursor="hover"
      data-cursor-label="Read"
      className="shrink-0 w-[80vw] sm:w-[56vw] md:w-[34vw] relative flex flex-col justify-between rounded-[4px] border border-bone/10 overflow-hidden group"
      style={{ background: 'linear-gradient(160deg, #141416, #0c0c0d)' }}
    >
      <div className="relative h-72 md:h-80 overflow-hidden bg-ink">
        <img
          src={f.img}
          alt={f.name}
          loading="lazy"
          className="h-full w-full object-cover object-[center_30%] grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0d] via-transparent to-transparent" />
        <span className="absolute top-4 left-4 font-display text-lg text-bone/80">
          {String(i + 1).padStart(2, '0')}
        </span>
      </div>

      <div className="relative p-8 md:p-10 flex-1 flex flex-col">
        <div className="border-b border-bone/10 pb-5 mb-6">
          <h3 className="font-display text-2xl md:text-3xl text-acid tracking-crush">{f.name}</h3>
          <p className="mt-1 text-sm text-bone2">{f.role}</p>
        </div>
        <blockquote className="serif-i text-xl md:text-2xl leading-snug text-bone">
          “{f.quote}”
        </blockquote>
      </div>
    </article>
  )
}

export default function Projects() {
  const root = useRef(null)
  const track = useRef(null)

  // Auto-scroll the cards on their own — a seamless, continuous marquee that
  // does not depend on page scroll. The track holds two copies of the cards;
  // we translate by exactly one copy's width, then loop.
  useLayoutEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const ctx = gsap.context(() => {
      const el = track.current
      // half = width of one full set (we render the cards twice)
      const half = () => el.scrollWidth / 2
      const tween = gsap.to(el, {
        x: () => -half(),
        ease: 'none',
        duration: () => half() / 90, // ~90px/sec — calm, readable pace
        repeat: -1,
        modifiers: {
          // wrap x within [0, -half) so the loop is seamless
          x: gsap.utils.unitize((x) => (parseFloat(x) % half()), 'px'),
        },
      })
      // pause while hovering so a card can be read
      el.addEventListener('mouseenter', () => tween.pause())
      el.addEventListener('mouseleave', () => tween.play())
    }, root.current)
    return () => ctx.revert()
  }, [])

  return (
    <section id="projects" ref={root} className="relative overflow-hidden bg-ink2 py-[9vh]">
      {/* compact intro header — heading left, blurb right, so the cards below
          stay within the viewport instead of being pushed under the fold */}
      <div className="gutter mb-10 grid md:grid-cols-12 gap-y-4 md:gap-8 items-end">
        <div className="md:col-span-8">
          <span className="eyebrow text-acid mb-4 block">02 — Learning Paths</span>
          <h2 className="font-display d-2 text-bone tracking-crush">
            Company-specific <span className="serif-i text-acid lowercase">learning paths.</span>
          </h2>
        </div>
        <p className="md:col-span-4 text-bone2 md:pb-2">
          The mindsets that built the world&apos;s leading companies — the standard every STUDLYF
          path is measured against.
        </p>
      </div>

      {/* self-moving card track (two copies for a seamless loop) */}
      <div className="relative overflow-hidden">
        <div ref={track} className="flex items-stretch gap-6 md:gap-10 w-max px-[var(--gutter)]">
          {founders.map((f, i) => (
            <Card key={`a-${f.name}`} f={f} i={i} />
          ))}
          {founders.map((f, i) => (
            <Card key={`b-${f.name}`} f={f} i={i} />
          ))}
        </div>
      </div>

      {/* outro CTA */}
      <div className="gutter mt-[8vh] flex items-center gap-8">
        <h3 className="font-display d-2 text-bone">Your path?</h3>
        <a
          href="#footer"
          className="inline-flex w-fit rounded-full bg-acid text-ink px-6 py-3 font-medium"
          data-cursor="hover"
          data-cursor-label="Start"
        >
          Start your path ↗
        </a>
      </div>
    </section>
  )
}
