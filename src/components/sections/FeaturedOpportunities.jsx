import { useRef, useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Link } from 'react-router-dom'
import { OpportunityCard } from '../ui/cards'
import { SectionHeading } from '../ui/SectionHeading'
import { ArrowIcon } from '../ui/Button'

gsap.registerPlugin(ScrollTrigger)

// Desktop: pin the section and translate the card track horizontally as you
// scroll (Apple-style scrubbed motion). Mobile / reduced-motion: a plain
// horizontal scroll strip.
export function FeaturedOpportunities({ items = [] }) {
  const section = useRef(null)
  const track = useRef(null)

  useLayoutEffect(() => {
    if (!items.length) return
    const mm = gsap.matchMedia()

    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      const el = track.current
      // Measured fresh (and re-measured on refresh via invalidateOnRefresh) so a
      // resize or late-loading content can't leave the pin length out of sync
      // with the real overflow.
      const distance = () => el.scrollWidth - el.parentElement.offsetWidth
      if (distance() <= 0) return

      const tween = gsap.to(el, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: section.current,
          start: 'top top',
          // 1:1 with the overflow: the section unpins the instant the last card
          // is revealed, so there's no dead pinned scroll once cards stop moving.
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      })
      return () => tween.scrollTrigger?.kill()
    })

    return () => mm.revert()
  }, [items])

  if (!items.length) return null

  return (
    <section ref={section} className="relative overflow-hidden py-28 min-[900px]:py-0 min-[900px]:min-h-[100svh] min-[900px]:flex min-[900px]:flex-col min-[900px]:justify-center">
      <div className="wrap w-full">
        <SectionHeading
          eyebrow="Opportunities"
          title="Open for applications."
          aside={
            <Link to="/opportunities" className="group inline-flex items-center gap-2 text-bone">
              Browse all
              <ArrowIcon className="transition-transform group-hover:translate-x-1" />
            </Link>
          }
        />
      </div>

      <div className="mt-12 md:mt-16">
        {/* No data-lenis-prevent: on desktop this track is GSAP-pinned and
            scrubbed by the page scroll, so the wheel must reach Lenis; blocking
            it froze the pin and trapped scroll over this section. On mobile the
            native overflow-x strip scrolls horizontally without it. */}
        <div
          ref={track}
          className="flex gap-6 overflow-x-auto px-[max(1rem,calc((100vw-1600px)/2+1rem))] pb-4 [scrollbar-width:none] min-[900px]:overflow-visible min-[900px]:px-[max(1rem,calc((100vw-1600px)/2+3.5rem))] min-[900px]:pb-0 [&::-webkit-scrollbar]:hidden"
        >
          {items.map((opp, i) => (
            <div key={opp.id} className="w-[82vw] shrink-0 sm:w-[380px]">
              <OpportunityCard opp={opp} index={i} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
