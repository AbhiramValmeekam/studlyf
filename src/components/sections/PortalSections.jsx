import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Marquee } from '../ui/Marquee'
import { Button, ArrowIcon } from '../ui/Button'
import { Badge } from '../ui/atoms'
import { EASE, inView } from '../../lib/motion'
import {
  portalCredibility,
  curriculumFrom,
  providesIntro,
  providesSteps,
  exploreEcosystem,
  getHired,
  industryPartners,
  whyUsStats,
  communitySpotlight,
  institutionalOutreach,
  careerSynergy,
  coursesComingSoon,
} from '../../data/studlyf'

// Shared editorial heading for the portal sections.
function Head({ eyebrow, title, blurb, center }) {
  return (
    <div className={center ? 'mx-auto max-w-2xl text-center' : ''}>
      <p className={`eyebrow mb-3 ${center ? 'justify-center' : ''}`}>{eyebrow}</p>
      <h2 className="display-face text-3xl tracking-tight md:text-4xl">{title}</h2>
      {blurb && <p className={`mt-3 text-mute ${center ? 'mx-auto max-w-xl' : 'max-w-xl'}`}>{blurb}</p>}
    </div>
  )
}

// A brand mark: a soft, white rounded logo card sized to the logo (matching the
// credibility-strip pattern), else a typeset badge when no image is available.
function Brand({ label, logo }) {
  if (logo) {
    return (
      <div className="grid h-16 min-w-[7rem] shrink-0 place-items-center rounded-2xl bg-white px-6 py-3 shadow-[0_10px_30px_-14px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.05]">
        <img src={logo} alt={label} loading="lazy" className="max-h-8 w-auto max-w-[9rem] object-contain" />
      </div>
    )
  }
  return (
    <div className="grid h-16 shrink-0 place-items-center rounded-2xl border border-line/12 bg-line/[0.04] px-6">
      <span className="whitespace-nowrap font-mono text-sm uppercase tracking-[0.18em] text-bone/80">{label}</span>
    </div>
  )
}

