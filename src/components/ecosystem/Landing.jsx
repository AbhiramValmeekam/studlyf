import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { ECOSYSTEMS, startPath } from '../../lib/ecosystems'
import { track } from '../../lib/analytics'
import { useSeo } from '../../lib/seo'
import { useHashScroll } from '../../lib/useHashScroll'
import { EASE, inView, SPRING, toWords } from '../../lib/motion'
import { Button, ArrowIcon } from '../ui/Button'
import { SectionHeading } from '../ui/SectionHeading'
import AnimatedGradient from '../ui/animated-gradient'
import { brandGradient } from '../../lib/brand-gradient'

// Every ecosystem landing hero carries the SAME brand gradient as the signed-in dashboards
// (/builders/dashboard and friends) — those are the reference look. The config lives in
// lib/brand-gradient, so the marketing pages and the product can never drift apart in
// colour or pace.

// Building blocks for the five public ecosystem landing pages. Each page composes its own mix of
// sections, copy and product visual — these only keep the STUDLYF look consistent.

/** SEO + analytics + the role-aware CTA targets for one ecosystem landing page. */
export function useEcosystemLanding(key, seo) {
  const { user } = useAuth()
  useSeo(seo)
  useHashScroll()
  useEffect(() => {
    track('ecosystem_landing_view', { ecosystem: key, path: seo.path })
  }, [key, seo.path])
  const start = startPath(key, user)
  const state = user?.ecosystems?.[key]
  return {
    user,
    start,
    state,
    onStart: () => !user && track('signup_started', { ecosystem: key, source: 'landing' }),
    loginHref: '/login',
  }
}

/** Pointer handler: write cursor position (in px, relative to the element) onto --mx/--my.
    No React state — the glow is pure CSS off these custom properties, so no re-render fires. */
