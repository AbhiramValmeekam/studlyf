import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'
import { SectionHeading } from '../ui/SectionHeading'
import { ArrowIcon } from '../ui/Button'
import { EASE } from '../../lib/motion'

export function Paths({ paths = [], intro }) {
  const [hovered, setHovered] = useState(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const x = useSpring(mx, { stiffness: 150, damping: 20 })
  const y = useSpring(my, { stiffness: 150, damping: 20 })
  const wrapRef = useRef(null)

  const onMove = (e) => {
    const r = wrapRef.current?.getBoundingClientRect()
    if (!r) return
    mx.set(e.clientX - r.left)
    my.set(e.clientY - r.top)
  }

  if (!paths.length) return null

  return (
    <section className="relative border-t border-line/10 py-28 md:py-36">
      <div className="wrap">
        <SectionHeading
          eyebrow={intro?.subtitle ? 'Ways in' : 'Ways in'}
          title={intro?.title || 'Four doors. One ecosystem.'}
          aside={
            <p className="text-mute">
              {intro?.subtitle || 'Pick the path that fits where you are today. They all connect.'}
            </p>
          }
        />

        <div ref={wrapRef} onMouseMove={onMove} className="relative mt-14">
          {/* Floating image preview follows the cursor (desktop). */}
          <AnimatePresence>
            {hovered?.image?.url && (
              <motion.div
                className="pointer-events-none absolute left-0 top-0 z-20 hidden aspect-[4/3] w-72 overflow-hidden rounded-2xl md:block"
                style={{ x, y, translateX: '-50%', translateY: '-50%' }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, ease: EASE }}
              >
                <img src={hovered.image.url} alt="" className="h-full w-full object-cover" />
              </motion.div>
            )}
          </AnimatePresence>

          <ul className="border-t border-line/10">
            {paths.map((p, i) => {
              const internal = !p.cta?.url?.startsWith('http')
              const Row = internal ? Link : 'a'
              const rowProps = internal
                ? { to: p.cta?.url || '/' }
                : { href: p.cta?.url, target: '_blank', rel: 'noreferrer' }
              return (
                <li key={p.id || p.key}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.6, ease: EASE, delay: i * 0.06 }}
                  >
                    <Row
                      {...rowProps}
                      onMouseEnter={() => setHovered(p)}
                      onMouseLeave={() => setHovered(null)}
                      className="group flex items-center justify-between gap-6 border-b border-line/10 py-8 transition-colors duration-300 hover:bg-line/[0.02] md:py-10"
                    >
                      <div className="flex items-baseline gap-5 md:gap-10">
                        <span className="font-mono text-sm text-mute/60">0{i + 1}</span>
                        <div>
                          <h3 className="display-face text-mega leading-none tracking-tightest text-bone transition-colors duration-300 group-hover:text-acid">
                            {p.title}
                          </h3>
                          <p className="mt-3 max-w-md text-mute md:text-lg">{p.description}</p>
                        </div>
                      </div>
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line/15 text-mute transition-all duration-300 group-hover:border-acid group-hover:bg-acid group-hover:text-ink">
                        <ArrowIcon className="-rotate-45 transition-transform duration-300 group-hover:rotate-0" />
                      </span>
                    </Row>
                  </motion.div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
