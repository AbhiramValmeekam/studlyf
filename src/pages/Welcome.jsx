import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useHashScroll } from '../lib/useHashScroll'
import { useHome, useResources, useBuilderDashboard } from '../lib/queries'
import { OpportunityCard, ResourceCard } from '../components/ui/cards'
import { Button, ArrowIcon } from '../components/ui/Button'
import { Skeleton, EmptyState } from '../components/ui/atoms'
import { Marquee } from '../components/ui/Marquee'
import { FAQ } from '../components/sections/FAQ'
import {
  PortalCredibility,
  ExploreEcosystem,
  ProvidesSteps,
  CommunitySpotlight,
  CoursesComingSoon,
  CareerSynergy,
  CurriculumWall,
  GetHired,
  InstitutionalOutreach,
  IndustryPartners,
} from '../components/sections/PortalSections'
import { pillars, portalHero } from '../data/studlyf'
import { EASE } from '../lib/motion'

// The signed-in landing page, rebuilt as an editorial "member masthead": an
// oversized, type-led hero over the global animated gradient (SiteLayout owns the
// backdrop — untouched here), a kinetic discipline ticker, a live workspace
// ledger, and the platform surfaces reframed as numbered editorial indexes. The
// rich portal content sections are reused as-is; only the page's own surfaces and
// the surrounding composition are redesigned.
export default function Welcome() {
  const { user, isBuilder } = useAuth()
  const { data: home } = useHome()
  const { data: resources } = useResources({ pageSize: 3 })
  useHashScroll()

  const first = user?.name?.split(' ')[0]
  const featured = home?.featuredOpportunities || []
  const latestResources = resources?.items || []

  return (
    <>
      <Masthead first={first} subtitle={portalHero.subtitle} />
      <DisciplineTicker />

      <div className="relative isolate">
        <div aria-hidden className="grid-bg pointer-events-none absolute inset-0 -z-10" />
        <div className="wrap space-y-28 py-20 md:space-y-36 md:py-28">
          <Workspace isBuilder={isBuilder} completion={user?.completion} />
          <TheIndex isBuilder={isBuilder} />
          <Pillars />
          <Featured items={featured} />
          <ExploreEcosystem />
          <ProvidesSteps />
          <div id="community" className="scroll-mt-28"><CommunitySpotlight /></div>
          <CoursesComingSoon />
          <div id="hiring" className="scroll-mt-28"><GetHired /></div>
          <CareerSynergy />
          <PortalCredibility />
          <CurriculumWall />
          <InstitutionalOutreach />
          <IndustryPartners />
          <Resources items={latestResources} />
        </div>
        <FAQ />
        <ClosingCTA first={first} />
      </div>
    </>
  )
}

// Time-of-day greeting for the personalised masthead.
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}
// A clip-mask line reveal — the editorial signature used for the big headline.
function Reveal({ children, delay = 0, className = '' }) {
  return (
    <div className={`overflow-hidden ${className}`}>
      <motion.div initial={{ y: '112%' }} animate={{ y: '0%' }} transition={{ duration: 0.95, ease: EASE, delay }}>
        {children}
      </motion.div>
    </div>
  )
}

