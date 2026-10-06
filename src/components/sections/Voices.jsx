import { SectionHeading } from '../ui/SectionHeading'
import { Badge } from '../ui/atoms'
import { testimonials } from '../../data/studlyf'

function Stars() {
  return (
    <div className="flex gap-0.5 text-acid" aria-label="5 out of 5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
          <path d="M8 1l2.1 4.3 4.7.7-3.4 3.3.8 4.7L8 11.8 3.8 14l.8-4.7L1.2 6l4.7-.7L8 1z" />
        </svg>
      ))}
    </div>
  )
}

function Card({ t }) {
  return (
    <figure className="card-surface flex w-[85vw] max-w-[380px] shrink-0 flex-col p-6 sm:w-[380px]">
      <Stars />
      <blockquote className="mt-4 text-bone/90">“{t.quote}”</blockquote>
      <figcaption className="mt-5">
        <Badge tone="violet">{t.tag}</Badge>
      </figcaption>
    </figure>
  )
}

// One row = the same set rendered twice inside a translating track, so the loop
// is seamless. `reverse` sends the row the other way; `duration` sets its pace.
function MarqueeRow({ items, reverse = false, duration = 60 }) {
  return (
    <div
      className="marquee-row"
      style={{ '--mq-duration': `${duration}s`, '--mq-dir': reverse ? 'reverse' : 'normal' }}
    >
      {[0, 1].map((g) => (
        <div key={g} className="marquee-group" aria-hidden={g === 1}>
          {items.map((t, i) => (
            <Card key={i} t={t} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function Voices() {
  const rowA = testimonials.slice(0, 5)
  const rowB = testimonials.slice(5)

  return (
    <section className="relative py-28 md:py-36">
      <div className="wrap">
        <SectionHeading
          eyebrow="Testimonials"
          title="What builders say."
          aside={<p className="text-mute">From students building real careers with STUDLYF.</p>}
        />
      </div>

      {/* Full-bleed marquee: rows drift past the viewport edges, so they sit
          outside the centred .wrap and fade at both sides. */}
      <div className="mt-14 flex flex-col gap-6">
        <MarqueeRow items={rowA} duration={58} />
        <MarqueeRow items={rowB} reverse duration={48} />
      </div>
    </section>
  )
}
