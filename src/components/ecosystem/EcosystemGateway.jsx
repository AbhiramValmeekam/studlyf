import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { SectionHeading } from '../ui/SectionHeading'
import { trackEcosystemClick } from '../../lib/analytics'
import { EASE, inView } from '../../lib/motion'

// The homepage's fan-out into the ecosystems. Every card goes to a PUBLIC landing page first —
// never straight to a dashboard — and "For HR & Orgs" asks which of the two you mean, because
// hiring teams and event organizers get separate experiences.
const CARDS = [
  { n: '01', eyebrow: 'Build', title: 'For Builders', key: 'BUILDER', to: '/builders', color: 'text-acid', desc: 'Discover opportunities, build real projects, get evaluated, and become discoverable to companies.', cta: 'Start building' },
  { n: '02', eyebrow: 'Start', title: 'For Founders', key: 'FOUNDER', to: '/founders', color: 'text-violet', desc: 'Shape your startup with structured tools, measure readiness, and get discovered by investors.', cta: 'Build your startup' },
  { n: '03', eyebrow: 'Discover', title: 'For Investors', key: 'INVESTOR', to: '/investors', color: 'text-flare', gated: true, desc: 'Verified access to filter and connect with founders by stage, traction and readiness.', cta: 'Investor portal' },
  { n: '04', eyebrow: 'Organizations', title: 'For HR & Orgs', key: 'SPLIT', color: 'text-lime-300', gated: true, desc: 'Hire builders on real evidence — projects, evaluations and hackathons. Or run your own events.', cta: 'Choose your side' },
]

const SPLIT = [
  { key: 'HR', to: '/hr', title: 'HR & Talent', desc: 'Discover and hire builders through their work.' },
  { key: 'ORGANIZER', to: '/organizations', title: 'Organizations & Organizers', desc: 'Run hackathons, challenges and programs.' },
]

function CardBody({ c, open }) {
  return (
    <>
      <div className="mb-8 flex items-start justify-between gap-4">
        <span className={`display-face leading-none ${c.color}`} style={{ fontSize: 'clamp(3rem,6vw,5.5rem)' }}>
          {c.n}
        </span>
        {c.gated && <span className="mt-3 text-[10px] uppercase tracking-[0.2em] text-mute">Verified access</span>}
      </div>
      <p className="eyebrow">{c.eyebrow}</p>
      <h3 className="display-face mt-2 text-4xl uppercase tracking-tight text-bone md:text-5xl">{c.title}</h3>
      <p className="mt-4 max-w-md text-mute">{c.desc}</p>
      <span className={`mt-8 inline-flex items-center gap-2 text-sm font-semibold transition-all group-hover:gap-3 ${c.color}`}>
        {c.cta} <span aria-hidden className={`transition-transform ${open ? 'rotate-90' : ''}`}>↗</span>
      </span>
    </>
  )
}

export function EcosystemGateway() {
  const [split, setSplit] = useState(false)
  const card =
    'group relative block h-full w-full rounded-3xl border border-line/15 bg-ink2/50 p-8 text-left transition-colors duration-300 hover:border-line/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-acid md:p-12'

  return (
    // No top hairline: the homepage paints a full-bleed grid behind every section
    // (see Home.jsx), and a section border cut straight across it.
    <section className="relative py-24 md:py-32" aria-labelledby="gateway-title">
      <div className="wrap">
        <SectionHeading
          eyebrow="One ecosystem"
          title={<span id="gateway-title">Four ways to grow.</span>}
          aside={<p className="text-mute">Builders, founders, investors and organizations — separate journeys, one connected platform and one account.</p>}
        />
        <div className="mt-14 grid gap-5 md:grid-cols-2 md:gap-6">
          {CARDS.map((c, i) => (
            <motion.div key={c.n} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={inView} transition={{ duration: 0.6, ease: EASE, delay: i * 0.06 }}>
              {c.key === 'SPLIT' ? (
                <div className={`${card} flex flex-col`}>
                  <button
                    type="button"
                    className="block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-acid"
                    aria-expanded={split}
                    aria-controls="hr-org-choice"
                    onClick={() => setSplit((v) => !v)}
                  >
                    <CardBody c={c} open={split} />
                  </button>
                  {split && (
                    <div id="hr-org-choice" className="grid animate-[fadeIn_.3s_ease-out] gap-3 pt-6 sm:grid-cols-2">
                      {SPLIT.map((s) => (
                        <Link
                          key={s.key}
                          to={s.to}
                          onClick={() => trackEcosystemClick(s.key, 'home_gateway')}
                          className="rounded-2xl border border-lime-300/30 bg-lime-300/[0.06] p-5 transition-colors hover:border-lime-300/60"
                        >
                          <span className="block font-semibold text-bone">{s.title} ↗</span>
                          <span className="mt-1 block text-sm text-mute">{s.desc}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link to={c.to} className={card} onClick={() => trackEcosystemClick(c.key, 'home_gateway')}>
                  <CardBody c={c} />
                </Link>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
