import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const base =
  'relative inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-tight transition-colors duration-300 ease-swift select-none disabled:opacity-50 disabled:pointer-events-none'

const sizes = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-12 px-6 text-[0.95rem]',
  lg: 'h-14 px-8 text-base',
}

const variants = {
  primary: 'bg-acid text-ink hover:bg-acid/90',
  solid: 'bg-bone text-ink hover:bg-bone/90',
  outline: 'border border-line/25 text-bone hover:border-line/50 hover:bg-line/[0.04]',
  ghost: 'text-bone/80 hover:text-bone hover:bg-line/[0.06]',
  violet: 'bg-violet text-white hover:bg-violet/90',
}

// Magnetic pull: the button leans toward the cursor, the label leans a touch more.
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  to,
  href,
  magnetic = true,
  className = '',
  ...props
}) {
  const ref = useRef(null)
  const [t, setT] = useState({ x: 0, y: 0 })

  const onMove = (e) => {
    if (!magnetic || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const x = (e.clientX - (r.left + r.width / 2)) * 0.28
    const y = (e.clientY - (r.top + r.height / 2)) * 0.4
    setT({ x, y })
  }
  const reset = () => setT({ x: 0, y: 0 })

  const cls = `${base} ${sizes[size]} ${variants[variant]} ${className}`
  const inner = (
    <motion.span
      className="inline-flex items-center gap-2"
      animate={{ x: t.x * 0.4, y: t.y * 0.4 }}
      transition={{ type: 'spring', stiffness: 200, damping: 16 }}
    >
      {children}
    </motion.span>
  )

  const motionProps = {
    ref,
    className: cls,
    onMouseMove: onMove,
    onMouseLeave: reset,
    animate: { x: t.x, y: t.y },
    transition: { type: 'spring', stiffness: 200, damping: 16 },
  }

  if (to) {
    return (
      <motion.div {...motionProps} style={{ display: 'inline-flex' }}>
        <Link to={to} className="inline-flex items-center gap-2" {...props}>
          {children}
        </Link>
      </motion.div>
    )
  }
  if (href) {
    return (
      <motion.a href={href} {...motionProps} {...props}>
        {inner}
      </motion.a>
    )
  }
  return (
    <motion.button {...motionProps} {...props}>
      {inner}
    </motion.button>
  )
}

export function ArrowIcon({ className = '' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className={className} aria-hidden>
      <path
        d="M4 9h10M9 4l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
