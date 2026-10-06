import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, ArrowIcon } from '../ui/Button'
import { ShaderBackground } from '../ui/ShaderBackground'
import { ECOSYSTEMS, ECOSYSTEM_KEYS } from '../../lib/ecosystems'
import { trackEcosystemClick } from '../../lib/analytics'
import { EASE } from '../../lib/motion'

// Rotating audience on the second line — "Built for builders / founders / investors / recruiters
// / organizers" — each word in its ecosystem's accent. Every word is overlaid invisibly so the
// line reserves the widest one and "Built for" never shifts.
function RotatingAudience({ audiences }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % audiences.length), 2200)
    return () => clearInterval(id)
  }, [audiences.length])
  const current = audiences[i]
  return (
    <span className="relative inline-grid align-baseline text-left">
      {audiences.map((a) => (
        <span key={a.word} aria-hidden className="invisible col-start-1 row-start-1 whitespace-nowrap">
          {a.word}.
        </span>
      ))}
      <span className="col-start-1 row-start-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={current.word}
            className={`inline-block whitespace-nowrap ${current.color}`}
            initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -16, filter: 'blur(6px)' }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            {current.word}.
          </motion.span>
        </AnimatePresence>
      </span>
      {/* Screen readers get the full sentence once, not a ticking word. */}
      <span className="sr-only">builders, founders, investors, recruiters and organizers.</span>
    </span>
  )
}

/**
 * The role-neutral homepage hero. It speaks to every ecosystem and sends people to choose a path
 * (the gateway below) — it never assumes the visitor is a student.
 */
export function Hero({ hero }) {
  const primary = hero?.primaryCta || { label: 'Choose your path', url: '/#ecosystems' }
  const secondary = hero?.secondaryCta || { label: 'Join STUDLYF', url: '/signup' }
  const audiences = hero?.audiences?.length ? hero.audiences : [{ word: 'builders', color: 'text-acid' }]

  return (
    <section className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden pb-16 pt-28">
      <div className="hero-shader absolute inset-0 -z-10 overflow-hidden">
        <ShaderBackground className="block h-full w-full" />
      </div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/40 via-ink/10 to-ink" />
      <div aria-hidden className="hero-ambient absolute inset-0 -z-10 overflow-hidden">
        <div className="ambient-glow absolute left-1/2 top-1/3 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-violet/20 blur-[120px]" />
      </div>

      <div className="wrap relative text-center">
        {hero?.eyebrow && <p className="eyebrow mb-8 animate-[fadeIn_.5s_ease-out_both] justify-center">{hero.eyebrow}</p>}
        <h1 className="display-face animate-[fadeIn_.8s_ease-out_both] text-balance text-[clamp(2.9rem,9.5vw,9.5rem)] font-display leading-[0.9] tracking-tight">
          <span className="block text-bone">{hero?.headlineTop || 'One ecosystem.'}</span>
          <span className="block text-bone">
            {hero?.headlinePrefix || 'Built for'} <RotatingAudience audiences={audiences} />
          </span>
        </h1>

        {hero?.subheadline && (
          <p className="mx-auto mt-8 max-w-2xl animate-[fadeIn_.7s_ease-out_both] text-lede text-mute [animation-delay:150ms]">{hero.subheadline}</p>
        )}

        <div className="mt-10 flex animate-[fadeIn_.7s_ease-out_both] flex-wrap items-center justify-center gap-4 [animation-delay:250ms]">
          <Button to={primary.url} variant="violet" size="lg">
            {primary.label}
            <ArrowIcon />
          </Button>
          <Button to={secondary.url} variant="outline" size="lg">
            {secondary.label}
            <ArrowIcon />
          </Button>
        </div>

        {/* One tap into each ecosystem's public page. */}
        <nav aria-label="Ecosystems" className="mx-auto mt-12 flex max-w-3xl animate-[fadeIn_.7s_ease-out_both] flex-wrap justify-center gap-2 [animation-delay:350ms]">
          {ECOSYSTEM_KEYS.map((key) => {
            const e = ECOSYSTEMS[key]
            return (
              <Link
                key={key}
                to={e.landing}
                onClick={() => trackEcosystemClick(key, 'home_hero')}
                className="glass inline-flex items-center gap-2 rounded-full border border-line/15 px-4 py-2 text-sm text-bone transition-colors hover:border-line/40"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${e.accentBg}`} />
                {e.plural}
              </Link>
            )
          })}
        </nav>
      </div>
    </section>
  )
}
