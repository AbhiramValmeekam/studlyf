import { createContext, useContext, useEffect, useState } from 'react'

/**
 * ThemeContext — flips a single `.light` class on <html>. Every neutral token
 * (ink/ink2/bone/bone2) is a CSS channel triplet, so the whole app + marketing
 * site invert with no markup changes. Defaults to dark; persists to localStorage.
 */
const ThemeContext = createContext(null)

const STORAGE_KEY = 'studlyf-theme'

function getInitial() {
  if (typeof window === 'undefined') return 'dark'
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* localStorage blocked — fall through to default */
  }
  return 'dark'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitial)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('light', theme === 'light')
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore persistence failure */
    }
  }, [theme])

  const toggle = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
