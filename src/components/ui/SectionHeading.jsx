import { motion } from 'framer-motion'
import { EASE, inView } from '../../lib/motion'

// Editorial section header: mono eyebrow + oversized title, optional aside.
// `accent` is a bg-* class for the eyebrow hairline so the header carries the
// page's persona color (defaults to the builder acid).
export function SectionHeading({ eyebrow, title, aside, accent = 'bg-acid', className = '' }) {
  return (
    <div className={`flex flex-col justify-between gap-6 md:flex-row md:items-end ${className}`}>
      <div>
        {eyebrow && (
          <motion.p
            className="eyebrow mb-4 flex items-center gap-3"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={inView}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <span className={`inline-block h-px w-8 ${accent}`} />
            {eyebrow}
          </motion.p>
        )}
        <motion.h2
          className="display-face text-huge text-balance"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={inView}
          transition={{ duration: 0.7, ease: EASE }}
        >
          {title}
        </motion.h2>
      </div>
      {aside && <div className="shrink-0 md:max-w-xs md:text-right">{aside}</div>}
    </div>
  )
}