// Oversized, type-led hero. Sits transparent over the global animated gradient
// so the backdrop reads through; hairlines and mono labels do the framing.
function Masthead({ first, subtitle }) {
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  return (
    <header className="relative flex min-h-[92svh] flex-col justify-center overflow-hidden pb-16 pt-32 md:pt-40">
      <div className="wrap w-full">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: EASE }}
          className="flex items-center justify-between border-b border-line/10 pb-5"
        >
          <p className="eyebrow flex items-center gap-3">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-acid" />
            {greeting()} · {today}
          </p>
          <p className="eyebrow hidden sm:block">Member Portal — MMXXVI</p>
        </motion.div>

        <div className="mt-10 md:mt-14">
          <h1 className="display-face text-balance text-[clamp(2.8rem,9vw,8rem)] font-semibold leading-[0.94] tracking-tight">
            {first ? (
              <>
                <Reveal>Welcome back,</Reveal>
                <Reveal delay={0.12}><span className="grad-heading">{first}.</span></Reveal>
              </>
            ) : (
              <>
                <Reveal>Welcome to</Reveal>
                <Reveal delay={0.12}><span className="grad-heading">STUDLYF.</span></Reveal>
              </>
            )}
          </h1>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.32 }}
          className="mt-9 flex flex-col gap-8 md:flex-row md:items-end md:justify-between"
        >
          <p className="max-w-xl text-lede text-mute">{subtitle}</p>
          <div className="flex flex-wrap gap-3">
            <Button to="/opportunities" magnetic={false}>Explore opportunities <ArrowIcon /></Button>
            <Button to="/resources" variant="outline" magnetic={false}>Browse resources</Button>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, ease: EASE, delay: 0.6 }}
        className="wrap mt-16 flex w-full items-center gap-3 text-mute"
      >
        <motion.span
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="grid h-9 w-9 place-items-center rounded-full border border-line/15"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M8 3v10M4 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.span>
        <span className="text-xs uppercase tracking-[0.2em]">Scroll to explore</span>
      </motion.div>
    </header>
  )
}
// Kinetic band of the member journey verbs — a big-type marquee on hairlines.
const DISCIPLINES = ['Learn', 'Build', 'Practice', 'Apply', 'Get Hired', 'Grow']
function DisciplineTicker() {
  return (
    <div className="border-y border-line/10 py-6 md:py-8">
      <Marquee speed={32}>
        {DISCIPLINES.map((d, i) => (
          <span key={i} className="flex items-center gap-12 pr-12 md:gap-16 md:pr-16">
            <span className="display-face text-3xl tracking-tight text-bone/60 md:text-5xl">{d}</span>
            <span className="inline-block h-2.5 w-2.5 rotate-45 bg-acid/80" />
          </span>
        ))}
      </Marquee>
    </div>
  )
}

