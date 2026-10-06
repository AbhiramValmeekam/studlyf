import { CoverflowCarousel } from '../ui/coverflow-carousel'
import { SectionHeading } from '../ui/SectionHeading'
import { leaders } from '../../data/studlyf'

// Map the attributed-quote leaders onto coverflow slides. The carousel shows a
// big picture per leader and drops their name, role and quote underneath the
// active card; it auto-advances and pauses on hover / drag.
const slides = leaders.map((l) => ({
  src: l.photo || undefined,
  alt: l.name,
  title: l.name,
  subtitle: l.title,
  quote: l.quote,
  objectPosition: l.objectPosition,
}))

export function Leaders() {
  return (
    <section className="relative overflow-hidden py-28 md:py-32">
      <div className="wrap">
        <SectionHeading
          eyebrow="Visionaries"
          title="Learn from industry leaders."
          aside={<p className="text-mute">Insights from the people behind the world’s most influential companies.</p>}
        />
      </div>
      <div className="mt-10">
        <CoverflowCarousel
          slides={slides}
          label="Leaders and mentors"
          cardWidth="clamp(240px, 34vw, 420px)"
          autoPlay
          interval={3600}
          loop
          showNavigation
          showPagination
        />
      </div>
    </section>
  )
}
