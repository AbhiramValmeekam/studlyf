// Shared Framer Motion easings + variants so reveals feel like one system.
export const EASE = [0.16, 1, 0.3, 1] // editorial ease-out
export const EASE_SWIFT = [0.4, 0, 0.1, 1]

export const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE },
  },
}

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.6, ease: EASE } },
}

export const stagger = (gap = 0.08, delay = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
})

// Default viewport config for whileInView reveals.
export const inView = { once: true, amount: 0.25, margin: '0px 0px -10% 0px' }

// Word/line reveal used by <SplitReveal>.
export const clipUp = {
  hidden: { y: '110%' },
  show: (i = 0) => ({
    y: '0%',
    transition: { duration: 0.85, ease: EASE, delay: i * 0.05 },
  }),
}

// Soft spring for pointer-driven parallax, tilt and magnetic motion.
export const SPRING = { type: 'spring', stiffness: 150, damping: 18, mass: 0.6 }

// Split a string into words for staggered clip-up headline reveals.
export const toWords = (s) => String(s).split(' ')
