import { useRef, useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { gsap } from '../../lib/smooth'

/**
 * RouteTransition — fades/slides the outlet content in on each pathname change.
 * Respects prefers-reduced-motion (no transform, instant show).
 */
export function RouteTransition({ children }) {
  const ref = useRef(null)
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // scroll the content region to top on navigation
    el.scrollTo?.(0, 0)
    window.scrollTo(0, 0)
    if (reduce) {
      gsap.set(el, { autoAlpha: 1, y: 0 })
      return
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(el, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out' })
    }, el)
    return () => ctx.revert()
  }, [pathname])

  return (
    <div ref={ref} className="min-h-full">
      {children}
    </div>
  )
}
