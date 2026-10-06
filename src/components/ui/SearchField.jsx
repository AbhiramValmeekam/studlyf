import { useEffect, useState, useRef } from 'react'

// Debounced search input. Fires onSearch after the user stops typing.
export function SearchField({ value = '', onSearch, placeholder = 'Search…', delay = 350, autoFocus }) {
  const [local, setLocal] = useState(value)
  const first = useRef(true)

  // Keep in sync when the URL-driven value changes externally.
  useEffect(() => setLocal(value), [value])

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const t = setTimeout(() => onSearch(local.trim()), delay)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local])

  return (
    <div className="relative max-w-xl">
      <svg
        className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-mute"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden
      >
        <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
        <path d="M14 14l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={local}
        autoFocus={autoFocus}
        onChange={(e) => setLocal(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSearch(local.trim())}
        placeholder={placeholder}
        className="h-14 w-full rounded-full border border-line/12 bg-ink2/60 pl-14 pr-5 text-bone placeholder:text-mute/60 outline-none transition-colors duration-200 focus:border-acid/60 focus:bg-ink2"
      />
    </div>
  )
}
