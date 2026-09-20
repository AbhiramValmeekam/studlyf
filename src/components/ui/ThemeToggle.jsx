import { useTheme } from '../../context/ThemeContext'

/**
 * ThemeToggle — sun/moon switch that flips the app between dark and light.
 * Icons are inline SVG so they inherit currentColor and stay crisp.
 */
export function ThemeToggle({ className = '' }) {
  const { theme, toggle } = useTheme()
  const isLight = theme === 'light'
  return (
    <button
      onClick={toggle}
      data-cursor="hover"
      aria-label={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
      title={isLight ? 'Dark mode' : 'Light mode'}
      className={`grid place-items-center h-9 w-9 rounded-full border border-bone/20 text-bone2 hover:text-bone hover:border-bone/50 transition-colors ${className}`}
    >
      {isLight ? (
        // moon
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        // sun
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      )}
    </button>
  )
}
