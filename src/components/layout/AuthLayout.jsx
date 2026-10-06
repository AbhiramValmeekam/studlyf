import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { EASE } from '../../lib/motion'
import AnimatedGradient from '../ui/animated-gradient'
import { ThemeToggle } from '../ui/ThemeToggle'
import { brandGradient } from '../../lib/brand-gradient'
import { useTheme } from '../../context/ThemeContext'
import { ECOSYSTEMS, ECOSYSTEM_KEYS } from '../../lib/ecosystems'

// Split auth shell: form on the left, brand panel on the right.
//
// The panel is STUDLYF's own backdrop, not a stock gradient — the same WebGL wash
// (lib/brand-gradient) that runs behind the signed-in app and every ecosystem landing,
// so signing in already looks like the product you're signing into. It is theme-aware
// and falls back to the static CSS gradient under prefers-reduced-motion, exactly as
// SiteLayout does. Shared by Login, Register, Forgot/Reset password and Verify email.
export function AuthLayout({ title, subtitle, children, footer, aside, eyebrow }) {
  const reduce = useReducedMotion()
  const { theme } = useTheme()
  const light = theme === 'light'

  return (
    <div className="grid min-h-[100svh] bg-ink lg:grid-cols-2">
      {/* Form */}
      <main className="flex flex-col px-6 py-8 lg:px-16">
        {/* These auth routes render outside SiteLayout, so there is no Nav here to carry the
            controls — the escape hatch back to the site and the theme switch live in this bar. */}
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-line/15 px-4 py-2 text-sm text-mute transition-colors duration-300 hover:border-line/40 hover:text-bone"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to home
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center py-12">
          <motion.div
            className="w-full max-w-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <Link to="/" className="mb-10 inline-block display-face text-2xl tracking-crush lg:hidden">
              STUDLYF<span className="text-acid">.</span>
            </Link>
            {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
            <h1 className="display-face text-4xl tracking-tight">{title}</h1>
            {subtitle && <p className="mt-3 text-mute">{subtitle}</p>}
            <div className="mt-9">{children}</div>
            {footer && <div className="mt-8 text-sm text-mute">{footer}</div>}
          </motion.div>
        </div>
      </main>

      {/* Brand panel — the STUDLYF wash, live. */}
      <aside className="relative hidden overflow-hidden bg-ink2 lg:block">
        {reduce ? (
          <div
            aria-hidden
            className={
              light
                ? 'absolute inset-0 h-full w-full bg-gradient-to-br from-[#F3F1FB] via-[#e4dcff] to-[#f7d8e8]'
                : 'absolute inset-0 h-full w-full bg-gradient-to-br from-[#08060F] via-[#3a1d80] to-[#7a2b52]'
            }
          />
        ) : (
          // AnimatedGradient's own wrapper pins z-index:-1; lift it into this panel's
          // stacking order so it paints above the panel fill instead of behind the page.
          <AnimatedGradient config={brandGradient(light)} style={{ zIndex: 0 }} />
        )}
        {/* Scrim tracks --ink so the headline stays legible over a moving wash. */}
        <div
          aria-hidden
          className={
            light
              ? 'absolute inset-0 bg-gradient-to-b from-ink/20 via-ink/45 to-ink/70'
              : 'absolute inset-0 bg-gradient-to-b from-ink/25 via-ink/50 to-ink/80'
          }
          style={{ zIndex: 1 }}
        />

        <div className="grain relative z-10 flex h-full flex-col justify-between p-14">
          <Link to="/" className="display-face text-3xl tracking-crush">
            STUDLYF<span className="text-acid">.</span>
          </Link>

          <div>
            <p className="display-face max-w-md text-balance text-[clamp(2rem,3vw,3.2rem)] leading-[1.02] tracking-tight">
              {aside || 'Build what matters. Prove it. Get discovered.'}
            </p>
          </div>

          {/* The five ecosystems the one account carries — real destinations, not decoration. */}
          <ul className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-xs uppercase tracking-[0.2em] text-mute">
            {ECOSYSTEM_KEYS.map((k, i) => (
              <li key={k} className="flex items-center gap-3">
                {i > 0 && <span aria-hidden className="text-mute/40">·</span>}
                {ECOSYSTEMS[k].label === 'HR & Talent' ? 'HR' : ECOSYSTEMS[k].label}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}

// Maps ApiError.details[] to a { field: message } object for inline errors.
export function fieldErrors(err) {
  const out = {}
  if (err?.details?.length) { for (const d of err.details) if (d.field && !out[d.field]) out[d.field] = d.message }
  return out
}
