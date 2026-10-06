import { motion } from 'framer-motion'
import { AnimatedNumber } from '../ui/AnimatedNumber'
import { EASE, inView } from '../../lib/motion'

export function Stats({ stats = [] }) {
  if (!stats.length) return null
  return (
    <section className="relative border-y border-line/10 bg-ink2/40 py-24 md:py-28">
      <div className="wrap">
        <div className="grid grid-cols-2 gap-x-8 gap-y-14 lg:grid-cols-4">
          {stats.slice(0, 4).map((s, i) => (
            <motion.div
              key={s.id || s.key}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={inView}
              transition={{ duration: 0.6, ease: EASE, delay: i * 0.08 }}
              className="border-l border-line/12 pl-5"
            >
              <div className="display-face text-mega leading-none tracking-tightest text-bone">
                <AnimatedNumber value={s.value} />
                {s.suffix && <span className="text-acid">{s.suffix}</span>}
              </div>
              <p className="mt-4 text-sm font-medium text-bone">{s.label}</p>
              {s.description && <p className="mt-1 text-sm text-mute">{s.description}</p>}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
