import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { ECOSYSTEMS, startPath } from '../../lib/ecosystems'
import { track, trackEcosystemClick } from '../../lib/analytics'
import { EASE, inView } from '../../lib/motion'
import { Button, ArrowIcon } from '../ui/Button'
import { SectionHeading } from '../ui/SectionHeading'
import { CandidatePreview, DiscoveryPreview, ProgramPreview, ProofOfWorkPreview, ReadinessPreview } from './previews'

// Homepage sections that present all four ecosystems (Builders, Founders, Investors, HR & Orgs)
// as one connected platform. Everything links to PUBLIC landing pages or role-aware sign-up;
// nothing here assumes the visitor is a student.

function Pill({ ecoKey, label }) {
  const e = ECOSYSTEMS[ecoKey]
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-line/15 px-3 py-1.5 text-sm text-bone">
      <span className={`h-1.5 w-1.5 rounded-full ${e.accentBg}`} />
      {label || e.plural}
    </span>
  )
}

// ---- how the ecosystems connect ---------------------------------------------------------

const CONNECTIONS = [
  { from: 'ORGANIZER', to: 'BUILDER', fromLabel: 'Organizations', text: 'Hackathons, challenges and programs give builders real problems, teams and judged results.' },
  { from: 'BUILDER', to: 'HR', text: 'Projects, evaluations and verified achievements become the evidence hiring teams search.' },
  { from: 'BUILDER', to: 'FOUNDER', text: 'Any builder can start a company — the founder profile lives on the same account.' },
  { from: 'FOUNDER', to: 'INVESTOR', text: 'Structured startup profiles, traction and readiness let verified investors meet founders early.' },
  { from: 'ORGANIZER', to: 'HR', fromLabel: 'Organizations', toLabel: 'HR & Talent', text: 'Program finalists and winners flow into a talent pipeline companies trust.' },
]

export function EcosystemConnections() {
  return (
    <section className="relative py-24 md:py-32" aria-labelledby="connections-title">
      <div className="wrap grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div>
          <SectionHeading eyebrow="How it connects" title={<span id="connections-title">One account. Connected journeys.</span>} />
          <p className="mt-6 max-w-md text-mute">
            Every ecosystem feeds the others. The work a builder does in a hackathon is what a recruiter reviews; the startup a founder structures is what an
            investor discovers. One identity carries it all — add an ecosystem any time and switch from the top bar.
          </p>
          <div className="mt-8 grid max-w-md grid-cols-2 gap-3">
            {[
              ['1', 'account for every ecosystem'],
              ['5', 'connected experiences'],
              ['3', 'verified-access ecosystems'],
              ['0', 'separate logins'],
            ].map(([n, t]) => (
              <div key={t} className="card-surface p-4">
                <p className="display-face text-4xl text-bone">{n}</p>
                <p className="mt-1 text-xs text-mute">{t}</p>
              </div>
            ))}
          </div>
        </div>
        <ol className="space-y-3">
          {CONNECTIONS.map((c, i) => (
            <motion.li
              key={i}
              className="card-surface flex flex-col gap-4 p-5 md:p-6"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={inView}
              transition={{ duration: 0.5, ease: EASE, delay: i * 0.05 }}
            >
              <div className="flex flex-wrap items-center gap-3">
                <Pill ecoKey={c.from} label={c.fromLabel} />
                <span aria-hidden className="text-mute">→</span>
                <span className="sr-only">feeds</span>
                <Pill ecoKey={c.to} label={c.toLabel} />
              </div>
              <p className="text-sm leading-relaxed text-mute">{c.text}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  )
}

// ---- one spotlight per ecosystem ---------------------------------------------------------

const SPOTLIGHTS = [
  {
    id: 'for-builders',
    n: '01',
    key: 'BUILDER',
    eyebrow: 'Build',
    title: 'For builders & students.',
    text: 'Discover opportunities, build real projects with a team, get evaluated against real rubrics and grow a profile companies can trust.',
    points: ['Hackathons, internships, challenges and fellowships', 'Projects, teams and submissions', 'Evaluations with rubric feedback', 'Verified achievements', 'Courses, mock interviews, resume builder and STUDHub'],
    journey: ['Discover', 'Create profile', 'Find opportunity', 'Join a team', 'Build', 'Submit', 'Get evaluated', 'Earn achievements', 'Get discovered'],
    cta: 'Create Builder Profile',
    Preview: ProofOfWorkPreview,
  },
  {
    id: 'for-founders',
    n: '02',
    key: 'FOUNDER',
    eyebrow: 'Start',
    title: 'For founders.',
    text: 'Create your founder and startup profile, think it through in a structured workspace, measure readiness and get discovered by verified investors.',
    points: ['Founder & startup profile', 'Workspace: market, competitors, SWOT, business model, GTM, pitch', 'Readiness across 8 areas', 'Traction & startup updates', 'Consent-based investor connections'],
    journey: ['Sign up', 'Founder profile', 'Create startup', 'Workspace', 'Analyze & improve', 'Readiness', 'Investor discovery', 'Connect'],
    cta: 'Start as a Founder',
    Preview: ReadinessPreview,
  },
  {
    id: 'for-investors',
    n: '03',
    key: 'INVESTOR',
    eyebrow: 'Discover',
    title: 'For investors.',
    gated: true,
    text: 'Verified access to structured startup and founder profiles — filter by industry, geography, stage, funding stage and startup type, then connect with the founder’s consent.',
    points: ['Founder & startup discovery', 'Traction and readiness signals', 'Saved shortlist', 'Investment preferences & intelligence', 'Connections founders accept'],
    journey: ['Request access', 'Verification', 'Approval', 'Discover startups', 'Filter', 'Review startup', 'Review founder', 'Connect'],
    cta: 'Request Investor Access',
    Preview: DiscoveryPreview,
  },
]

function Journey({ steps, accent }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-xs" aria-label="Journey">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-1.5">
          <span className="rounded-full bg-line/[0.06] px-2.5 py-1 text-bone/90">
            <span className={`mr-1 font-mono ${accent}`}>{i + 1}</span>
            {s}
          </span>
          {i < steps.length - 1 && <span aria-hidden className="text-mute/60">→</span>}
        </li>
      ))}
    </ol>
  )
}

