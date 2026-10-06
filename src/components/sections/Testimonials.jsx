import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar } from '../ui/atoms'
import { EASE } from '../../lib/motion'

export function Testimonials({ items = [] }) {
  const [i, setI] = useState(0)
  const count = items.length

  const go = useCallback((n) => setI((prev) => (n + count) % count), [count])

  useEffect(() => {
    if (count < 2) return
    const t = setInterval(() => setI((p) => (p + 1) % count), 6000)
    return () => clearInterval(t)
  }, [count])

  if (!count) return null
  const t = items[i]

  return (
    <section className="relative overflow-hidden border-t border-line/10 py-28 md:py-40">
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[40vw] w-[40vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet/10 blur-[140px]" />
      <div className="wrap max-w-4xl text-center">
        <p className="eyebrow mb-10 justify-center">In their words</p>

        <div className="relative min-h-[280px]">
          <AnimatePresence mode="wait">
            <motion.figure
              key={t.id || i}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <blockquote className="display-face text-balance text-[clamp(1.7rem,3.6vw,3rem)] font-medium leading-[1.08] tracking-tight text-bone">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-10 flex items-center justify-center gap-4">
                <Avatar src={t.photo?.url} name={t.personName} size={52} />
                <div className="text-left">
                  <p className="font-semibold text-bone">{t.personName}</p>
                  <p className="text-sm text-mute">
                    {[t.designation, t.organization].filter(Boolean).join(', ')}
                  </p>
                </div>
              </figcaption>
            </motion.figure>
          </AnimatePresence>
        </div>

        {count > 1 && (
          <div className="mt-12 flex items-center justify-center gap-2.5">
            {items.map((_, n) => (
              <button
                key={n}
                onClick={() => go(n)}
                aria-label={`Testimonial ${n + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  n === i ? 'w-8 bg-acid' : 'w-1.5 bg-line/25 hover:bg-line/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