function trackPointer(e) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${e.clientX - r.left}px`)
  el.style.setProperty('--my', `${e.clientY - r.top}px`)
}

/** Kinetic headline: each word rises + fades on mount with a stagger. The resting state is
    fully visible, and under reduced-motion we render plain text — the hero copy can never be
    left invisible (preserving the original CSS-entrance guarantee). */
function HeadlineReveal({ text, className }) {
  const reduce = useReducedMotion()
  if (reduce) return <h1 className={className}>{text}</h1>
  return (
    <h1 className={className} aria-label={text}>
      {toWords(text).map((w, i, arr) => (
        <span key={`${w}-${i}`} className="inline-block whitespace-pre" aria-hidden>
          <motion.span
            className="inline-block"
            initial={{ y: '0.5em', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.12 + i * 0.05 }}
          >
            {w}
          </motion.span>
          {i < arr.length - 1 ? ' ' : ''}
        </span>
      ))}
    </h1>
  )
}

/** The hero product visual, given a subtle pointer-driven 3D tilt and a slow idle float.
    Both are transform-only (zero layout shift) and fully disabled under reduced-motion. */
function TiltVisual({ children }) {
  const reduce = useReducedMotion()
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rotateX = useSpring(my, SPRING)
  const rotateY = useSpring(mx, SPRING)
  if (reduce) return <div>{children}</div>
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 10)
    my.set(-((e.clientY - r.top) / r.height - 0.5) * 10)
  }
  const reset = () => {
    mx.set(0)
    my.set(0)
  }
  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      className="[transform-style:preserve-3d]"
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 7, ease: 'easeInOut', repeat: Infinity }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

export function LandingHero({ ecoKey, eyebrow, title, text, primary, secondary, visual, landing }) {
  const e = ECOSYSTEMS[ecoKey]
  const active = landing.state?.active
  const reduce = useReducedMotion()
  const { theme } = useTheme()
  const light = theme === 'light'
  return (
    <section
      onMouseMove={reduce ? undefined : trackPointer}
      className="grain relative isolate overflow-hidden pb-24 pt-32 md:pb-32 md:pt-44"
    >
      {/* Same hero background as the main landing page: the brand WebGL gradient, a scrim that
          fades it into the page, and one accent-tinted ambient glow. `isolate` keeps this stack
          above the page-level grid backdrop (SiteLayout → LandingBackdrop), which still shows
          through every section below the hero. */}
      <div className="hero-shader absolute inset-0 -z-10 overflow-hidden">
        <AnimatedGradient config={brandGradient(light)} className="h-full w-full" />
      </div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/25 via-transparent to-ink" />
      <div aria-hidden className="hero-ambient absolute inset-0 -z-10 overflow-hidden">
        <div className={`ambient-glow absolute left-1/2 top-1/3 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full ${e.accentBg} opacity-20 blur-[120px]`} />
      </div>
      {/* Cursor-tracked highlight layered over the shader (neutral so it reads under every
          persona accent). Painted after the shader/scrim so it sits above them; stays centered
          under reduced-motion since the pointer handler is then not attached. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70 [background:radial-gradient(32rem_32rem_at_var(--mx,50%)_var(--my,28%),rgb(var(--line)/0.10),transparent_60%)]"
      />
      <div className="wrap grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="eyebrow mb-6 flex animate-[fadeIn_.5s_ease-out_both] items-center gap-3">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${e.accentBg}`} />
            {eyebrow}
          </p>
          {/* JS word-reveal on mount with a plain-text reduced-motion fallback (see HeadlineReveal):
              hero copy and CTAs can never be left invisible. */}
          <HeadlineReveal
            text={title}
            className="display-face text-balance text-[clamp(2.6rem,6.4vw,5.8rem)] leading-[0.95] tracking-tight"
          />
          <p className="mt-7 max-w-xl animate-[fadeIn_.7s_ease-out_both] text-lede text-mute [animation-delay:320ms]">{text}</p>
          <div className="mt-10 flex animate-[fadeIn_.6s_ease-out_both] flex-wrap items-center gap-3 [animation-delay:440ms]">
            <Button to={landing.start} onClick={landing.onStart} size="lg" magnetic={false}>
              {active ? `Open ${e.label} dashboard` : primary} <ArrowIcon />
            </Button>
            {secondary && (
              <Button to={secondary.to} variant="outline" size="lg" magnetic={false}>
                {secondary.label}
              </Button>
            )}
          </div>
          {!landing.user && (
            <p className="mt-6 text-sm text-mute">
              Already on STUDLYF?{' '}
              <Link to={landing.loginHref} className={`font-medium hover:underline ${e.accent}`}>
                Log in as {e.label === 'HR & Talent' ? 'HR' : `a${/^[AEIOU]/.test(e.label) ? 'n' : ''} ${e.label.toLowerCase()}`}
              </Link>
            </p>
          )}
        </div>
        {visual && (
          <div className="animate-[fadeIn_.8s_ease-out_both] [animation-delay:200ms]">
            <TiltVisual>{visual}</TiltVisual>
          </div>
        )}
      </div>
    </section>
  )
}

