import { useEffect } from 'react'

const SITE = (import.meta.env.VITE_SITE_URL || 'https://studlyf.in').replace(/\/$/, '')
const DEFAULT_TITLE = 'STUDLYF'

function setMeta(selector, attr, key, content) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
  return el
}

/**
 * Per-page title, meta description, canonical URL and Open Graph basics for the SPA.
 * Restores the previous title on unmount so pages without SEO config don't inherit stale tags.
 */
export function useSeo({ title, description, path }) {
  useEffect(() => {
    const prevTitle = document.title
    if (title) document.title = title
    if (description) {
      setMeta('meta[name="description"]', 'name', 'description', description)
      setMeta('meta[property="og:description"]', 'property', 'og:description', description)
    }
    if (title) setMeta('meta[property="og:title"]', 'property', 'og:title', title)
    let canonical = null
    if (path) {
      canonical = document.head.querySelector('link[rel="canonical"]')
      if (!canonical) {
        canonical = document.createElement('link')
        canonical.setAttribute('rel', 'canonical')
        document.head.appendChild(canonical)
      }
      canonical.setAttribute('href', `${SITE}${path}`)
      setMeta('meta[property="og:url"]', 'property', 'og:url', `${SITE}${path}`)
    }
    return () => {
      document.title = prevTitle || DEFAULT_TITLE
      canonical?.remove()
    }
  }, [title, description, path])
}
