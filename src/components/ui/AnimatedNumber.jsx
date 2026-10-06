import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

// Counts up to `value` the first time it scrolls into view.
export function AnimatedNumber({ value = 0, duration = 1.6, className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
    const target = Number(value) || 0
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(target)
      return
    }
    let raf
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - start) / (duration * 1000))
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, value, duration])

  return (
    <span ref={ref} className={className}>
      {display.toLocaleString()}
    </span>
  )
}
