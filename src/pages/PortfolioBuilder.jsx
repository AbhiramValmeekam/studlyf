import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useBuilderProfile } from '../lib/queries'
import { PORTFOLIO_TEMPLATES } from '../components/portfolio/registry'
import { Button, ArrowIcon } from '../components/ui/Button'
import { Badge, Spinner } from '../components/ui/atoms'
import { RevealGroup, RevealItem, trackSpotlight } from '../components/ui/Reveal'
import { ExploreHero, StatPills, SectionLabel } from '../components/explore/parts'

const svgProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const FEATURES = [
  {
    title: 'Shareable public page',
    desc: 'One clean link recruiters and organizers can open on any device — no PDFs, no formatting drift.',
    tint: 'bg-acid/10 text-acid',
    icon: (
      <svg {...svgProps} className="h-5 w-5">
        <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
        <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
      </svg>
    ),
  },
  {
    title: 'Projects front and center',
    desc: 'Your shipped community projects turn the page into living proof of work — not just a résumé.',
    tint: 'bg-violet/15 text-violet',
    icon: (
      <svg {...svgProps} className="h-5 w-5">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    title: 'Skill-matched discovery',
    desc: 'The skills you list power recommendations, so the right opportunities and recruiters find you.',
    tint: 'bg-acid/10 text-acid',
    icon: (
      <svg {...svgProps} className="h-5 w-5">
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    ),
  },
  {
    title: 'Four distinct layouts',
    desc: 'Editorial, Minimal, Terminal or Spotlight — switch anytime without touching your content.',
    tint: 'bg-amber-400/15 text-amber-300',
    icon: (
      <svg {...svgProps} className="h-5 w-5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    title: 'Always in sync',
    desc: 'Ship a new project or add a skill and your portfolio updates itself — one source of truth.',
    tint: 'bg-flare/15 text-flare',
    icon: (
      <svg {...svgProps} className="h-5 w-5">
        <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
        <path d="M21 3v5h-5" />
      </svg>
    ),
  },
  {
    title: 'Recruiter-ready',
    desc: 'Availability, headline, links and verified achievements — everything a recruiter checks, in one view.',
    tint: 'bg-violet/15 text-violet',
    icon: (
      <svg {...svgProps} className="h-5 w-5">
        <path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6l-8-3Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
]

const STEPS = [
  { n: '01', title: 'Pick a layout', desc: 'Start from one of four designer-built templates. It sets the vibe — swap it anytime.' },
  { n: '02', title: 'Add your story & projects', desc: 'Headline, bio, skills and the projects you have shipped come together into one page.' },
  { n: '03', title: 'Publish & share', desc: 'Flip it public and share your studlyf.in link with recruiters, organizers and your network.' },
]

const STATS = [
  { label: 'Layouts', value: '4' },
  { label: 'Setup', value: '5 min' },
  { label: 'Price', value: 'Free' },
  { label: 'Shareable', value: 'Link' },
]
// Stylized mini-previews of the four portfolio layouts. Portfolios are live web pages,
// so these mocks read as dark site previews (framed on a stage by TemplateCard below).
const bar = (w, tone = 'bg-bone/25') => <span className={`block h-1.5 rounded-full ${tone}`} style={{ width: w }} />

function EditorialMock() {
  return (
    <div className="flex h-full flex-col items-center gap-2.5 bg-ink px-5 py-6 text-center">
      <span className="block h-2.5 w-1/2 rounded bg-bone/80" />
      {bar('34%', 'bg-acid/70')}
      <span className="my-1 block h-px w-8 bg-line/30" />
      {bar('90%')}
      {bar('80%')}
      {bar('86%')}
      <div className="mt-2 flex w-full flex-col gap-1.5">
        {bar('60%', 'bg-bone/40')}
        {bar('96%')}
        {bar('72%')}
      </div>
    </div>
  )
}

function MinimalMock() {
  return (
    <div className="flex h-full flex-col gap-3 bg-ink px-6 py-7">
      <span className="block h-2.5 w-2/5 rounded bg-bone/80" />
      {bar('30%', 'bg-mute/40')}
      <span className="mt-2 block h-px w-full bg-line/20" />
      {[0, 1, 2].map((s) => (
        <div key={s} className="flex items-start gap-3">
          <span className="mt-0.5 block h-1.5 w-8 shrink-0 rounded-full bg-acid/50" />
          <div className="flex-1 space-y-1.5">
            {bar('100%')}
            {bar('76%')}
          </div>
        </div>
      ))}
    </div>
  )
}
function TerminalMock() {
  return (
    <div className="flex h-full flex-col gap-2 bg-[#0a0d0b] px-4 py-4 font-mono">
      <div className="flex items-center gap-1.5">
        <span className="block h-2 w-2 rounded-full bg-flare/70" />
        <span className="block h-2 w-2 rounded-full bg-amber-300/70" />
        <span className="block h-2 w-2 rounded-full bg-emerald-400/70" />
      </div>
      {[0, 1, 2].map((s) => (
        <div key={s} className="flex items-center gap-2 pt-1">
          <span className="text-[10px] leading-none text-emerald-400">$</span>
          {bar(['70%', '52%', '84%'][s], 'bg-emerald-400/30')}
        </div>
      ))}
      <div className="mt-1 space-y-1.5 border-l-2 border-emerald-400/40 pl-2">
        {bar('92%', 'bg-bone/30')}
        {bar('68%', 'bg-bone/30')}
      </div>
    </div>
  )
}

function SpotlightMock() {
  return (
    <div className="flex h-full flex-col gap-3 bg-gradient-to-br from-violet/20 via-ink to-acid/10 px-5 py-6">
      <span className="block h-4 w-3/4 rounded bg-gradient-to-r from-acid to-violet" />
      {bar('40%', 'bg-bone/40')}
      <div className="mt-auto grid grid-cols-2 gap-2">
        {[0, 1].map((s) => (
          <div key={s} className="space-y-1.5 rounded-lg border border-line/15 bg-ink2/60 p-2.5">
            {bar('80%', 'bg-bone/50')}
            {bar('60%')}
          </div>
        ))}
      </div>
    </div>
  )
}

const MOCKS = { editorial: EditorialMock, minimal: MinimalMock, terminal: TerminalMock, spotlight: SpotlightMock }
const TAGS = { editorial: 'The classic', minimal: 'Lots of air', terminal: 'For devs', spotlight: 'Bold' }
function FeatureCard({ feature }) {
  return (
    <RevealItem onMouseMove={trackSpotlight} className="h-full">
      <div className="spotlight-card card-surface flex h-full flex-col p-6">
        <div className={`grid h-11 w-11 place-items-center rounded-xl ${feature.tint}`}>{feature.icon}</div>
        <h3 className="mt-5 text-lg font-semibold tracking-tight text-bone">{feature.title}</h3>
        <p className="mt-2 text-sm leading-6 text-mute">{feature.desc}</p>
      </div>
    </RevealItem>
  )
}

function TemplateCard({ tpl }) {
  const Mock = MOCKS[tpl.id] || EditorialMock
  return (
    <RevealItem onMouseMove={trackSpotlight} className="h-full">
      <Link
        to={`/builders/profile?template=${tpl.id}`}
        className="spotlight-card card-surface group flex h-full flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1"
      >
        <div className="relative overflow-hidden border-b border-line/10 bg-gradient-to-br from-line/[0.06] to-transparent p-5">
          <div className="aspect-[3/4] w-full overflow-hidden rounded-lg ring-1 ring-line/15 transition-transform duration-500 group-hover:scale-[1.03]">
            <Mock />
          </div>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold tracking-tight text-bone transition-colors group-hover:text-acid">{tpl.name}</h3>
            <Badge tone="violet">{TAGS[tpl.id] || 'Layout'}</Badge>
          </div>
          <p className="mt-2 flex-1 text-sm leading-6 text-mute">{tpl.sub}</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-acid">
            Use this layout
            <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </div>
      </Link>
    </RevealItem>
  )
}
export default function PortfolioBuilder() {
  const { isBuilder } = useAuth()
  const { data: profile, isLoading } = useBuilderProfile(isBuilder)

  const scrollToTemplates = () => {
    document.getElementById('templates')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <ExploreHero
        eyebrow="Job Prep · Portfolio"
        title="Build a portfolio that speaks for you."
        lead="Turn your projects, skills and achievements into one shareable page. Pick a designer-built layout, add your story, and publish a link recruiters can open anywhere — free."
      >
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button onClick={scrollToTemplates} magnetic={false}>
            Choose a layout <ArrowIcon />
          </Button>
          <Button to="/builders/profile" variant="outline" magnetic={false}>
            Edit your portfolio
          </Button>
        </div>
        <StatPills items={STATS} className="mt-10 max-w-2xl" />
      </ExploreHero>

      <div className="wrap py-16">
        {/* Features */}
        <SectionLabel
          eyebrow="Why a portfolio"
          title="More than a résumé — proof of work."
          lead="A living page that shows what you have built, backed by skills and verified achievements."
        />
        <RevealGroup className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} feature={f} />
          ))}
        </RevealGroup>

        {/* Templates */}
        <section id="templates" className="mt-24 scroll-mt-28">
          <SectionLabel
            eyebrow="Layouts"
            title="Four layouts, one you."
            lead="Each is built to read cleanly on any device. Pick one to start — switch anytime without losing your content."
          />
          <RevealGroup className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PORTFOLIO_TEMPLATES.map((tpl) => (
              <TemplateCard key={tpl.id} tpl={tpl} />
            ))}
          </RevealGroup>
        </section>
        {/* How it works */}
        <section className="mt-24">
          <SectionLabel eyebrow="How it works" title="From projects to a public page in three steps." />
          <RevealGroup className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            {STEPS.map((step) => (
              <RevealItem key={step.n} onMouseMove={trackSpotlight} className="h-full">
                <div className="spotlight-card card-surface flex h-full flex-col p-6">
                  <span className="display-face text-4xl text-acid/80">{step.n}</span>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight text-bone">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-mute">{step.desc}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </section>

        {/* Your portfolio */}
        <section className="mt-24">
          <PortfolioStatus isBuilder={isBuilder} isLoading={isLoading} profile={profile} />
        </section>
      </div>
    </>
  )
}

// Live status of the signed-in builder's own portfolio, so this page also acts as the
// jumping-off point back into editing or sharing.
function PortfolioStatus({ isBuilder, isLoading, profile }) {
  const wrapCls = 'relative overflow-hidden rounded-3xl border border-line/10 bg-gradient-to-br from-acid/[0.08] to-violet/[0.06] p-8 text-center sm:p-12'

  if (!isBuilder) {
    return (
      <div className={wrapCls}>
        <p className="eyebrow justify-center text-acid">Your portfolio</p>
        <h2 className="display-face mt-3 text-3xl tracking-tight sm:text-4xl">Become a builder to publish yours.</h2>
        <p className="mx-auto mt-3 max-w-xl text-mute">Set up a builder profile to unlock a shareable portfolio, skill-matching and application tracking.</p>
        <div className="mt-8 flex justify-center">
          <Button to="/onboarding" magnetic={false}>Become a builder <ArrowIcon /></Button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={wrapCls}>
        <div className="grid place-items-center py-6"><Spinner className="h-6 w-6 text-acid" /></div>
      </div>
    )
  }

  const isPublic = profile?.visibility === 'PUBLIC'
  const hasProfile = !!profile
  return (
    <div className={wrapCls}>
      <p className="eyebrow justify-center text-acid">Your portfolio</p>
      <h2 className="display-face mt-3 text-3xl tracking-tight sm:text-4xl">
        {!hasProfile ? 'Create your portfolio.' : isPublic ? 'Your portfolio is live.' : 'Ready to publish.'}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-mute">
        {!hasProfile
          ? 'Pick a layout above and add your details to publish a shareable page.'
          : isPublic
            ? 'Share your link with recruiters and organizers — it updates itself as you ship.'
            : 'Your portfolio is private. Flip it public in your profile to share the link.'}
      </p>
      {hasProfile && isPublic && profile.username && (
        <p className="mx-auto mt-4 truncate font-mono text-sm text-bone/70">studlyf.in/builders/{profile.username}</p>
      )}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        {hasProfile && isPublic && profile.username ? (
          <>
            <Button to={`/builders/${profile.username}`} magnetic={false}>View live portfolio <ArrowIcon /></Button>
            <Button to="/builders/profile" variant="outline" magnetic={false}>Edit portfolio</Button>
          </>
        ) : (
          <Button to="/builders/profile" magnetic={false}>{hasProfile ? 'Edit & publish' : 'Create your portfolio'} <ArrowIcon /></Button>
        )}
      </div>
    </div>
  )
}
