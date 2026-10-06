import { FeatureGrid, LandingCTA, LandingHero, Steps, useEcosystemLanding } from '../../components/ecosystem/Landing'
import { SplitFeatures, Comparison, Manifesto } from '../../components/ecosystem/LandingRich'
import { LandingCommon } from '../../components/ecosystem/LandingCommon'
import { ImageVisual } from '../../components/ecosystem/previews'
import { SectionHeading } from '../../components/ui/SectionHeading'

const SEO = {
  title: 'STUDLYF for Founders | Build Your Startup Presence',
  description:
    'Create your founder and startup profile, structure market, competitor, business-model and go-to-market thinking, track startup readiness and get discovered by verified investors.',
  path: '/founders',
}

export default function FounderLanding() {
  const landing = useEcosystemLanding('FOUNDER', SEO)
  return (
    <>
      <LandingHero
        ecoKey="FOUNDER"
        landing={landing}
        eyebrow="STUDLYF for Founders"
        title="Build your startup with clarity."
        text="Create your founder and startup profile, structure your strategy and become discoverable to the startup ecosystem."
        primary="Start as a Founder"
        secondary={{ label: 'Explore Startup Ecosystem', to: '#workspace' }}
        visual={<ImageVisual src="/imported/photo-1517245386807-bb43f82c33c4.jpg" alt="A founder walking through the plan in a pitch meeting" accent="bg-violet" />}
      />

      <FeatureGrid
        id="workspace"
        eyebrow="The founder workspace"
        title="Think it through. Write it down. Show it."
        aside="Structured sections that turn scattered notes into a startup story investors can evaluate."
        accent="text-violet"
        items={[
          { title: 'Founder profile', text: 'Who you are, what you’ve built before and why you’re the one to solve this.' },
          { title: 'Startup profile', text: 'Name, one-liner, stage, funding stage, industry, team and location in one place.' },
          { title: 'Startup workspace', text: 'Problem, target customer and strategy sections you can refine as you learn.' },
          { title: 'Market analysis', text: 'Size the opportunity and explain why now — with the evidence you’ve gathered.' },
          { title: 'Competitor analysis', text: 'Map alternatives honestly and state where you win.' },
          { title: 'Business model', text: 'Who pays, how much, and why the unit economics work.' },
          { title: 'GTM strategy', text: 'Your first customers, your channels and how you’ll reach the next thousand.' },
          { title: 'Startup readiness', text: 'A transparent checklist score — every point tells you exactly what’s missing.' },
          { title: 'Investor discovery', text: 'Verified investors can find you by stage, industry and traction — you decide who connects.' },
        ]}
      />

      <SplitFeatures
        eyebrow="Inside the workspace"
        title="Think it through, section by section."
        aside="Each part of the workspace is a prompt to sharpen your thinking — and a block investors can read on your profile."
        accent="text-violet"
        items={[
          {
            kicker: 'Positioning',
            title: 'Start with the problem, not the pitch.',
            text: 'Define the problem, the customer you serve and the strategy behind your bet. These sections stay editable, so your story sharpens as you learn.',
            points: ['Problem & target customer', 'Strategy and why-now', 'One-liner and positioning'],
          },
          {
            kicker: 'Evidence',
            title: 'Market, competitors and model in one thread.',
            text: 'Size the opportunity, map the alternatives honestly and lay out your business model — the questions every investor asks, answered before the meeting.',
            points: ['Market analysis', 'Competitor map', 'Business model & unit economics', 'Go-to-market plan'],
          },
          {
            kicker: 'Readiness',
            title: 'A score that tells you what’s missing.',
            text: 'Startup readiness is a transparent checklist. Every point you’re missing is spelled out, so you always know what to work on next.',
            points: ['Transparent readiness score', 'Section-by-section gaps', 'Updates as you fill it in'],
          },
        ]}
      />

      <Steps
        eyebrow="How it works"
        title="From idea to investor-ready."
        accent="text-violet"
        steps={[
          { title: 'Create your founder profile', text: 'Who you are, what you’ve built and why this problem — in a couple of minutes.' },
          { title: 'Structure the workspace', text: 'Fill in market, competitors, model and go-to-market as you learn them.' },
          { title: 'Track your readiness', text: 'Watch the checklist score climb and see exactly what’s left.' },
          { title: 'Turn on discovery', text: 'Become visible to verified investors — and accept only the connections you want.' },
        ]}
      />

      <Comparison
        eyebrow="Why it’s different"
        title="A living profile beats a cold deck."
        subtitle="Decks go stale the day you send them. A STUDLYF profile keeps pace with the startup."
        accent="text-violet"
        oldLabel="The old way"
        newLabel="On STUDLYF"
        oldWay={['A static deck that’s outdated the day you send it', 'Cold intros and inbox noise', 'No way to show progress between meetings', 'Investors guess at your traction']}
        newWay={['A profile that updates as the startup evolves', 'Found by verified investors on the signals that matter', 'Readiness and traction visible before the first call', 'You approve every connection']}
      />

      <Manifesto
        eyebrow="The idea"
        statement="Fundraising rewards clarity. STUDLYF turns scattered notes into a startup investors can evaluate."
        accent="text-violet"
        points={[
          { title: 'Structure, not slides', text: 'Prompts that force the hard questions into clear answers.' },
          { title: 'Signals, not spam', text: 'Investors reach you through evidence — never a bought list.' },
          { title: 'Control, always', text: 'You decide who sees the full workspace and who you talk to.' },
        ]}
      />

      <section className="py-20 md:py-28">
        <div className="wrap grid gap-10 lg:grid-cols-2">
          <SectionHeading eyebrow="You stay in control" title="Discoverable, not exposed." accent="bg-violet" />
          <div className="space-y-5 text-mute">
            <p>Only investors verified by the STUDLYF team can browse startups — and only while your profile is set to discoverable.</p>
            <p>Before you accept a connection, investors see your startup profile, traction and readiness. Your full strategy workspace and contact email are shared only with investors you accept.</p>
            <p>Your founder profile lives on the same STUDLYF account as the rest of your work here — switch between roles whenever you need to.</p>
          </div>
        </div>
      </section>

      <LandingCTA ecoKey="FOUNDER" landing={landing} title="Turn your idea into a startup people can evaluate." text="Set up your founder and startup profile in under five minutes. Refine it every week." label="Create Founder Profile" />
      <LandingCommon />
    </>
  )
}
