import { FeatureGrid, LandingCTA, LandingHero, Steps, useEcosystemLanding } from '../../components/ecosystem/Landing'
import { SplitFeatures, Comparison, Manifesto } from '../../components/ecosystem/LandingRich'
import { LandingCommon } from '../../components/ecosystem/LandingCommon'
import { ImageVisual } from '../../components/ecosystem/previews'

const SEO = {
  title: 'STUDLYF for Investors | Discover Founders & Startups',
  description:
    'Verified investors explore student and early-stage founders through structured startup profiles, traction, readiness, industry, geography and funding stage — and connect with founder consent.',
  path: '/investors',
}

export default function InvestorLanding() {
  const landing = useEcosystemLanding('INVESTOR', SEO)
  const pending = landing.state && !landing.state.active && landing.state.status !== 'NONE'
  return (
    <>
      <LandingHero
        ecoKey="INVESTOR"
        landing={landing}
        eyebrow="STUDLYF for Investors · Verified access"
        title="Discover founders beyond the pitch."
        text="Explore startups and founders through structured profiles, traction, readiness and relevant business signals."
        primary={pending ? 'View access status' : 'Request Investor Access'}
        secondary={{ label: 'Explore Investor Ecosystem', to: '#how-access-works' }}
        visual={<ImageVisual src="/imported/photo-1551288049-bebda4e38f71.jpg" alt="A traction and metrics dashboard" accent="bg-flare" />}
      />

      <FeatureGrid
        eyebrow="Signals, not slides"
        title="Everything you’d ask in the first meeting — before it."
        accent="text-flare"
        items={[
          { title: 'Founder discovery', text: 'Founder backgrounds, previous builds and how they think about the problem.' },
          { title: 'Startup discovery', text: 'Structured startup profiles instead of cold decks and inbox noise.' },
          { title: 'Traction', text: 'Users, revenue, growth and highlights — in the founder’s own words, side by side.' },
          { title: 'Readiness', text: 'A transparent checklist of what a startup has (and hasn’t) worked through yet.' },
          { title: 'Industry, geography & stage', text: 'Filter by sector, city, startup stage and funding stage.' },
          { title: 'Consent-based connections', text: 'Request a connection; the founder decides. Workspace and contact are shared on acceptance.' },
        ]}
      />

      <SplitFeatures
        eyebrow="What you can evaluate"
        title="Everything you’d ask in the first meeting — before it."
        aside="Structured profiles replace the cold deck, so your first call starts where it used to end."
        accent="text-flare"
        items={[
          {
            kicker: 'Founders',
            title: 'The people, before the pitch.',
            text: 'See a founder’s background, what they’ve built before and how they frame the problem — the judgement calls that decks never show.',
            points: ['Founder background', 'Previous builds', 'How they think about the problem'],
          },
          {
            kicker: 'Startups',
            title: 'Structured profiles, not cold decks.',
            text: 'One-liner, stage, traction and readiness laid out the same way for every startup, so comparison is honest and fast.',
            points: ['Traction in the founder’s words', 'Transparent readiness checklist', 'Stage and funding stage'],
          },
          {
            kicker: 'Filters',
            title: 'Find your thesis, fast.',
            text: 'Filter by sector, city, startup stage and funding stage to surface only the founders that fit what you back.',
            points: ['Industry & sector', 'Geography', 'Startup & funding stage'],
          },
        ]}
      />

      <Comparison
        eyebrow="Why it’s different"
        title="Signals, not slides."
        subtitle="Deal flow shouldn’t mean an inbox of cold decks and unverifiable claims."
        accent="text-flare"
        oldLabel="The old way"
        newLabel="On STUDLYF"
        oldWay={['An inbox full of cold decks', 'Traction you can’t verify', 'Hours of first calls to learn the basics', 'Founders you never hear about']}
        newWay={['Structured profiles you can scan in minutes', 'Traction and readiness stated up front', 'The basics answered before the first call', 'A filtered pipeline matched to your thesis']}
      />

      <div id="how-access-works" className="scroll-mt-28">
        <Steps
          eyebrow="How investor access works"
          title="Controlled on purpose."
          accent="text-flare"
          steps={[
            { title: 'Request access', text: 'Tell us about your firm, thesis, stages and sectors.' },
            { title: 'Verification', text: 'The STUDLYF team verifies every investor before any founder data is visible.' },
            { title: 'Discover', text: 'Browse discoverable founders and startups with structured filters.' },
            { title: 'Connect with consent', text: 'Founders accept or decline. Accepted connections unlock their workspace and email.' },
          ]}
        />
      </div>

      <Manifesto
        eyebrow="The idea"
        statement="The best deals are the ones you see early — with enough context to act. STUDLYF puts founder signals in front of you before the pitch."
        accent="text-flare"
        points={[
          { title: 'Context up front', text: 'Traction, readiness and stage before you spend a first call on basics.' },
          { title: 'Verified access', text: 'Every investor is checked before any founder data is visible.' },
          { title: 'Consent-based', text: 'Founders accept or decline — connections are earned, not scraped.' },
        ]}
      />

      <LandingCTA ecoKey="INVESTOR" landing={landing} title="Meet founders earlier — with context." text="Access is reviewed by the STUDLYF team. Most requests are answered within two working days." label={pending ? 'View access status' : 'Request Investor Access'} />
      <LandingCommon />
    </>
  )
}
