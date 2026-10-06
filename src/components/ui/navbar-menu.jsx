import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

// Aceternity "navbar-menu" adapted to this stack: Next's Link/Image swapped for
// react-router + <img>, TS types dropped, and the black/white + dark: styling
// replaced with the site's design tokens (bone/mute/ink2/line/acid) so it reads
// correctly in both themes. framer-motion's layoutId drives the springy morph of
// the dropdown as the pointer moves between items.
const transition = {
  type: 'spring',
  mass: 0.5,
  damping: 11.5,
  stiffness: 100,
  restDelta: 0.001,
  restSpeed: 0.001,
}

export function MenuItem({ setActive, active, item, children }) {
  return (
    <div onMouseEnter={() => setActive(item)} className="relative">
      <motion.p
        transition={{ duration: 0.3 }}
        className="cursor-pointer text-sm text-mute transition-colors hover:text-bone"
      >
        {item}
      </motion.p>
      {active !== null && (
        <motion.div initial={{ opacity: 0, scale: 0.85, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={transition}>
          {active === item && (
            // `top-full` keeps the panel flush with the trigger's bottom (inside
            // the nav's hover region) and `pt-5` is a transparent, still-hoverable
            // bridge — without it the cursor crosses a dead gap, the nav's
            // onMouseLeave fires, and the menu closes before you can click.
            <div className="absolute left-1/2 top-full -translate-x-1/2 transform pt-5">
              <motion.div
                transition={transition}
                layoutId="active"
                className="glass overflow-hidden rounded-2xl border border-line/10 shadow-2xl"
              >
                <motion.div layout className="h-full w-max p-2">
                  {children}
                </motion.div>
              </motion.div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

export function Menu({ setActive, children, className = '' }) {
  return (
    <nav
      onMouseLeave={() => setActive(null)}
      className={`glass relative flex items-center justify-center gap-6 rounded-full border border-line/10 px-6 py-2.5 shadow-2xl ${className}`}
    >
      {children}
    </nav>
  )
}

export function HoveredLink({ children, className = '', ...rest }) {
  return (
    <Link {...rest} className={`text-mute transition-colors hover:text-bone ${className}`}>
      {children}
    </Link>
  )
}

export function ProductItem({ title, description, href, src }) {
  return (
    <Link to={href} className="flex space-x-2">
      <img src={src} width={140} height={70} alt={title} className="flex-shrink-0 rounded-md shadow-2xl" />
      <div>
        <h4 className="mb-1 text-xl font-bold text-bone">{title}</h4>
        <p className="max-w-[10rem] text-sm text-mute">{description}</p>
      </div>
    </Link>
  )
}
