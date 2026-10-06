import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useLenis } from './lenis'

// Smooth-scroll to the `#section` in the URL once it is laid out. Used by pages
// whose sections are the targets of the nav bar's in-page anchor links.
export function useHashScroll() {
  const { hash } = useLocation()
  const lenisRef = useLenis()
  useEffect(() => {
    if (!hash) return
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(hash.slice(1))
      if (!el) return
      const lenis = lenisRef?.current
      if (lenis) lenis.scrollTo(el, { offset: -90 })
      else el.scrollIntoView({ behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(raf)
  }, [hash, lenisRef])
}
