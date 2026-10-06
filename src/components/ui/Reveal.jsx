import { motion, useReducedMotion } from 'framer-motion'
import { fadeUp, stagger, inView } from '../../lib/motion'

// Shared scroll-reveal primitives so every page speaks the same motion language.
// All degrade to a clean, fully-visible static state under prefers-reduced-motion.

// A single element that fades + rises into view once.
export function Reveal({ as = 'div', delay = 0, y = 24, className = '', children, ...rest }) {
  const reduce = useReducedMotion()
  const M = motion[as] || motion.div
  if (reduce) return <M className={className} {...rest}>{children}</M>
  return (
    <M
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={inView}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
      {...rest}
    >
      {children}
    </M>
  )
}

// A container that staggers its <RevealItem> children as the group scrolls in.
export function RevealGroup({ as = 'div', gap = 0.07, delay = 0, className = '', children, ...rest }) {
  const reduce = useReducedMotion()
  const M = motion[as] || motion.div
  if (reduce) return <M className={className} {...rest}>{children}</M>
  return (
    <M
      className={className}
      variants={stagger(gap, delay)}
      initial="hidden"
      whileInView="show"
      viewport={inView}
      {...rest}
    >
      {children}
    </M>
  )
}

export function RevealItem({ as = 'div', className = '', children, ...rest }) {
  const reduce = useReducedMotion()
  const M = motion[as] || motion.div
  if (reduce) return <M className={className} {...rest}>{children}</M>
  return (
    <M className={className} variants={fadeUp} {...rest}>
      {children}
    </M>
  )
}

// onMouseMove handler for `.spotlight-card`: writes the pointer position as --mx/--my
// custom properties directly on the node (no React state → no re-render).
export function trackSpotlight(e) {
  const el = e.currentTarget
  const rect = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${e.clientX - rect.left}px`)
  el.style.setProperty('--my', `${e.clientY - rect.top}px`)
}