// "BUILT BY PEOPLE FROM" + "COLLABORATED WITH" credibility strip — two centred
// groups of white logo cards under wide-tracked labels.
export function PortalCredibility() {
  const groups = [
    { label: 'Built by people from', items: portalCredibility.builtBy },
    { label: 'Collaborated with', items: portalCredibility.collaborators },
  ]
  return (
    <section className="grid gap-14 md:grid-cols-2 md:gap-10">
      {groups.map((g) => (
        <div key={g.label} className="text-center">
          <p className="eyebrow mb-7 justify-center tracking-[0.3em]">{g.label}</p>
          <div className="flex flex-wrap justify-center gap-4">
            {g.items.map((b) => (
              <Brand key={b.label} label={b.label} logo={b.logo} />
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}

// "CURRICULUM BUILT BY PEOPLE FROM" — logo wall on a marquee.
export function CurriculumWall() {
  return (
    <section className="text-center">
      <p className="eyebrow mb-8 justify-center">Curriculum built by people from</p>
      <Marquee speed={32}>
        {curriculumFrom.map((b, i) => (
          <Brand key={`${b.label}-${i}`} label={b.label} logo={b.logo} />
        ))}
      </Marquee>
    </section>
  )
}

// "What STUDLYF provides you" — 4-step vertical journey, dashed connector.
export function ProvidesSteps() {
  return (
    <section>
      <Head eyebrow="What STUDLYF provides you" title="From first login to launched career" blurb={providesIntro} />
      <ol className="relative mt-12 space-y-6 before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-px before:border-l before:border-dashed before:border-line/20 md:before:left-[23px]">
        {providesSteps.map((s, i) => (
          <motion.li
            key={s.title}
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={inView}
            transition={{ duration: 0.5, ease: EASE, delay: Math.min(i * 0.08, 0.32) }}
            className="relative flex gap-5 md:gap-7"
          >
            <span className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-acid/40 bg-ink font-mono text-sm text-acid md:h-12 md:w-12">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="card-surface flex-1 p-5 md:p-6">
              <h3 className="text-lg font-semibold tracking-tight text-bone">{s.title}</h3>
              <p className="mt-1.5 text-sm text-mute">{s.desc}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </section>
  )
}

// "EXPLORE STUDLYF ECOSYSTEM" — product cards.
export function ExploreEcosystem() {
  return (
    <section>
      <Head
        eyebrow="Explore STUDLYF ecosystem"
        title="Everything, in one horizontal ecosystem"
        blurb="Everything you need to learn, build, connect and grow — all inside one platform."
      />
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {exploreEcosystem.map((c, i) => {
          const inner = (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={inView}
              transition={{ duration: 0.6, ease: EASE, delay: Math.min(i * 0.08, 0.3) }}
              className={`card-surface flex h-full flex-col p-7 transition-all duration-500 ${c.soon ? '' : 'hover:-translate-y-1 hover:border-line/20'}`}
            >
              <div className="flex items-center justify-between">
                <span className="eyebrow">{c.eyebrow}</span>
                {c.soon && <Badge tone="soon">Coming soon</Badge>}
              </div>
              <h3 className="mt-4 display-face text-2xl tracking-tight">{c.title}</h3>
              <p className="mt-2 flex-1 text-sm text-mute">{c.desc}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {c.tags.map((t) => (
                  <span key={t} className="rounded-full border border-line/12 bg-line/[0.04] px-3 py-1 text-xs text-mute">{t}</span>
                ))}
              </div>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm text-acid">
                {c.cta} {!c.soon && <ArrowIcon className="h-4 w-4" />}
              </span>
            </motion.div>
          )
          return c.to ? (
            <Link key={c.title} to={c.to} className="group block">{inner}</Link>
          ) : (
            <div key={c.title} className="opacity-90">{inner}</div>
          )
        })}
      </div>
    </section>
  )
}

// "COMMUNITY SPOTLIGHT" — large feature card + scrollable side list.
export function CommunitySpotlight() {
  const { feature, items } = communitySpotlight
  return (
    <section>
      <Head
        eyebrow="Community spotlight"
        title="Discover premium opportunities and events"
        blurb="Hackathons, workshops and exclusive community events across campuses."
      />
      <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="card-surface relative flex flex-col justify-end overflow-hidden p-8 md:p-10">
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-acid/10 blur-[90px]" />
          <Badge tone="neutral" className="w-fit">{feature.tag}</Badge>
          <h3 className="mt-4 display-face text-3xl tracking-tight md:text-4xl">{feature.title}</h3>
          <p className="mt-3 max-w-md text-mute">{feature.desc}</p>
          <div className="mt-6 flex flex-wrap gap-8">
            {feature.stats.map((s) => (
              <div key={s.label}>
                <span className="display-face text-3xl leading-none text-acid">{s.value}</span>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-mute">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-7">
            <Button to="/opportunities" size="sm" magnetic={false}>{feature.cta} <ArrowIcon /></Button>
          </div>
        </div>
        <div className="flex max-h-[26rem] flex-col gap-3 overflow-y-auto pr-1" data-lenis-prevent>
          {items.map((it, i) => (
            <div key={i} className="card-surface flex items-center gap-4 p-4 transition-colors hover:border-line/20">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-line/[0.06] font-mono text-sm text-acid">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-acid/80">{it.tag}</p>
                <p className="mt-0.5 text-sm font-medium text-bone">{it.title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// "COURSES FOR EVERY ambition" — protocols for mastery, launching soon.
export function CoursesComingSoon() {
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Head eyebrow="Protocols for mastery" title="Courses for every ambition" />
        <Badge tone="soon">Launching soon</Badge>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {coursesComingSoon.map((c, i) => (
          <motion.div
            key={c.track}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={inView}
            transition={{ duration: 0.5, ease: EASE, delay: Math.min(i * 0.06, 0.3) }}
            className="card-surface flex items-center justify-between gap-4 p-6"
          >
            <div>
              <span className="font-mono text-sm text-acid">{String(i + 1).padStart(2, '0')}</span>
              <p className="mt-3 font-semibold text-bone">{c.track}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-mute">Coming soon</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

// "GET HIRED! IN STARTUP'S" — MNC vs Startups comparison.
export function GetHired() {
  return (
    <section className="card-surface overflow-hidden p-8 md:p-12">
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow mb-3 justify-center">Get hired in startups</p>
        <h2 className="display-face text-3xl tracking-tight md:text-4xl">Two paths. One decision.</h2>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {getHired.tags.map((t) => (
            <span key={t} className="rounded-full border border-line/12 bg-line/[0.04] px-3 py-1 text-xs text-mute">#{t}</span>
          ))}
        </div>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {getHired.columns.map((col) => (
          <div
            key={col.label}
            className={`rounded-2xl border p-7 ${col.highlight ? 'border-acid/40 bg-acid/[0.05]' : 'border-line/12 bg-line/[0.02]'}`}
          >
            <h3 className={`display-face text-2xl tracking-tight ${col.highlight ? 'text-acid' : 'text-bone'}`}>{col.label}</h3>
            <ul className="mt-5 space-y-3">
              {col.points.map((p) => (
                <li key={p} className="flex items-center gap-3 text-sm text-mute">
                  <span className={`h-1.5 w-1.5 rounded-full ${col.highlight ? 'bg-acid' : 'bg-line/40'}`} />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-9 flex justify-center">
        <Button to="/opportunities" magnetic={false}>Get started <ArrowIcon /></Button>
      </div>
    </section>
  )
}

// "OUR INDUSTRY PARTNERS" + "WHY US?" stats.
export function IndustryPartners() {
  return (
    <section>
      <Head eyebrow="Our industry partners" title="Partnering with top-tier leaders" center />
      <div className="mt-10">
        <Marquee speed={28}>
          {industryPartners.map((b, i) => (
            <Brand key={`${b.label}-${i}`} label={b.label} logo={b.logo} />
          ))}
        </Marquee>
      </div>
      <div className="mt-16">
        <p className="eyebrow mb-8 justify-center text-center">Why us?</p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {whyUsStats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={inView}
              transition={{ duration: 0.5, ease: EASE, delay: Math.min(i * 0.06, 0.24) }}
              className="card-surface p-6 text-center"
            >
              <span className="display-face text-4xl leading-none text-acid">{s.value}</span>
              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-mute">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// "INSTITUTIONAL OUTREACH / CEO CAMPUS VISITS"
export function InstitutionalOutreach() {
  return (
    <section>
      <Head eyebrow="Institutional outreach" title="CEO campus visits" blurb="On-ground leadership sessions across partner institutions." />
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {institutionalOutreach.map((v, i) => (
          <motion.div
            key={v.org}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={inView}
            transition={{ duration: 0.5, ease: EASE, delay: Math.min(i * 0.06, 0.24) }}
            className="card-surface flex items-center justify-between gap-4 p-6"
          >
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-acid/80">{v.kind}</p>
              <p className="mt-1 font-semibold text-bone">{v.org}</p>
            </div>
            <ArrowIcon className="h-4 w-4 text-mute" />
          </motion.div>
        ))}
      </div>
    </section>
  )
}

// "CAREER SYNERGY / Streamline Your Career in AI Era" + brand marquee.
export function CareerSynergy() {
  return (
    <section className="card-surface relative overflow-hidden py-14 text-center md:py-16">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-48 w-[70%] -translate-x-1/2 rounded-full bg-acid/10 blur-[100px]" />
      <p className="eyebrow mb-4 justify-center">{careerSynergy.eyebrow}</p>
      <h2 className="display-face mx-auto max-w-2xl text-balance text-3xl tracking-tight md:text-5xl">{careerSynergy.title}</h2>
      <p className="mx-auto mt-4 max-w-md text-mute">{careerSynergy.desc}</p>
      <div className="mt-8 flex justify-center">
        <Button to="/onboarding" magnetic={false}>{careerSynergy.cta} <ArrowIcon /></Button>
      </div>
      <div className="mt-12 opacity-70">
        <Marquee speed={26}>
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="display-face whitespace-nowrap text-2xl tracking-crush text-bone/60">
              STUDLYF<span className="text-acid">.</span>
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  )
}
