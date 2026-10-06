import { motion } from 'framer-motion'
import { Marquee } from '../ui/Marquee'
import { LogoChip } from '../ui/LogoChip'
import { AnimatedNumber } from '../ui/AnimatedNumber'
import { platformStats, institutions } from '../../data/studlyf'
import { EASE, inView } from '../../lib/motion'

export function Institutions() {
  return (
    <section className="relative py-28 md:py-32">
      <div className="wrap text-center">
        <p className="eyebrow mb-5 justify-center">Institutions</p>
        <h2 className="display-face mx-auto max-w-3xl text-balance text-huge">
          Where talent, startups and opportunity meet.
        </h2>
      </div>

      {/* Stats */}
      <div className="wrap mt-16">
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 lg:grid-cols-4">
          {platformStats.map((s, i) => (
            <motion.div
              key={s.label}
              className="border-l border-line/12 pl-5 text-left"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={inView}
              transition={{ duration: 0.5, ease: EASE, delay: i * 0.08 }}
            >
              <div className="display-face whitespace-nowrap text-4xl leading-none tracking-tightest tabular-nums sm:text-5xl lg:text-[3.25rem]">
                <AnimatedNumber value={s.value} />
                <span className="text-acid">{s.suffix}</span>
              </div>
              <p className="mt-3 text-sm text-mute">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* College logos */}
      <div className="mt-20">
        <Marquee speed={48}>
          {institutions.map((c) => (
            <LogoChip key={c.name} src={c.logo} name={c.name} />
          ))}
        </Marquee>
      </div>
    </section>
  )
}