// Numbered editorial section header shared across the page-owned surfaces.
function SectionHead({ index, kicker, title, blurb, link }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5 border-t border-line/10 pt-6">
      <div className="max-w-2xl">
        <div className="flex items-center gap-4">
          {index && <span className="font-mono text-sm text-acid">{index}</span>}
          {kicker && <span className="eyebrow">{kicker}</span>}
        </div>
        <h2 className="mt-4 display-face text-balance text-4xl tracking-tight md:text-5xl">{title}</h2>
        {blurb && <p className="mt-4 text-mute md:text-lg">{blurb}</p>}
      </div>
      {link && (
        <Link to={link.to} className="group inline-flex items-center gap-2 text-sm text-mute transition-colors hover:text-bone">
          {link.label}
          <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  )
}
// Live workspace band — a builder gets a real snapshot ledger; everyone else
// gets an editorial invite into the builder journey.
function Workspace({ isBuilder, completion }) {
  return isBuilder ? <BuilderLedger /> : <BuilderInvite completion={completion} />
}

function BuilderLedger() {
  const { data, isLoading } = useBuilderDashboard()
  if (isLoading) return <Skeleton className="h-56 w-full rounded-3xl" />
  const exists = data?.profile?.exists
  const score = data?.profile?.completion?.score ?? 0
  const stats = [
    { label: 'Applications', value: data?.applications?.total ?? 0 },
    { label: 'Matches', value: data?.recommendations?.length ?? 0 },
    { label: 'Alerts', value: data?.notifications?.unreadCount ?? 0 },
  ]
  return (
    <section>
      <SectionHead index="00" kicker="Live snapshot" title="Your workspace" link={{ to: '/builders/dashboard', label: 'Open dashboard' }} />
      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.4fr] lg:items-stretch">
        <div className="card-surface flex items-center gap-6 p-8">
          <ProgressRing value={exists ? score : 0} />
          <div>
            <p className="eyebrow mb-1">{exists ? 'Profile strength' : 'Get set up'}</p>
            <p className="display-face text-2xl tracking-tight">{exists ? 'Profile snapshot' : 'Finish your setup'}</p>
            <Link to="/builders/profile" className="mt-2 inline-flex items-center gap-1.5 text-sm text-acid">
              {exists ? 'Edit profile' : 'Create profile'} <ArrowIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-line/10 overflow-hidden rounded-3xl border border-line/10">
          {stats.map((s) => (
            <div key={s.label} className="px-4 py-8 text-center">
              <span className="display-face text-4xl leading-none md:text-5xl">{s.value}</span>
              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-mute">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
function BuilderInvite({ completion }) {
  const perks = [
    'Apply to hackathons, internships & programs',
    'Get matched to opportunities by your skills',
    'A public portfolio partners can discover',
  ]
  return (
    <section>
      <SectionHead index="00" kicker="Your next step" title="Become a builder" />
      <div className="mt-10 grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-stretch">
        <div className="card-surface flex flex-col justify-between gap-8 p-8 md:p-10">
          <p className="text-lede text-mute">
            Set up a builder profile to unlock applications, skill-matching and a portfolio recruiters can find.
          </p>
          <ul className="grid gap-3 sm:grid-cols-3">
            {perks.map((p, i) => (
              <li key={p} className="rounded-2xl border border-line/10 bg-line/[0.02] p-4">
                <span className="font-mono text-xs text-acid">{String(i + 1).padStart(2, '0')}</span>
                <p className="mt-2 text-sm text-mute">{p}</p>
              </li>
            ))}
          </ul>
          <div><Button to="/onboarding" magnetic={false}>Get started <ArrowIcon /></Button></div>
        </div>
        <div className="card-surface grid place-items-center p-8">
          <div className="text-center">
            <div className="mx-auto w-fit"><ProgressRing value={completion?.score ?? 0} /></div>
            <p className="eyebrow mt-4 justify-center">Profile</p>
            <p className="mt-1 text-sm text-mute">{completion?.score ?? 0}% complete</p>
          </div>
        </div>
      </div>
    </section>
  )
}
// Quick actions, reframed as an editorial index — big hover-active list rows
// instead of a card grid. The last row adapts to builder vs. non-builder.
function TheIndex({ isBuilder }) {
  const rows = [
    { to: '/opportunities', title: 'Opportunities', desc: 'Hackathons, internships & programs', Icon: BriefcaseIcon },
    { to: '/resources', title: 'Resources', desc: 'Guides, templates & playbooks', Icon: BookIcon },
    { to: '/community', title: 'Community', desc: 'Projects & builders to follow', Icon: UsersIcon },
    { to: '/resume-builder', title: 'Resume Builder', desc: 'Craft a tailored resume', Icon: DocIcon },
    { to: '/mock-drills', title: 'Mock Tests', desc: 'Practise under real conditions', Icon: TargetIcon },
    isBuilder
      ? { to: '/builders/dashboard', title: 'Dashboard', desc: 'Track your builder journey', Icon: GridIcon }
      : { to: '/onboarding', title: 'Become a builder', desc: 'Set up your profile to apply', Icon: GridIcon },
  ]
  return (
    <section>
      <SectionHead index="01" kicker="Jump back in" title="The index" blurb="Your most-used destinations — one tap away." />
      <ul className="mt-10 border-t border-line/10">
        {rows.map((r, i) => (
          <motion.li
            key={r.to}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5, ease: EASE, delay: Math.min(i * 0.05, 0.25) }}
          >
            <Link to={r.to} className="group flex items-center gap-5 border-b border-line/10 py-6 md:gap-8 md:py-7">
              <span className="font-mono text-sm text-mute transition-colors group-hover:text-acid">{String(i + 1).padStart(2, '0')}</span>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line/10 bg-line/[0.03] text-acid transition-colors group-hover:border-acid/30 group-hover:bg-acid/10">
                <r.Icon />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block display-face text-xl tracking-tight text-bone transition-transform duration-500 ease-editorial group-hover:translate-x-1 md:text-2xl">{r.title}</span>
                <span className="mt-0.5 block truncate text-sm text-mute">{r.desc}</span>
              </span>
              <ArrowIcon className="h-5 w-5 shrink-0 text-mute transition-all duration-500 ease-editorial group-hover:translate-x-1 group-hover:text-acid" />
            </Link>
          </motion.li>
        ))}
      </ul>
    </section>
  )
}
// The platform pillars, reframed as an editorial two-column split: a sticky
// heading rail on the left, numbered feature rows on the right. Live pillars
// link out; the not-yet-shipped ones carry a "Soon" badge.
const PILLAR_LINKS = {
  '01': { to: '/resources', cta: 'Start learning' },
  '02': { soon: true },
  '03': { soon: true },
  '04': { to: '/opportunities', cta: 'Explore opportunities' },
}
function Pillars() {
  return (
    <section id="ecosystem" className="scroll-mt-28">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <span className="eyebrow flex items-center gap-3">
            <span className="font-mono text-acid">02</span> The ecosystem
          </span>
          <h2 className="mt-4 display-face text-balance text-4xl tracking-tight md:text-5xl">
            Everything, in one platform
          </h2>
          <p className="mt-5 max-w-md text-mute md:text-lg">
            Learn the skills, prove them under pressure, and get discovered by the people hiring — without leaving STUDLYF.
          </p>
          <div className="mt-8">
            <Button to="/opportunities" variant="outline" magnetic={false}>See what's live <ArrowIcon /></Button>
          </div>
        </div>
        <ul className="border-t border-line/10">
          {pillars.map((p, i) => {
            const link = PILLAR_LINKS[p.no] || {}
            return (
              <motion.li
                key={p.no}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.6, ease: EASE, delay: Math.min(i * 0.06, 0.24) }}
                className="border-b border-line/10 py-7 md:py-8"
              >
                <div className="flex items-baseline gap-5">
                  <span className="font-mono text-sm text-acid">{p.no}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="display-face text-2xl tracking-tight md:text-3xl">{p.title}</h3>
                      {link.soon && <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-medium text-amber-300">Soon</span>}
                    </div>
                    <p className="mt-2.5 max-w-lg text-mute">{p.desc}</p>
                    {link.to && (
                      <Link to={link.to} className="group mt-4 inline-flex items-center gap-1.5 text-sm text-acid">
                        {link.cta} <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    )}
                  </div>
                </div>
              </motion.li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
// Live featured opportunities — real data from useHome(); empty state when none.
function Featured({ items }) {
  return (
    <section id="opportunities" className="scroll-mt-28">
      <SectionHead index="03" kicker="Live now" title="Featured opportunities" link={{ to: '/opportunities', label: 'Browse all' }} />
      <div className="mt-10">
        {items.length === 0 ? (
          <EmptyState title="Nothing featured yet" hint="New opportunities land here as they open. Browse the full board in the meantime." />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((opp, i) => (
              <OpportunityCard key={opp.id || opp._id || i} opp={opp} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
// Latest resources — real data from useResources(); hidden entirely when empty.
function Resources({ items }) {
  if (!items.length) return null
  return (
    <section id="resources" className="scroll-mt-28">
      <SectionHead index="04" kicker="Learn" title="Fresh resources" link={{ to: '/resources', label: 'All resources' }} />
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((resource, i) => (
          <ResourceCard key={resource.id || resource._id || i} resource={resource} index={i} />
        ))}
      </div>
    </section>
  )
}
// Closing editorial call-to-action — full-bleed card over faint brand glows.
function ClosingCTA({ first }) {
  return (
    <div className="wrap pb-32">
      <div className="card-surface relative overflow-hidden px-8 py-16 text-center md:px-16 md:py-24">
        <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-acid/15 blur-3xl" />
        <div className="relative">
          <p className="eyebrow justify-center">Keep building</p>
          <h2 className="mx-auto mt-5 max-w-3xl display-face text-balance text-4xl tracking-tight md:text-6xl">
            Your next opportunity is waiting{first ? <>, <span className="grad-heading">{first}</span></> : ''}.
          </h2>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button to="/opportunities" magnetic={false}>Explore opportunities <ArrowIcon /></Button>
            <Button to="/community" variant="outline" magnetic={false}>Meet the community</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
// Circular profile-completion gauge — animates its arc into view.
function ProgressRing({ value = 0 }) {
  const r = 26
  const circ = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className="relative grid h-16 w-16 place-items-center">
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgb(var(--line) / 0.15)" strokeWidth="5" />
        <motion.circle
          cx="32" cy="32" r={r} fill="none" stroke="#4CC9FF" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          whileInView={{ strokeDashoffset: circ - (pct / 100) * circ }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: EASE }}
        />
      </svg>
      <span className="absolute font-mono text-sm text-bone">{pct}%</span>
    </div>
  )
}
// Inline SVG icons for The Index rows — no icon-library dependency.
const iconProps = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }
function BriefcaseIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
    </svg>
  )
}
function BookIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
      <path d="M4 5v14" />
    </svg>
  )
}
function UsersIcon() {
  return (
    <svg {...iconProps}>
      <path d="M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1" />
      <circle cx="9" cy="7" r="3" />
      <path d="M22 20v-1a4 4 0 0 0-3-3.87M16 4.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
function DocIcon() {
  return (
    <svg {...iconProps}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </svg>
  )
}
function TargetIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  )
}
function GridIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}
