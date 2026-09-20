import { useRef } from 'react'
import { gsap } from '../lib/smooth'

/**
 * Magnetic hover: element leans toward the cursor, springs back on leave.
 */
export default function MagneticButton({
  as: Tag = 'button',
  children,
  strength = 0.4,
  className = '',
  ...rest
}) {
  const ref = useRef(null)

  const onMove = (e) => {
    const el = ref.current
    const r = el.getBoundingClientRect()
    const x = (e.clientX - (r.left + r.width / 2)) * strength
    const y = (e.clientY - (r.top + r.height / 2)) * strength
    gsap.to(el, { x, y, duration: 0.6, ease: 'power3.out' })
  }
  const onLeave = () => {
    gsap.to(ref.current, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' })
  }

  return (
    <Tag
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
      {...rest}
    >
      {children}
    </Tag>
  )
}