export function FeatureGrid({ id, eyebrow, title, aside, items, accent = 'text-acid', cols = 'md:grid-cols-2 lg:grid-cols-3' }) {
  const reduce = useReducedMotion()
  return (
    <section id={id} className="scroll-mt-28 py-20 md:py-28">
      <div className="wrap">
        <SectionHeading eyebrow={eyebrow} title={title} accent={accent.replace('text-', 'bg-')} aside={aside && <p className="text-mute">{aside}</p>} />
        <div className={`mt-12 grid gap-4 ${cols}`}>
          {items.map((it, i) => (
            <motion.article
              key={it.title}
              onMouseMove={reduce ? undefined : trackPointer}
              className="spotlight-card card-surface flex flex-col p-7"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={reduce ? undefined : { y: -4 }}
              viewport={inView}
              transition={{ duration: 0.55, ease: EASE, delay: (i % 3) * 0.06 }}
            >
              <span className={`font-mono text-xs ${accent}`}>{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-4 text-xl font-semibold text-bone">{it.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-mute">{it.text}</p>
              {it.tag && <span className="mt-5 self-start rounded-full bg-line/[0.07] px-3 py-1 text-xs text-mute">{it.tag}</span>}
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Steps({ eyebrow, title, steps, accent = 'text-acid' }) {
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 65%'] })
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1])
  const bg = accent.replace('text-', 'bg-')
  return (
    <section ref={ref} className="py-20 md:py-28">
      <div className="wrap">
        <SectionHeading eyebrow={eyebrow} title={title} accent={bg} />
        {/* Scroll-linked progress line: fills across as the section scrolls through the viewport. */}
        <div className="mt-10 h-px w-full overflow-hidden bg-line/10">
          <motion.div className={`h-full w-full origin-left ${bg}`} style={{ scaleX: reduce ? 1 : scaleX }} />
        </div>
        <ol className="mt-8 grid gap-px overflow-hidden rounded-3xl border border-line/10 bg-line/10 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="bg-ink p-7 transition-colors duration-300 hover:bg-ink2">
              <span className={`display-face text-4xl ${accent}`}>{i + 1}</span>
              <h3 className="mt-4 font-semibold text-bone">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-mute">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export function LandingCTA({ ecoKey, title, text, label, landing }) {
  const e = ECOSYSTEMS[ecoKey]
  const reduce = useReducedMotion()
  return (
    <section className="py-24 md:py-32">
      <div className="wrap">
        <div
          onMouseMove={reduce ? undefined : trackPointer}
          className="group relative overflow-hidden rounded-[2rem] border border-line/12 bg-ink2/60 p-10 md:p-16"
        >
          <div aria-hidden className={`absolute -right-20 -top-20 h-80 w-80 rounded-full ${e.accentBg} opacity-20 blur-[110px]`} />
          {/* Accent glow that follows the cursor across the panel (eases in on hover). */}
          <div
            aria-hidden
            className={`pointer-events-none absolute h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 blur-[90px] transition-opacity duration-500 group-hover:opacity-25 ${e.accentBg} [left:var(--mx,50%)] [top:var(--my,50%)]`}
          />
          <h2 className="display-face relative max-w-3xl text-balance text-huge">{title}</h2>
          <p className="relative mt-5 max-w-xl text-mute">{text}</p>
          <div className="relative mt-9">
            <Button to={landing.start} onClick={landing.onStart} size="lg" magnetic={false}>
              {landing.state?.active ? `Open ${e.label} dashboard` : label} <ArrowIcon />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

/** Links to another ecosystem's PUBLIC page. It never changes the visitor's role. */
export function CrossLink({ question, label, to }) {
  return (
    <section className="pb-24">
      <div className="wrap">
        <Link to={to} className="group flex flex-col justify-between gap-4 rounded-2xl border border-line/12 p-7 transition-colors hover:border-line/35 sm:flex-row sm:items-center">
          <span className="display-face text-2xl tracking-tight md:text-3xl">{question}</span>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-acid transition-all group-hover:gap-3">
            {label} <ArrowIcon />
          </span>
        </Link>
      </div>
    </section>
  )
}

/** Premium app-window frame for the product previews: a layered dark plate with a soft persona
    glow behind it, realistic window chrome and a gradient content surface. `accent` is a bg-*
    class (JIT-safe, from lib/ecosystems) so each preview carries its own colour. */
export function PreviewFrame({ label, accent = 'bg-acid', children }) {
  return (
    <div className="relative">
      <div aria-hidden className={`absolute -inset-6 -z-10 rounded-[2.75rem] ${accent} opacity-[0.12] blur-[72px]`} />
      <div className="overflow-hidden rounded-[1.6rem] border border-line/12 bg-ink2/80 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center gap-1.5 border-b border-line/10 bg-white/[0.02] px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/70" />
          <span className="ml-3 truncate font-mono text-[11px] text-mute">{label}</span>
        </div>
        <div className="bg-gradient-to-b from-ink/50 to-ink p-5">{children}</div>
      </div>
    </div>
  )
}
