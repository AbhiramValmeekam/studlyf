import { FeatureGrid, LandingCTA, LandingHero, Steps, useEcosystemLanding } from '../../components/ecosystem/Landing'
import { SplitFeatures, Comparison, Manifesto } from '../../components/ecosystem/LandingRich'
import { LandingCommon } from '../../components/ecosystem/LandingCommon'
import { ImageVisual } from '../../components/ecosystem/previews'

const SEO = {
  title: 'STUDLYF for HR | Discover Talent Through Real Work',
  description:
    'Verified hiring teams discover builders by skills, projects, GitHub, evaluations and achievements, then shortlist, interview and hire in a private pipeline.',
  path: '/hr',
}

export default function HrLanding() {
  const landing = useEcosystemLanding('HR', SEO)
  const pending = landing.state && !landing.state.active && landing.state.status !== 'NONE'
  return (
    <>
      <LandingHero
        ecoKey="HR"
        landing={landing}
        eyebrow="STUDLYF for HR & Talent · Verified access"
        title="Find talent through what they’ve built."
        text="Discover builders through skills, projects, evaluations, achievements and demonstrated work."
        primary={pending ? 'View verification status' : 'Request HR Access'}
        secondary={{ label: 'Explore Talent', to: '#talent' }}
        visual={<ImageVisual src="/imported/hr-hero.jpg" alt="A candidate interview in progress" accent="bg-lime-300" />}
      />

      <FeatureGrid
        id="talent"
        eyebrow="Evidence-first hiring"
        title="Résumés say. Projects show."
        accent="text-lime-300"
        items={[
          { title: 'Talent discovery', text: 'Search public builder profiles by keyword, college, city and availability.' },
          { title: 'Skill filtering', text: 'Filter by the skills builders have listed and demonstrated in projects.' },
          { title: 'Project-based discovery', text: 'See the public projects each builder has shipped with their team.' },
          { title: 'GitHub & links', text: 'Jump straight to repositories, portfolios and live demos.' },
          { title: 'Evaluations', text: 'Rubric scores that organizers chose to make public — no opaque ranking.' },
          { title: 'Achievements', text: 'Wins, shortlists and completions, with platform-verified badges.' },
          { title: 'Shortlisting', text: 'Save candidates to a private pipeline only your account can see.' },
          { title: 'Interviews', text: 'Schedule and track interviews in one list, sorted by date.' },
          { title: 'Hiring', text: 'Move candidates through offer and hired — and see your funnel at a glance.' },
        ]}
      />

      <SplitFeatures
        eyebrow="How discovery works"
        title="Hire for what they’ve shipped."
        aside="Every profile is backed by real work — so you screen on evidence, not phrasing."
        accent="text-lime-300"
        items={[
          {
            kicker: 'Discovery',
            title: 'Search talent by evidence.',
            text: 'Find builders by keyword, college, city and availability, then filter by the skills they’ve actually demonstrated in projects.',
            points: ['Keyword, college & city', 'Availability', 'Skills demonstrated in projects'],
          },
          {
            kicker: 'Evidence',
            title: 'Projects, GitHub and evaluations in one view.',
            text: 'See the public projects a builder shipped with their team, jump to repositories and demos, and read rubric scores organizers chose to make public.',
            points: ['Public projects & teams', 'Repositories & live demos', 'Rubric evaluations', 'Platform-verified achievements'],
          },
          {
            kicker: 'Pipeline',
            title: 'Shortlist, interview, hire — privately.',
            text: 'Save candidates to a pipeline only your account can see, track interviews by date and move people through offer and hired.',
            points: ['Private shortlist', 'Interview tracking', 'Offer → hired funnel'],
          },
        ]}
      />

      <Comparison
        eyebrow="Why it’s different"
        title="Résumés say. Projects show."
        subtitle="A keyword-matched CV tells you how someone writes. STUDLYF tells you what they can build."
        accent="text-lime-300"
        oldLabel="The old way"
        newLabel="On STUDLYF"
        oldWay={['Keyword-matched résumés', 'Claims you can’t check', 'Portfolios scattered across links', 'No signal on real ability']}
        newWay={['Profiles backed by shipped projects', 'Platform-verified achievements', 'Repos, demos and evaluations in one place', 'Evidence of what they can actually do']}
      />

      <Steps
        eyebrow="Getting access"
        title="Verified teams only."
        accent="text-lime-300"
        steps={[
          { title: 'Request HR access', text: 'Your company, role and work email.' },
          { title: 'Organization verification', text: 'We confirm you hire for the company you named before any profile is visible.' },
          { title: 'Search & shortlist', text: 'Find builders by skills and evidence; keep notes privately.' },
          { title: 'Interview & hire', text: 'Track every candidate from shortlist to hired.' },
        ]}
      />

      <Manifesto
        eyebrow="The idea"
        statement="Hire for what people can do. STUDLYF replaces the best-written CV with proof of real, shipped work."
        accent="text-lime-300"
        points={[
          { title: 'Evidence-first', text: 'Projects, repos and evaluations do the talking.' },
          { title: 'Verified teams only', text: 'Builders appear only to hiring teams we’ve confirmed.' },
          { title: 'On their terms', text: 'People are visible only when their profile is public.' },
        ]}
      />

      <LandingCTA ecoKey="HR" landing={landing} title="Hire for what people can do." text="Builders only appear to verified hiring teams, and only if their profile is public." label={pending ? 'View verification status' : 'Request HR Access'} />
      <LandingCommon />
    </>
  )
}
