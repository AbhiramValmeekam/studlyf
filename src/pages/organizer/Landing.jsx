import { FeatureGrid, LandingCTA, LandingHero, Steps, useEcosystemLanding } from '../../components/ecosystem/Landing'
import { SplitFeatures, Comparison, Manifesto } from '../../components/ecosystem/LandingRich'
import { LandingCommon } from '../../components/ecosystem/LandingCommon'
import { ImageVisual } from '../../components/ecosystem/previews'
import { SectionHeading } from '../../components/ui/SectionHeading'

const SEO = {
  title: 'STUDLYF for Organizations | Run Hackathons & Programs',
  description:
    'Companies, colleges, communities and incubators run hackathons, competitions, challenges and workshops with participant, team, submission, evaluation, ranking and certificate workflows.',
  path: '/organizations',
}

const AUDIENCE = ['Companies', 'Colleges', 'Universities', 'Startups', 'Communities', 'NGOs', 'Incubators', 'Innovation organizations', 'Event organizers']

export default function OrganizationLanding() {
  const landing = useEcosystemLanding('ORGANIZER', SEO)
  const started = landing.state && landing.state.status !== 'NONE'
  return (
    <>
      <LandingHero
        ecoKey="ORGANIZER"
        landing={landing}
        eyebrow="STUDLYF for Organizations & Organizers"
        title="Build programs. Bring people together. Measure what they create."
        text="Run hackathons, competitions, workshops, challenges and innovation programs with structured participant, project and evaluation workflows."
        primary={started ? 'View your organization' : 'Create an Organization'}
        secondary={{ label: 'Explore Organization Solutions', to: '#solutions' }}
        visual={<ImageVisual src="/imported/organizer-hero.jpg" alt="A STUDLYF hackathon event" accent="bg-amber-300" />}
      />

      <section className="py-16">
        <div className="wrap">
          <p className="eyebrow mb-6">Built for</p>
          <ul className="flex flex-wrap gap-2">
            {AUDIENCE.map((a) => (
              <li key={a} className="rounded-full border border-line/15 px-4 py-2 text-sm text-bone">{a}</li>
            ))}
          </ul>
        </div>
      </section>

      <FeatureGrid
        id="solutions"
        eyebrow="Solutions"
        title="Every stage of a program, in one place."
        accent="text-amber-300"
        cols="md:grid-cols-2 lg:grid-cols-4"
        items={[
          { title: 'Hackathons', text: 'Registrations, teams, submissions and judging for 24-hour sprints to month-long builds.' },
          { title: 'Competitions', text: 'Structured rounds with eligibility rules and deadlines.' },
          { title: 'Challenges', text: 'Problem statements with requirements like repositories, demos and videos.' },
          { title: 'Workshops', text: 'Publish sessions and manage who applied.' },
          { title: 'Participants', text: 'Every application in one list — review, shortlist and select with notifications.' },
          { title: 'Teams', text: 'Team size rules and team rosters captured with every submission.' },
          { title: 'Project submissions', text: 'Submissions are frozen at submit time so judging is always fair.' },
          { title: 'Evaluation', text: 'Weighted rubrics scored by evaluators, with visibility you control.' },
          { title: 'Rankings', text: 'Live rankings from completed evaluations, per program.' },
          { title: 'Certificates', text: 'Participation, shortlist and winner achievements issued automatically.' },
          { title: 'Analytics', text: 'Registrations, submissions and evaluation progress at a glance.' },
        ]}
      />

      <SplitFeatures
        eyebrow="Inside a program"
        title="Every stage handled, end to end."
        aside="One workflow carries a program from the first registration to the last certificate."
        accent="text-amber-300"
        items={[
          {
            kicker: 'Registration',
            title: 'From sign-up to selected team.',
            text: 'Collect registrations, apply team-size rules and capture rosters, then review, shortlist and select participants with notifications sent for you.',
            points: ['Registrations in one list', 'Team rules & rosters', 'Review, shortlist & notify'],
          },
          {
            kicker: 'Submission',
            title: 'Fair judging, frozen at submit.',
            text: 'Publish problem statements with the requirements you need — repos, demos, videos — and every submission is frozen at submit time so judging is always fair.',
            points: ['Problem statements & requirements', 'Submissions frozen at submit', 'Weighted rubrics'],
          },
          {
            kicker: 'Results',
            title: 'Rankings and certificates, automatically.',
            text: 'Live rankings build from completed evaluations, achievements are issued automatically, and analytics show registrations and progress at a glance.',
            points: ['Live rankings per program', 'Participation, shortlist & winner achievements', 'Analytics dashboard'],
          },
        ]}
      />

      <Steps
        eyebrow="How it works"
        title="Run a program in four steps."
        accent="text-amber-300"
        steps={[
          { title: 'Create your organization', text: 'Set up your team’s space in a minute.' },
          { title: 'Get verified', text: 'The STUDLYF team confirms you before programs go live.' },
          { title: 'Publish the opportunity', text: 'Open registrations for a hackathon, challenge, competition or workshop.' },
          { title: 'Review, judge & certify', text: 'Shortlist, score with rubrics and issue certificates automatically.' },
        ]}
      />

      <Comparison
        eyebrow="Why it’s different"
        title="One platform, not ten spreadsheets."
        subtitle="Running a program shouldn’t mean stitching together forms, inboxes and documents."
        accent="text-amber-300"
        oldLabel="The old way"
        newLabel="On STUDLYF"
        oldWay={['Registrations in spreadsheets', 'Submissions over email', 'Judging in scattered docs', 'Certificates made by hand']}
        newWay={['Registrations, teams and submissions in one list', 'Submissions frozen at submit for fair review', 'Weighted rubrics scored by your evaluators', 'Certificates issued automatically']}
      />

      <section className="py-20 md:py-28">
        <div className="wrap grid gap-10 lg:grid-cols-2">
          <SectionHeading eyebrow="Verified organizations" title="Trusted by participants." accent="bg-amber-300" />
          <div className="space-y-5 text-mute">
            <p>Create your organization in a minute. The STUDLYF team verifies it before your programs go live, so participants know every opportunity is real.</p>
            <p>Once verified, your team posts opportunities, reviews participants and follows evaluation from its own dashboard — a workspace built for running programs.</p>
          </div>
        </div>
      </section>

      <Manifesto
        eyebrow="The idea"
        statement="Great programs bring people together and measure what they create. STUDLYF runs the whole thing — from the first registration to the last certificate."
        accent="text-amber-300"
        points={[
          { title: 'One workflow', text: 'Registration, teams, submission, judging and results in one place.' },
          { title: 'Fair by design', text: 'Submissions freeze at submit; rubrics keep scoring honest.' },
          { title: 'Verified & trusted', text: 'Participants know every program on STUDLYF is real.' },
        ]}
      />

      <LandingCTA ecoKey="ORGANIZER" landing={landing} title="Launch your next program on STUDLYF." text="From registration to certificates — without spreadsheets." label={started ? 'View your organization' : 'Create an Organization'} />
      <LandingCommon />
    </>
  )
}
