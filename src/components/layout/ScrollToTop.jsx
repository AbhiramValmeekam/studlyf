import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useLenis } from '../../lib/lenis'

// Reset scroll on route change (skips hash links). Works with or without Lenis.
export function ScrollToTop() {
  const { pathname, hash } = useLocation()
  const lenisRef = useLenis()

  useEffect(() => {
    if (hash) return
    const lenis = lenisRef?.current
    if (lenis) lenis.scrollTo(0, { immediate: true })
    else window.scrollTo(0, 0)
  }, [pathname, hash, lenisRef])

  return null
}
