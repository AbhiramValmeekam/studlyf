import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import MagneticButton from './MagneticButton'
import { CharFlip } from './AnimatedText'
import { ThemeToggle } from './ui/ThemeToggle'
import { scrollTo } from '../lib/smooth'
import { meta } from '../data/studlyf'

const LINKS = [
  { label: 'Explore', href: '#entry' },
  { label: 'For You', href: '#builders' },
  { label: 'Resources', href: '#resources' },
]

export default function Navbar({ ready }) {
  const [hidden, setHidden] = useState(false)
  const [open, setOpen] = useState(false)
  const lastY = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setHidden(y > 240 && y > lastY.current)
      lastY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const go = (e, href) => {
    e.preventDefault()
    setOpen(false)
    scrollTo(href)
  }

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-[80] transition-transform duration-500 ${
          hidden ? '-translate-y-full' : 'translate-y-0'
        } ${ready ? 'opacity-100' : 'opacity-0'}`}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <nav className="gutter flex items-center justify-between h-20 mix-blend-difference text-bone">
          <a
            href="#top"
            onClick={(e) => go(e, '#top')}
            className="inline-flex items-center"
            data-cursor
            aria-label="STUDLYF home"
          >
            <img src={meta.logo} alt="STUDLYF" className="h-7 md:h-8 w-auto" />
          </a>

          <div className="hidden md:flex items-center gap-9 text-sm font-medium">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={(e) => go(e, l.href)} data-cursor>
                <CharFlip text={l.label} />
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link to="/login" data-cursor className="hidden sm:inline-flex text-sm font-medium hover:text-acid transition-colors">
              <CharFlip text="Login" />
            </Link>
            <MagneticButton
              as={Link}
              to="/login"
              data-cursor="hover"
              data-cursor-label="Join"
              className="hidden sm:inline-flex items-center gap-2 rounded-full border border-bone/40 px-5 py-2.5 text-sm font-medium hover:bg-acid hover:text-ink hover:border-acid transition-colors"
            >
              Join STUDLYF
              <span className="text-acid group-hover:text-ink">↗</span>
            </MagneticButton>

            <button
              onClick={() => setOpen((v) => !v)}
              className="md:hidden flex flex-col gap-1.5 p-2"
              aria-label="Menu"
              data-cursor
            >
              <span className={`block h-px w-6 bg-current transition-transform ${open ? 'translate-y-[3px] rotate-45' : ''}`} />
              <span className={`block h-px w-6 bg-current transition-transform ${open ? '-translate-y-[3px] -rotate-45' : ''}`} />
            </button>
          </div>
        </nav>
      </header>

      {/* mobile sheet */}
      <div
        className={`fixed inset-0 z-[79] bg-ink flex flex-col justify-center gutter transition-all duration-500 md:hidden ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            onClick={(e) => go(e, l.href)}
            className="font-display d-2 text-bone py-2 border-b border-bone/10"
          >
            {l.label}
          </a>
        ))}
        <Link to="/login" onClick={() => setOpen(false)} className="font-display d-2 text-bone py-2 border-b border-bone/10">
          Login
        </Link>
        <Link
          to="/login"
          onClick={() => setOpen(false)}
          className="mt-8 inline-flex w-fit rounded-full bg-acid text-ink px-6 py-3 font-medium"
        >
          Join STUDLYF ↗
        </Link>
      </div>
    </>
  )
}
