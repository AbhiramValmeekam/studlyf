import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const ThemeContext = createContext(null)
const STORAGE_KEY = 'studlyf-theme'

function getInitial() {
  if (typeof window === 'undefined') return 'dark'
  // The inline pre-paint script in index.html has already resolved the saved theme and
  // written it to <html>. Adopt that decision verbatim: re-deriving it here risks React
  // landing on a different answer than what is painted, which would fire a second, visible
  // theme change on mount.
  const applied = window.__STUDLYF_THEME__
  if (applied === 'light' || applied === 'dark') return applied
  // Fallback for when the script didn't run (JS-injected HTML, tests, SSR-less edge cases).
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* ignore */
  }
  return 'dark' // brand default is the dark editorial theme
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitial)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.style.colorScheme = theme
    // Keep the pre-paint script's marker in sync with what is actually applied, so it stays
    // a true mirror of <html>. Without this a later remount (HMR) would read the stale
    // load-time value and silently revert a toggle.
    window.__STUDLYF_THEME__ = theme
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.content = theme === 'light' ? '#f6f6f3' : '#08080a'
  }, [theme])

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [])

  return <ThemeContext.Provider value={{ theme, toggle, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
