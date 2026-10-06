import { useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'

// Scroll-reveal feature rows: as each row enters the viewport its copy drifts up
// and its image wipes in via an animated clip-path, alternating left/right.
//
// Adapted from a Next.js + TypeScript + shadcn snippet into this project's stack
// (Vite + plain JSX + Tailwind tokens): dropped 'use client', the `@/lib/utils`
// `cn`, and the demo hero/"The End" scaffolding. Each row is its own component
// so the Framer hooks run in a stable order (the original called useRef/useScroll
// /useTransform inside .map(), which breaks the Rules of Hooks). Honors
// prefers-reduced-motion by rendering everything static and fully visible.
function FeatureRow({ feature, reverse }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center start'] })
  const opacity = useTransform(scrollYProgress, [0, 0.7], [0, 1])
  const clipPath = useTransform(scrollYProgress, [0, 0.7], ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'])
  const y = useTransform(scrollYProgress, [0, 1], [-50, 0])
  const Icon = feature.icon

  return (
    <div
      ref={ref}
      className={`flex min-h-screen flex-col items-center justify-center gap-12 md:gap-24 ${
        reverse ? 'md:flex-row-reverse' : 'md:flex-row'
      }`}
    >
      <motion.div style={reduce ? undefined : { y }} className="max-w-sm">
        {feature.no && (
          <span className="mb-5 block font-mono text-sm tracking-[0.3em] text-acid">{feature.no}</span>
        )}
        {Icon && (
          <span className="mb-6 grid h-11 w-11 place-items-center rounded-full bg-acid/12 text-acid">
            <Icon size={20} strokeWidth={1.75} aria-hidden />
          </span>
        )}
        <h3 className="display-face text-huge leading-[0.98] tracking-tightest text-bone">
          {feature.title}
        </h3>
        <p className="mt-6 max-w-sm text-mute">{feature.description}</p>
      </motion.div>

      <motion.div style={reduce ? undefined : { opacity, clipPath }} className="relative shrink-0">
        <img
          src={feature.image}
          alt={feature.title}
          className="h-64 w-64 rounded-2xl object-cover shadow-[0_30px_80px_-30px_rgba(0,0,0,0.5)] md:h-80 md:w-80"
          loading="lazy"
        />
      </motion.div>
    </div>
  )
}

export function ParallaxFeatures({ features = [] }) {
  return (
    <div className="flex flex-col px-6 md:px-0">
      {features.map((feature, i) => (
        <FeatureRow key={feature.title} feature={feature} reverse={i % 2 === 1} />
      ))}
    </div>
  )
}
