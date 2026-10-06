import { useHome } from '../../lib/queries'
import { ImageVisual } from '../../components/ecosystem/previews'
import { OpportunityCard } from '../../components/ui/cards'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { FeatureGrid, LandingCTA, LandingHero, Steps, useEcosystemLanding } from '../../components/ecosystem/Landing'
import { LandingCommon } from '../../components/ecosystem/LandingCommon'
import { PlacementEcosystem } from '../../components/sections/PlacementEcosystem'
import { HumanAuthority } from '../../components/sections/HumanAuthority'
import { MasterYourPath } from '../../components/sections/MasterYourPath'
import { Mentors } from '../../components/sections/Mentors'
import { Leaders } from '../../components/sections/Leaders'

const SEO = {
  title: 'STUDLYF for Builders | Build. Prove. Get Discovered.',
  description:
    'Create a builder profile backed by real work: discover hackathons and internships, ship projects, get evaluated, earn achievements and get discovered by companies.',
  path: '/builders',
}

export default function BuilderLanding() {
  const landing = useEcosystemLanding('BUILDER', SEO)
  const { data } = useHome()
  const featured = (data?.featuredOpportunities || []).slice(0, 3)

  return (
    <>
      <LandingHero
        ecoKey="BUILDER"
        landing={landing}
        eyebrow="STUDLYF for Builders & Students"
        title="Build something worth being discovered for."
        text="Find opportunities, build real projects, showcase your skills and create a profile backed by your work."
        primary="Create Builder Profile"
        secondary={{ label: 'Explore Opportunities', to: '#opportunities' }}
        visual={<ImageVisual src="/imported/builder-hero.jpg" alt="Builders pair up on a project at a screen" accent="bg-acid" />}
      />

      <FeatureGrid
        eyebrow="What you get"
        title="A profile that proves it."
        aside="Every section fills itself from what you actually do on STUDLYF — nothing to exaggerate, everything to show."
        items={[
          { title: 'Opportunities', text: 'Hackathons, internships, challenges and fellowships in one feed, matched to your skills.', tag: 'Apply in one place' },
          { title: 'Projects', text: 'Publish projects with your team, stack, links and demo — public, unlisted or private.', tag: 'Teams & roles' },
          { title: 'Skills', text: 'A skill set tied to the projects that demonstrate it, not a list of buzzwords.', tag: 'Evidence-linked' },
          { title: 'Evaluations', text: 'Submit to opportunities and get scored against real rubrics by named evaluators.', tag: 'Rubric feedback' },
          { title: 'Achievements', text: 'Wins, shortlists and completions are issued and verified by the platform automatically.', tag: 'Verified' },
          { title: 'Talent discovery', text: 'Verified hiring teams find you through your projects and results — on your terms.', tag: 'You control visibility' },
        ]}
      />

      {/* Learning, practice and mentorship — the builder's toolkit (formerly on the homepage). */}
      <PlacementEcosystem />
      <HumanAuthority />

      <Steps
        eyebrow="How it works"
        title="From first profile to first offer."
        steps={[
          { title: 'Create your builder profile', text: 'Your college, skills and links in two minutes — one account for everything on STUDLYF.' },
          { title: 'Find an opportunity', text: 'Filter hackathons, challenges and internships by skill, mode and deadline.' },
          { title: 'Build and submit', text: 'Ship with your team and submit the project — it’s frozen as submitted for fair review.' },
          { title: 'Get evaluated & discovered', text: 'Scores, feedback and achievements land on your profile for companies to see.' },
        ]}
      />

      <MasterYourPath />
      <div id="mentors" className="scroll-mt-28">
        <Mentors />
      </div>
      <Leaders />

      <section id="opportunities" className="scroll-mt-28 py-20 md:py-28">
        <div className="wrap">
          <SectionHeading eyebrow="Live on STUDLYF" title="Open right now." aside={<p className="text-mute">A few of the opportunities builders are applying to this week.</p>} />
          {featured.length ? (
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {featured.map((o, i) => (
                <OpportunityCard key={o.id} opp={o} index={i} />
              ))}
            </div>
          ) : (
            <p className="mt-10 text-mute">New opportunities are published every week — create your profile to get them first.</p>
          )}
        </div>
      </section>

      <LandingCTA ecoKey="BUILDER" landing={landing} title="Your work is your résumé now." text="Join thousands of students building in public, getting evaluated and getting hired for what they can do." label="Join as a Builder" />
      <LandingCommon builder />
    </>
  )
}
