import { useHome } from '../lib/queries'
import { useHashScroll } from '../lib/useHashScroll'
import { useSeo } from '../lib/seo'
import { heroContent } from '../data/studlyf'
import { Hero } from '../components/sections/Hero'
import { FeaturedOpportunities } from '../components/sections/FeaturedOpportunities'
import { Institutions } from '../components/sections/Institutions'
import { Voices } from '../components/sections/Voices'
import { Insights } from '../components/sections/Insights'
import { FAQ } from '../components/sections/FAQ'
import { FounderContact } from '../components/sections/FounderContact'
import { EcosystemGateway } from '../components/ecosystem/EcosystemGateway'
import { ChooseYourPathCTA, EcosystemConnections, EcosystemSpotlights } from '../components/ecosystem/HomeSections'

/**
 * The main STUDLYF landing page — role-neutral, organised around the four ecosystems:
 * Builders, Founders, Investors, HR & Organizations. Student-specific sections (learning pillars,
 * mentors, the mastery path) live on the Builders page (/builders).
 */
export default function Home() {
  const { data } = useHome()
  useHashScroll()
  useSeo({
    title: 'STUDLYF | One ecosystem for builders, founders, investors & organizations',
    description:
      'Builders prove their skills with real work, founders structure startups investors can evaluate, and verified HR teams and organizations hire talent and run hackathons — one account, one ecosystem.',
    path: '/',
  })

  return (
    <>
      <Hero hero={heroContent} />
      <div className="relative isolate">
        <div aria-hidden className="grid-bg pointer-events-none absolute inset-0 -z-10" />
        {/* The gateway: every ecosystem's public landing page starts here. */}
        <div id="ecosystems" className="scroll-mt-28">
          <EcosystemGateway />
        </div>
        <EcosystemConnections />
        <EcosystemSpotlights />
        <div id="opportunities" className="scroll-mt-28">
          <FeaturedOpportunities items={data?.featuredOpportunities || []} />
        </div>
        <Institutions />
        <Voices />
        <div id="insights" className="scroll-mt-28">
          <Insights />
        </div>
        <FAQ />
        <div id="contact" className="scroll-mt-28">
          <FounderContact />
        </div>
        <ChooseYourPathCTA />
      </div>
    </>
  )
}
