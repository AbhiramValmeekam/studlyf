import { useEffect, useRef, createContext, useContext } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const LenisContext = createContext(null)
export const useLenis = () => useContext(LenisContext)

const prefersReduced =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Single registration point for smooth scroll + ScrollTrigger sync. Wrap the app
// once; children read the lenis instance from context for anchor scrolling.
export function SmoothScrollProvider({ children }) {
  const ref = useRef(null)

  useEffect(() => {
    if (prefersReduced) return

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    })
    ref.current = lenis

    lenis.on('scroll', ScrollTrigger.update)

    const onRaf = (time) => lenis.raf(time * 1000)
    gsap.ticker.add(onRaf)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(onRaf)
      lenis.destroy()
      ref.current = null
    }
  }, [])

  return <LenisContext.Provider value={ref}>{children}</LenisContext.Provider>
}
