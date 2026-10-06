import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Nav } from './Nav'
import { Footer } from './Footer'
import { Spinner } from '../ui/atoms'
import { ProfilePrompt } from '../profile/ProfilePrompt'
import AnimatedGradient from '../ui/animated-gradient'
import { brandGradient } from '../../lib/brand-gradient'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { ECOSYSTEMS, landingEcosystem } from '../../lib/ecosystems'
import { EASE } from '../../lib/motion'

// STUDLYF brand ramp for the signed-in backdrop. The config itself lives in
// lib/brand-gradient so the dashboards and the public ecosystem landing pages stay on
// exactly the same colour and motion — these screens are the reference look.

// Public site chrome: fixed Nav, a gently-fading page area, and the Footer.
// The Suspense boundary lives HERE (around the Outlet) rather than above the
// router so a lazy page chunk loading only swaps the content area — the Nav and
// <main> stay mounted. Hoisting it caused the whole chrome to unmount/remount on
// every lazy-route load, which on a cold /welcome reload left <main> stuck at
// opacity 0 (blank body under a visible nav). `initial={false}` is the belt to
// that suspenders: the page area is painted at its resting opacity immediately,
// so content can never be hidden by an interrupted enter animation.
function PageFallback() {
  return (
    <div className="grid min-h-[60svh] place-items-center">
      <Spinner className="h-7 w-7 text-acid" />
    </div>
  )
}

// The animated WebGL gradient renders fixed behind the whole app once signed in,
// with a scrim that tracks --ink (so it darkens the wash in dark mode and turns it
// into a soft light wash under [data-theme=light]) to keep content readable. Under
// prefers-reduced-motion we drop the shader for a static CSS gradient. The opaque
// light "feature" pages (Courses/STUDHub/etc.) simply paint over it — by design.
function SignedInBackdrop() {
  const reduce = useReducedMotion()
  const { theme } = useTheme()
  const light = theme === 'light'
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {reduce ? (
        <div
          className={
            light
              ? 'h-full w-full bg-gradient-to-br from-[#F3F1FB] via-[#e4dcff] to-[#f7d8e8]'
              : 'h-full w-full bg-gradient-to-br from-[#08060F] via-[#3a1d80] to-[#7a2b52]'
          }
        />
      ) : (
        <AnimatedGradient config={brandGradient(light)} />
      )}
      {/* Scrim tracks --ink: in dark it deepens the wash for contrast; in light it lifts
          it toward the page bg so the pastels stay bright and text stays readable. */}
      <div
        className={
          light
            ? 'absolute inset-0 bg-gradient-to-b from-ink/20 via-ink/40 to-ink/65'
            : 'absolute inset-0 bg-gradient-to-b from-ink/30 via-ink/60 to-ink/80'
        }
      />
    </div>
  )
}

// Shared ambient backdrop for the five public ecosystem landings. Fixed behind the whole
// page (sibling to <main>, like SignedInBackdrop, so no ancestor transform can clip it): a
// subtle grid, two slowly drifting accent blobs tinted with the ecosystem's own accent, and
// a neutral violet depth blob. Every landing therefore shares one look and one motion —
// only the accent color changes. Static under prefers-reduced-motion.
function LandingBackdrop({ ecoKey }) {
  const e = ECOSYSTEMS[ecoKey]
  const reduce = useReducedMotion()
  const drift = (x, y, duration) =>
    reduce ? {} : { animate: { x: [0, x, 0], y: [0, y, 0] }, transition: { duration, repeat: Infinity, ease: 'easeInOut' } }
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="grid-bg absolute inset-0" />
      <motion.div {...drift(40, 30, 26)} className={`absolute -left-32 -top-24 h-[40rem] w-[40rem] rounded-full ${e.accentBg} opacity-[0.13] blur-[150px]`} />
      <motion.div {...drift(-36, 40, 32)} className={`absolute -right-40 top-1/3 h-[34rem] w-[34rem] rounded-full ${e.accentBg} opacity-[0.08] blur-[150px]`} />
      <motion.div {...drift(24, -30, 38)} className="absolute -bottom-40 left-1/4 h-[32rem] w-[32rem] rounded-full bg-violet opacity-[0.05] blur-[160px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink/30" />
    </div>
  )
}

export function SiteLayout() {
  const { pathname } = useLocation()
  const { isAuthed } = useAuth()
  // Logged-out ecosystem landings share ONE ambient background — a grid + slowly drifting
  // accent blobs — so all five look identical apart from their per-persona accent color.
  const landingKey = !isAuthed ? landingEcosystem(pathname) : null
  // The signed-in animated backdrop is suppressed on the home page: it has its own hero
  // shader + grid and the wash competed with the marketing content there.
  const isHome = pathname === '/'
  return (
    <>
      {isAuthed && !isHome && <SignedInBackdrop />}
      {landingKey && <LandingBackdrop ecoKey={landingKey} />}
      <Nav />
      <motion.main
        key={pathname}
        initial={false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="min-h-[60svh]"
      >
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </motion.main>
      <Footer />
      <ProfilePrompt />
    </>
  )
}
