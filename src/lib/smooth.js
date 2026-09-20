import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export let lenis = null

/**
 * Wires Lenis smooth scroll into GSAP's ticker + ScrollTrigger.
 * Call once, high in the tree. Disabled for reduced-motion / touch.
 */
export function useSmoothScroll(enabled = true) {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!enabled || reduce) return

    lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
    })

    // Start at the very top — never resume a restored scroll position.
    lenis.scrollTo(0, { immediate: true, force: true })
    window.scrollTo(0, 0)

    lenis.on('scroll', ScrollTrigger.update)

    const onTick = (time) => lenis.raf(time * 1000)
    gsap.ticker.add(onTick)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(onTick)
      lenis.destroy()
      lenis = null
    }
  }, [enabled])
}

export function scrollTo(target, opts = {}) {
  if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.2, ...opts })
  else {
    const el = typeof target === 'string' ? document.querySelector(target) : target
    el?.scrollIntoView({ behavior: 'smooth' })
  }
}

export { gsap, ScrollTrigger }
