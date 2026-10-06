import { motion } from 'framer-motion'
import { BackToDashboard } from '../ecosystem/BackToDashboard'
import { EASE } from '../../lib/motion'

export function PageHeader({ eyebrow, title, subtitle, children }) {
  return (
    <header className="wrap border-b border-line/10 pb-12 pt-36 md:pt-44">
      {/* Renders only inside an ecosystem product area — the section pages that use this header
          (profile, opportunities, applications, projects) have no tab bar to carry the way back. */}
      <BackToDashboard className="mb-6" />
      {eyebrow && (
        <motion.p
          className="eyebrow mb-5 flex items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <span className="inline-block h-px w-8 bg-acid" />
          {eyebrow}
        </motion.p>
      )}
      <motion.h1
        className="display-face text-mega text-balance"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        {title}
      </motion.h1>
      {subtitle && (
        <motion.p
          className="mt-5 max-w-2xl text-lede text-mute"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.12 }}
        >
          {subtitle}
        </motion.p>
      )}
      {children && <div className="mt-8">{children}</div>}
    </header>
  )
}
