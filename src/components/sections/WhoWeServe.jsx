import { motion } from 'framer-motion'
import { SectionHeading } from '../ui/SectionHeading'
import { whoWeServe } from '../../data/studlyf'
import { EASE, inView } from '../../lib/motion'

export function WhoWeServe() {
  return (
    <section className="relative py-28 md:py-36">
      <div className="wrap">
        <SectionHeading eyebrow="Audience" title="Two sides, one platform." />

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {whoWeServe.map((group, gi) => (
            <motion.div
              key={group.audience}
              className={`card-surface p-8 md:p-10 ${gi === 1 ? 'lg:mt-10' : ''}`}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={inView}
              transition={{ duration: 0.6, ease: EASE, delay: gi * 0.1 }}
            >
              <div className="mb-6 flex items-center justify-between">
                <h3 className="display-face text-3xl tracking-tight">{group.audience}</h3>
                <span
                  className={`grid h-11 w-11 place-items-center rounded-full font-mono text-sm ${
                    gi === 0 ? 'bg-acid text-ink' : 'bg-violet text-white'
                  }`}
                >
                  {gi === 0 ? 'S' : 'C'}
                </span>
              </div>
              <ul className="space-y-4">
                {group.points.map((pt) => (
                  <li key={pt} className="flex items-start gap-3 border-b border-line/8 pb-4 text-bone/90 last:border-0">
                    <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-acid" />
                    {pt}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