function SpotlightText({ s, user, reverse }) {
  const e = ECOSYSTEMS[s.key]
  const state = user?.ecosystems?.[s.key]
  return (
    <div className={reverse ? 'lg:order-2' : ''}>
      <div className="flex items-center gap-4">
        <span className={`display-face text-5xl leading-none md:text-6xl ${e.accent}`}>{s.n}</span>
        {s.gated && <span className="text-[10px] uppercase tracking-[0.2em] text-mute">Verified access</span>}
      </div>
      <p className="eyebrow mt-6">{s.eyebrow}</p>
      <h3 className="display-face mt-2 text-balance text-[clamp(2.2rem,4.6vw,3.8rem)] leading-[0.95] tracking-tight">{s.title}</h3>
      <p className="mt-5 max-w-lg text-mute">{s.text}</p>
      <ul className="mt-6 space-y-2.5">
        {s.points.map((p) => (
          <li key={p} className="flex items-start gap-3 text-sm text-bone/90">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${e.accentBg}`} />
            {p}
          </li>
        ))}
      </ul>
      <div className="mt-7">
        <Journey steps={s.journey} accent={e.accent} />
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button
          to={startPath(s.key, user)}
          magnetic={false}
          onClick={() => !user && track('signup_started', { ecosystem: s.key, source: 'home_spotlight' })}
        >
          {state?.active ? `Open ${e.label} dashboard` : s.cta} <ArrowIcon />
        </Button>
        <Button to={e.landing} variant="outline" magnetic={false} onClick={() => trackEcosystemClick(s.key, 'home_spotlight')}>
          Learn more
        </Button>
      </div>
    </div>
  )
}

/** HR and Organizations share card 04 on the gateway, so they share a spotlight — as two clear halves. */
function HrOrgSpotlight({ user }) {
  const halves = [
    {
      key: 'HR',
      title: 'HR & Talent',
      text: 'Find talent through what they’ve built — skills, projects, GitHub, evaluations and achievements — then shortlist, invite, interview and hire.',
      journey: ['Request access', 'Org verification', 'Discover talent', 'Review work', 'Shortlist', 'Invite', 'Interview', 'Offer', 'Joining'],
      cta: 'Request HR Access',
      Preview: CandidatePreview,
    },
    {
      key: 'ORGANIZER',
      title: 'Organizations & organizers',
      text: 'Run hackathons, competitions, challenges and workshops: participants, teams, submissions, evaluators, rankings, winners and certificates.',
      journey: ['Create organization', 'Verification', 'Create program', 'Publish', 'Participants', 'Submissions', 'Evaluation', 'Winners', 'Certificates'],
      cta: 'Create an Organization',
      Preview: ProgramPreview,
    },
  ]
  return (
    <div id="for-hr-orgs" className="scroll-mt-28 pt-20">
      <div className="flex items-center gap-4">
        <span className="display-face text-5xl leading-none text-lime-300 md:text-6xl">04</span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-mute">Verified access</span>
      </div>
      <p className="eyebrow mt-6">Organizations</p>
      <h3 className="display-face mt-2 text-balance text-[clamp(2.2rem,4.6vw,3.8rem)] leading-[0.95] tracking-tight">For HR & organizations.</h3>
      <p className="mt-5 max-w-2xl text-mute">Two separate experiences for two different jobs: hiring builders on real evidence, and running the programs where that evidence is created.</p>
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {halves.map((h) => {
          const e = ECOSYSTEMS[h.key]
          const state = user?.ecosystems?.[h.key]
          return (
            <article key={h.key} className="card-surface flex flex-col p-6 md:p-8">
              <p className={`text-sm font-semibold ${e.accent}`}>{h.title}</p>
              <p className="mt-3 text-mute">{h.text}</p>
              <div className="mt-6">
                <h.Preview />
              </div>
              <div className="mt-6">
                <Journey steps={h.journey} accent={e.accent} />
              </div>
              <div className="mt-auto flex flex-wrap gap-3 pt-8">
                <Button
                  to={startPath(h.key, user)}
                  magnetic={false}
                  onClick={() => !user && track('signup_started', { ecosystem: h.key, source: 'home_spotlight' })}
                >
                  {state?.active ? `Open ${e.label} dashboard` : h.cta} <ArrowIcon />
                </Button>
                <Button to={e.landing} variant="outline" magnetic={false} onClick={() => trackEcosystemClick(h.key, 'home_spotlight')}>
                  Learn more
                </Button>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

export function EcosystemSpotlights() {
  const { user } = useAuth()
  return (
    <section className="relative py-24 md:py-32" aria-labelledby="spotlights-title">
      <div className="wrap">
        <SectionHeading
          eyebrow="Inside each ecosystem"
          title={<span id="spotlights-title">What you can do here.</span>}
          aside={<p className="text-mute">Each ecosystem has its own product and its own journey — here’s the short version of each.</p>}
        />
        <div className="mt-16 space-y-20">
          {SPOTLIGHTS.map((s, i) => (
            <div id={s.id} key={s.id} className={`scroll-mt-28 grid items-center gap-12 lg:grid-cols-2 lg:gap-20 ${i ? 'pt-20' : ''}`}>
              <SpotlightText s={s} user={user} reverse={i % 2 === 1} />
              <motion.div
                className={i % 2 === 1 ? 'lg:order-1' : ''}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={inView}
                transition={{ duration: 0.7, ease: EASE }}
              >
                <s.Preview />
              </motion.div>
            </div>
          ))}
          <HrOrgSpotlight user={user} />
        </div>
      </div>
    </section>
  )
}

/** Closing band: pick a path instead of a single "join" that would assume Builder. */
export function ChooseYourPathCTA() {
  const { user } = useAuth()
  return (
    <section className="relative overflow-hidden bg-[#08080a] py-28 text-[#f4f4f0] md:py-40">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-1/2 top-1/2 h-[40vw] w-[40vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet/20 blur-[130px]" />
        <div className="absolute bottom-0 left-[20%] h-[24vw] w-[24vw] rounded-full bg-acid/10 blur-[120px]" />
      </div>
      <div className="relative mx-auto max-w-edge px-[clamp(1rem,4vw,3.5rem)] text-center">
        <h2 className="display-face mx-auto max-w-5xl text-balance text-mega leading-[0.95]">Where do you start?</h2>
        <p className="mx-auto mt-6 max-w-xl text-lede text-[#f4f4f0]/60">Pick your ecosystem — you can add the others to the same account any time.</p>
        <div className="mx-auto mt-12 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Object.values(ECOSYSTEMS).map((e) => (
            <Link
              key={e.key}
              to={startPath(e.key, user)}
              onClick={() => (user ? trackEcosystemClick(e.key, 'home_cta') : track('signup_started', { ecosystem: e.key, source: 'home_cta' }))}
              className="rounded-2xl border border-white/15 bg-white/[0.03] p-5 text-left transition-colors hover:border-white/40"
            >
              <span className={`block h-2 w-2 rounded-full ${e.accentBg}`} />
              <span className="mt-4 block font-semibold">{e.plural}</span>
              <span className={`mt-2 inline-flex items-center gap-1 text-sm ${e.accent}`}>
                {user?.ecosystems?.[e.key]?.active ? 'Open' : 'Start'} <span aria-hidden>↗</span>
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-10 text-sm text-[#f4f4f0]/50">
          Already on STUDLYF?{' '}
          <Link to={user ? '/go' : '/login'} className="text-acid hover:underline">
            {user ? 'Go to your dashboard' : 'Log in'}
          </Link>
        </p>
      </div>
    </section>
  )
}
