import SectionHeading from '../components/SectionHeading'
import { FadeUp } from '../components/AnimatedText'
import { resources } from '../data/studlyf'

export default function Resources() {
  return (
    <section id="resources" className="relative py-[14vh] gutter bg-ink2">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-14">
        <SectionHeading index="07" label={resources.eyebrow} lines={['Stay ahead of', 'what’s next.']} />
        <FadeUp>
          <p className="text-bone2 max-w-sm md:text-right">{resources.sub}</p>
        </FadeUp>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {resources.items.map((r, i) => (
          <FadeUp key={r.title} delay={(i % 3) * 0.06}>
            <article
              data-cursor="hover"
              data-cursor-label="Read"
              className="group h-full flex flex-col rounded-[4px] border border-bone/10 overflow-hidden bg-ink"
            >
              <div className="relative h-44 overflow-hidden">
                <img
                  src={r.img}
                  alt={r.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <span className="absolute top-3 left-3 eyebrow bg-ink/80 text-acid px-2.5 py-1 rounded-full">
                  {r.kind}
                </span>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="font-display text-xl text-bone leading-tight">{r.title}</h3>
                <p className="mt-3 text-sm text-bone2 leading-relaxed flex-1">{r.note}</p>
                <span className="mt-5 eyebrow text-bone group-hover:text-acid transition-colors">
                  Read more ↗
                </span>
              </div>
            </article>
          </FadeUp>
        ))}
      </div>
    </section>
  )
}
