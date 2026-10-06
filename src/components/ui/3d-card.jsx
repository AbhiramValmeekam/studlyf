import * as React from 'react'
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'

// Adapted from a 21st.dev "3D tilt" card for this Vite + JSX + Tailwind project.
// There is no shadcn / TypeScript here, so instead of `cn` + `bg-background`/
// `border-border` tokens this uses plain className strings and the project's own
// design tokens (--line / --bone). The tilt is disabled under prefers-reduced-motion.

const SPRING = { damping: 15, stiffness: 150 }

// Reusable wrapper: tilts its children toward the cursor in 3D. Drop any card
// inside it. `max` is the tilt amount in degrees; `perspective` sets the depth.
export function TiltCard({ children, className = '', max = 10.5, perspective = 1000 }) {
  const reduce = useReducedMotion()
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springX = useSpring(mouseX, SPRING)
  const springY = useSpring(mouseY, SPRING)
  const rotateX = useTransform(springY, [-0.5, 0.5], [`${max}deg`, `-${max}deg`])
  const rotateY = useTransform(springX, [-0.5, 0.5], [`-${max}deg`, `${max}deg`])

  // Reduced-motion users (and touch, where there's no hover) get a plain card.
  if (reduce) return <div className={className}>{children}</div>

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5)
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5)
  }
  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <div style={{ perspective }} className={className}>
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className="h-full w-full"
      >
        {children}
      </motion.div>
    </div>
  )
}

// The full self-contained card from the source component, adapted to JSX. It
// layers title / subtitle / link / button at different translateZ depths so
// they float above the image while the whole card tilts. Give the *parent* a
// `perspective` (or wrap in <TiltCard>) for the 3D effect to read.
export const InteractiveTravelCard = React.forwardRef(function InteractiveTravelCard(
  { title, subtitle, imageUrl, actionText, href, onActionClick, className = '' },
  ref
) {
  const reduce = useReducedMotion()
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springX = useSpring(mouseX, SPRING)
  const springY = useSpring(mouseY, SPRING)
  const rotateX = useTransform(springY, [-0.5, 0.5], ['10.5deg', '-10.5deg'])
  const rotateY = useTransform(springX, [-0.5, 0.5], ['-10.5deg', '10.5deg'])

  const handleMouseMove = (e) => {
    if (reduce) return
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5)
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5)
  }
  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={reduce ? undefined : { rotateX, rotateY, transformStyle: 'preserve-3d' }}
      className={`relative h-[26rem] w-80 rounded-2xl border border-line/20 bg-transparent shadow-2xl ${className}`}
    >
      <div
        style={{ transform: 'translateZ(50px)', transformStyle: 'preserve-3d' }}
        className="absolute inset-4 grid h-[calc(100%-2rem)] w-[calc(100%-2rem)] grid-rows-[1fr_auto] rounded-xl shadow-lg"
      >
        <img
          src={imageUrl}
          alt={`${title}, ${subtitle}`}
          className="absolute inset-0 h-full w-full rounded-xl object-cover"
        />
        <div className="absolute inset-0 h-full w-full rounded-xl bg-gradient-to-b from-black/20 via-transparent to-black/60" />

        <div className="relative flex flex-col justify-between rounded-xl p-4 text-white">
          <div className="flex items-start justify-between">
            <div>
              <motion.h2 style={{ transform: 'translateZ(50px)' }} className="text-2xl font-bold">
                {title}
              </motion.h2>
              <motion.p
                style={{ transform: 'translateZ(40px)' }}
                className="text-sm font-light text-white/80"
              >
                {subtitle}
              </motion.p>
            </div>
            <motion.a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.1, rotate: '2.5deg' }}
              whileTap={{ scale: 0.9 }}
              aria-label={`Learn more about ${title}`}
              style={{ transform: 'translateZ(60px)' }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm ring-1 ring-inset ring-white/30 transition-colors hover:bg-white/30"
            >
              <ArrowUpRight className="h-5 w-5 text-white" />
            </motion.a>
          </div>

          <motion.button
            onClick={onActionClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{ transform: 'translateZ(40px)' }}
            className="w-full rounded-lg bg-white/10 py-3 text-center font-semibold text-white ring-1 ring-inset ring-white/20 backdrop-blur-md transition-colors hover:bg-white/20"
          >
            {actionText}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
})
