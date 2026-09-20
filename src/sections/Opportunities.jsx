import SectionHeading from '../components/SectionHeading'
import { FadeUp } from '../components/AnimatedText'
import { whoWeServe } from '../data/studlyf'

export default function Opportunities() {
  return (
    <section id="opportunities" className="relative py-[14vh] gutter">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-14">
        <SectionHeading index="03" label="Who We Serve" lines={['Built for', 'everyone who builds.']} />
        <FadeUp>
          <p className="text-bone2 max-w-xs md:text-right">
            Startups, students and institutions — one ecosystem that turns learning into real
            engineering readiness.
          </p>
        </FadeUp>
      </div>

      <div className="grid md:grid-cols-3 gap-px bg-bone/12 border border-bone/12">
        {whoWeServe.groups.map((g, gi) => (
          <FadeUp key={g.name} delay={gi * 0.08}>
            <div className="bg-ink h-full p-8 md:p-10 flex flex-col">
              <h3 className="font-display text-3xl md:text-4xl text-acid tracking-crush mb-8">
                {g.name}
              </h3>
              <ul className="space-y-5 flex-1">
                {g.points.map((p) => (
                  <li key={p} className="flex gap-3 text-bone2 leading-snug">
                    <span className="text-acid shrink-0">—</span>
                    <span className="eyebrow">{p}</span>
                  </li>
                ))}
              </ul>
              <a
                href="#footer"
                className="link-underline inline-flex mt-8 text-bone font-medium w-fit"
                data-cursor
              >
                Learn more ↗
              </a>
            </div>
          </FadeUp>
        ))}
      </div>
    </section>
  )
}
