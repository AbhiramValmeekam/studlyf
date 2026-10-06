import { lazy, Suspense } from 'react'
import { Navigate, Routes, Route, useLocation, useParams } from 'react-router-dom'
import { SiteLayout } from './components/layout/SiteLayout'
import { ErrorBoundary } from './components/layout/ErrorBoundary'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { RequireBuilder } from './components/layout/RequireBuilder'
import { RequireAccount, RequireAdmin, RequireEcosystem } from './components/layout/RequireEcosystem'
import { ScrollToTop } from './components/layout/ScrollToTop'
import { Spinner } from './components/ui/atoms'

// Home is the first paint — load it eagerly. Everything else is split.
import Home from './pages/Home'

/** lazy() for a named export. */
const lazyNamed = (loader, name) => lazy(() => loader().then((m) => ({ default: m[name] })))

// ---- shared / builder content -------------------------------------------------------
const Opportunities = lazy(() => import('./pages/Opportunities'))
const OpportunityDetail = lazy(() => import('./pages/OpportunityDetail'))
const Jobs = lazy(() => import('./pages/Jobs'))
const JobDetail = lazy(() => import('./pages/JobDetail'))
const Resources = lazy(() => import('./pages/Resources'))
const ResourceDetail = lazy(() => import('./pages/ResourceDetail'))
const Courses = lazy(() => import('./pages/Courses'))
const CourseDetail = lazy(() => import('./pages/CourseDetail'))
const Studhub = lazy(() => import('./pages/Studhub'))
const StudhubBenefit = lazy(() => import('./pages/StudhubBenefit'))
const Ott = lazy(() => import('./pages/Ott'))
const OttTitle = lazy(() => import('./pages/OttTitle'))
const MockDrills = lazy(() => import('./pages/MockDrills'))
const MockDrillDetail = lazy(() => import('./pages/MockDrillDetail'))
const ProjectBriefs = lazy(() => import('./pages/ProjectBriefs'))
const ProjectBriefDetail = lazy(() => import('./pages/ProjectBriefDetail'))
const ResumeBuilder = lazy(() => import('./pages/ResumeBuilder'))
const ResumeEditor = lazy(() => import('./pages/ResumeEditor'))
const PortfolioBuilder = lazy(() => import('./pages/PortfolioBuilder'))
const Search = lazy(() => import('./pages/Search'))
const Saved = lazy(() => import('./pages/Saved'))
const Account = lazy(() => import('./pages/Account'))
const Welcome = lazy(() => import('./pages/Welcome'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Notifications = lazy(() => import('./pages/Notifications'))
const Community = lazy(() => import('./pages/Community'))
const CommunityProject = lazy(() => import('./pages/CommunityProject'))
const CertificateVerify = lazy(() => import('./pages/CertificateVerify'))
const CommunityMine = lazy(() => import('./pages/CommunityMine'))
const ProjectForm = lazy(() => import('./pages/ProjectForm'))

// ---- auth + routing -------------------------------------------------------------------
const Login = lazy(() => import('./pages/auth/Login'))
const Signup = lazy(() => import('./pages/auth/Register'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'))
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'))
const ChoosePath = lazy(() => import('./pages/ChoosePath'))
const PostLogin = lazyNamed(() => import('./pages/ChoosePath'), 'PostLogin')

// ---- builder ------------------------------------------------------------------------------
const BuilderLanding = lazy(() => import('./pages/builder/Landing'))
const BuilderOnboarding = lazy(() => import('./pages/builder/Onboarding'))
const BuilderDashboard = lazy(() => import('./pages/builder/Dashboard'))
const BuilderApplications = lazy(() => import('./pages/builder/Applications'))
const BuilderApplicationDetail = lazy(() => import('./pages/builder/ApplicationDetail'))
const BuilderAchievements = lazy(() => import('./pages/builder/Achievements'))
const BuilderRoadmap = lazy(() => import('./pages/builder/Roadmap'))
const BuilderProfilePublic = lazy(() => import('./pages/BuilderProfile'))
const OrganizationProfilePublic = lazy(() => import('./pages/OrganizationProfile'))
const FounderProfilePublic = lazy(() => import('./pages/FounderPublicProfile'))

// ---- founder ------------------------------------------------------------------------------
const FounderLanding = lazy(() => import('./pages/founder/Landing'))
const FounderOnboarding = lazy(() => import('./pages/founder/Onboarding'))
const FounderDashboard = lazy(() => import('./pages/founder/Dashboard'))
const FounderProfilePage = lazyNamed(() => import('./pages/founder/Editors'), 'FounderProfilePage')
const StartupPage = lazyNamed(() => import('./pages/founder/Editors'), 'StartupPage')
const WorkspacePage = lazyNamed(() => import('./pages/founder/Editors'), 'WorkspacePage')
const WorkspaceMarket = lazyNamed(() => import('./pages/founder/Editors'), 'MarketPage')
const WorkspaceCompetitors = lazyNamed(() => import('./pages/founder/Editors'), 'CompetitorsPage')
const WorkspaceSwot = lazyNamed(() => import('./pages/founder/Editors'), 'SwotPage')
const WorkspaceBusinessModel = lazyNamed(() => import('./pages/founder/Editors'), 'BusinessModelPage')
const WorkspaceGtm = lazyNamed(() => import('./pages/founder/Editors'), 'GtmPage')
const WorkspacePitchDeck = lazyNamed(() => import('./pages/founder/Editors'), 'PitchDeckPage')
const TractionPage = lazyNamed(() => import('./pages/founder/Editors'), 'TractionPage')
const ReadinessPage = lazy(() => import('./pages/founder/Readiness'))
const UpdatesPage = lazy(() => import('./pages/founder/Updates'))
const FounderInvestors = lazy(() => import('./pages/founder/Investors'))

// ---- investor -----------------------------------------------------------------------------
const InvestorLanding = lazy(() => import('./pages/investor/Landing'))
const InvestorAccessRequest = lazy(() => import('./pages/investor/Access'))
const InvestorAccessStatus = lazyNamed(() => import('./pages/investor/Access'), 'InvestorAccessStatus')
const InvestorPreferences = lazyNamed(() => import('./pages/investor/Access'), 'InvestorPreferences')
const InvestorDashboard = lazy(() => import('./pages/investor/Dashboard'))
const InvestorIntelligence = lazyNamed(() => import('./pages/investor/Dashboard'), 'InvestorIntelligence')
const InvestorConnections = lazyNamed(() => import('./pages/investor/Dashboard'), 'InvestorConnections')
const InvestorDiscover = lazy(() => import('./pages/investor/Discover'))
const FounderDetail = lazy(() => import('./pages/investor/FounderDetail'))

// ---- HR -------------------------------------------------------------------------------------
const HrLanding = lazy(() => import('./pages/hr/Landing'))
const HrVerification = lazy(() => import('./pages/hr/Access'))
const HrCompany = lazyNamed(() => import('./pages/hr/Access'), 'HrCompany')
const HrDashboard = lazyNamed(() => import('./pages/hr/Pipeline'), 'HrDashboard')
const HrPipeline = lazy(() => import('./pages/hr/Pipeline'))
const HrHiring = lazyNamed(() => import('./pages/hr/Pipeline'), 'HrHiring')
const HrTalent = lazy(() => import('./pages/hr/Talent'))
const HrJobs = lazyNamed(() => import('./pages/hr/Jobs'), 'HrJobs')
const HrJobForm = lazyNamed(() => import('./pages/hr/Jobs'), 'HrJobForm')

// ---- organizations -----------------------------------------------------------------------
const OrgLanding = lazy(() => import('./pages/organizer/Landing'))
const OrgOnboarding = lazy(() => import('./pages/organizer/Onboarding'))
const OrgProfile = lazyNamed(() => import('./pages/organizer/Onboarding'), 'OrganizationProfile')
const OrgDashboard = lazy(() => import('./pages/organizer/Dashboard'))
const OrgAnalytics = lazyNamed(() => import('./pages/organizer/Dashboard'), 'OrgAnalytics')
const OrgPrograms = lazy(() => import('./pages/organizer/Programs'))
const OrgProgramForm = lazyNamed(() => import('./pages/organizer/Programs'), 'OrgProgramForm')
const OrgParticipants = lazyNamed(() => import('./pages/organizer/People'), 'OrgParticipants')
const OrgTeams = lazyNamed(() => import('./pages/organizer/People'), 'OrgTeams')
const OrgMembers = lazyNamed(() => import('./pages/organizer/People'), 'OrgMembers')
const OrgEvaluators = lazyNamed(() => import('./pages/organizer/People'), 'OrgEvaluators')
const OrgSubmissions = lazyNamed(() => import('./pages/organizer/Judging'), 'OrgSubmissions')
const OrgEvaluations = lazyNamed(() => import('./pages/organizer/Judging'), 'OrgEvaluations')
const OrgRankings = lazyNamed(() => import('./pages/organizer/Judging'), 'OrgRankings')
const OrgWinners = lazyNamed(() => import('./pages/organizer/Judging'), 'OrgWinners')
const OrgCertificates = lazyNamed(() => import('./pages/organizer/Judging'), 'OrgCertificates')

// ---- admin -----------------------------------------------------------------------------------
const AccessRequests = lazy(() => import('./pages/admin/AccessRequests'))

function PageFallback() {
  return (
    <div className="grid min-h-[60svh] place-items-center">
      <Spinner className="h-7 w-7 text-acid" />
    </div>
  )
}

const auth = (el) => <ProtectedRoute>{el}</ProtectedRoute>
const eco = (key, el) => <RequireEcosystem ecosystem={key}>{el}</RequireEcosystem>
const account = (key, el) => <RequireAccount ecosystem={key}>{el}</RequireAccount>

/** Old /builder/* links keep working. */
function LegacyApplication() {
  const { id } = useParams()
  return <Navigate to={`/builders/applications/${id}`} replace />
}
/** /register?role=… → /signup?role=… */
function RegisterRedirect() {
  const { search } = useLocation()
  return <Navigate to={`/signup${search}`} replace />
}
/** /projects/:slug is the short public URL for the one project page that exists. */
function ProjectAlias() {
  const { slug } = useParams()
  return <Navigate to={`/community/${slug}`} replace />
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <ErrorBoundary>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route element={<SiteLayout />}>
              {/* ---- public, role-neutral ---- */}
              <Route path="/" element={<Home />} />
              <Route path="/builders" element={<BuilderLanding />} />
              <Route path="/founders" element={<FounderLanding />} />
              <Route path="/investors" element={<InvestorLanding />} />
              <Route path="/hr" element={<HrLanding />} />
              <Route path="/organizations" element={<OrgLanding />} />
              {/* Public proof-of-work URLs: a certificate anyone can check, and the short
                  project URL — both resolvable without an account. */}
              <Route path="/certificates/verify" element={<CertificateVerify />} />
              <Route path="/certificates/verify/:code" element={<CertificateVerify />} />
              <Route path="/projects/:slug" element={<ProjectAlias />} />
              {/* A verified organization's public profile. Static product routes
                  (/organizations/dashboard, /organizations/profile, …) outrank this dynamic
                  segment in React Router's ranking, so they keep their own pages. */}
              <Route path="/organizations/:slug" element={<OrganizationProfilePublic />} />
              {/* A published startup page. The founder's own product routes below are static and
                  outrank this segment; the API also reserves their names as handles. */}
              <Route path="/founders/:slug" element={<FounderProfilePublic />} />

              {/* ---- post-login routing ---- */}
              <Route path="/choose" element={auth(<ChoosePath />)} />
              <Route path="/go" element={auth(<PostLogin />)} />
              <Route path="/onboarding" element={<Navigate to="/choose" replace />} />

              {/* ---- shared content (login required) ---- */}
              <Route path="/opportunities" element={auth(<Opportunities />)} />
              <Route path="/opportunities/:slug" element={auth(<OpportunityDetail />)} />
              <Route path="/jobs" element={auth(<Jobs />)} />
              <Route path="/jobs/:slug" element={auth(<JobDetail />)} />
              <Route path="/resources" element={auth(<Resources />)} />
              <Route path="/resources/:slug" element={auth(<ResourceDetail />)} />
              <Route path="/courses" element={auth(<Courses />)} />
              <Route path="/courses/:slug" element={auth(<CourseDetail />)} />
              <Route path="/studhub" element={auth(<Studhub />)} />
              <Route path="/studhub/:slug" element={auth(<StudhubBenefit />)} />
              <Route path="/ott" element={auth(<Ott />)} />
              <Route path="/ott/:slug" element={auth(<OttTitle />)} />
              <Route path="/mock-drills" element={auth(<MockDrills />)} />
              <Route path="/mock-drills/:slug" element={auth(<MockDrillDetail />)} />
              <Route path="/project-briefs" element={auth(<ProjectBriefs />)} />
              <Route path="/project-briefs/:slug" element={auth(<ProjectBriefDetail />)} />
              <Route path="/search" element={auth(<Search />)} />
              <Route path="/saved" element={auth(<Saved />)} />
              <Route path="/resume-builder" element={auth(<ResumeBuilder />)} />
              <Route path="/resume-builder/new" element={auth(<ResumeEditor />)} />
              <Route path="/resume-builder/:id" element={auth(<ResumeEditor />)} />
              <Route path="/portfolio-builder" element={auth(<PortfolioBuilder />)} />
              <Route path="/account" element={auth(<Account />)} />
              <Route path="/notifications" element={auth(<Notifications />)} />
              <Route path="/community" element={auth(<Community />)} />
              <Route path="/community/:slug" element={auth(<CommunityProject />)} />
              <Route path="/community/submit" element={<RequireBuilder><ProjectForm /></RequireBuilder>} />
              <Route path="/community/mine" element={<RequireBuilder><CommunityMine /></RequireBuilder>} />
              <Route path="/community/:slug/edit" element={<RequireBuilder><ProjectForm /></RequireBuilder>} />

              {/* ---- builder product ---- */}
              <Route path="/welcome" element={eco('BUILDER', <Welcome />)} />
              <Route path="/builders/onboarding" element={account('BUILDER', <BuilderOnboarding />)} />
              <Route path="/builders/dashboard" element={eco('BUILDER', <BuilderDashboard />)} />
              <Route path="/builders/profile" element={eco('BUILDER', <Account />)} />
              <Route path="/builders/projects" element={eco('BUILDER', <CommunityMine />)} />
              <Route path="/builders/opportunities" element={eco('BUILDER', <Opportunities />)} />
              <Route path="/builders/applications" element={eco('BUILDER', <BuilderApplications />)} />
              <Route path="/builders/applications/:id" element={eco('BUILDER', <BuilderApplicationDetail />)} />
              <Route path="/builders/achievements" element={eco('BUILDER', <BuilderAchievements />)} />
              <Route path="/builders/roadmap" element={eco('BUILDER', <BuilderRoadmap />)} />
              {/* Public builder profiles share the prefix; product page names are reserved usernames.
                  Not auth-gated: the API behind it is public, and a portfolio nobody can open
                  without an account isn't a portfolio. */}
              <Route path="/builders/:username" element={<BuilderProfilePublic />} />
              <Route path="/builder" element={<Navigate to="/builders/dashboard" replace />} />
              <Route path="/builder/profile" element={<Navigate to="/builders/profile" replace />} />
              <Route path="/builder/applications" element={<Navigate to="/builders/applications" replace />} />
              <Route path="/builder/applications/:id" element={<LegacyApplication />} />

              {/* ---- founder product ---- */}
              <Route path="/founders/onboarding" element={account('FOUNDER', <FounderOnboarding />)} />
              <Route path="/founders/dashboard" element={eco('FOUNDER', <FounderDashboard />)} />
              <Route path="/founders/profile" element={eco('FOUNDER', <FounderProfilePage />)} />
              <Route path="/founders/startup" element={eco('FOUNDER', <StartupPage />)} />
              <Route path="/founders/workspace" element={eco('FOUNDER', <WorkspacePage />)} />
              <Route path="/founders/workspace/market" element={eco('FOUNDER', <WorkspaceMarket />)} />
              <Route path="/founders/workspace/competitors" element={eco('FOUNDER', <WorkspaceCompetitors />)} />
              <Route path="/founders/workspace/swot" element={eco('FOUNDER', <WorkspaceSwot />)} />
              <Route path="/founders/workspace/business-model" element={eco('FOUNDER', <WorkspaceBusinessModel />)} />
              <Route path="/founders/workspace/gtm" element={eco('FOUNDER', <WorkspaceGtm />)} />
              <Route path="/founders/workspace/pitch-deck" element={eco('FOUNDER', <WorkspacePitchDeck />)} />
              <Route path="/founders/readiness" element={eco('FOUNDER', <ReadinessPage />)} />
              <Route path="/founders/traction" element={eco('FOUNDER', <TractionPage />)} />
              <Route path="/founders/updates" element={eco('FOUNDER', <UpdatesPage />)} />
              <Route path="/founders/investors" element={eco('FOUNDER', <FounderInvestors />)} />

              {/* ---- investor product (verified access) ---- */}
              <Route path="/investors/access-request" element={account('INVESTOR', <InvestorAccessRequest />)} />
              <Route path="/investors/access-request/status" element={account('INVESTOR', <InvestorAccessStatus />)} />
              <Route path="/investors/dashboard" element={eco('INVESTOR', <InvestorDashboard />)} />
              <Route path="/investors/discover" element={eco('INVESTOR', <InvestorDiscover variant="discover" />)} />
              <Route path="/investors/founders" element={eco('INVESTOR', <InvestorDiscover variant="founders" />)} />
              <Route path="/investors/founders/:id" element={eco('INVESTOR', <FounderDetail />)} />
              <Route path="/investors/startups" element={eco('INVESTOR', <InvestorDiscover variant="startups" />)} />
              <Route path="/investors/saved" element={eco('INVESTOR', <InvestorDiscover variant="saved" />)} />
              <Route path="/investors/connections" element={eco('INVESTOR', <InvestorConnections />)} />
              <Route path="/investors/intelligence" element={eco('INVESTOR', <InvestorIntelligence />)} />
              <Route path="/investors/preferences" element={eco('INVESTOR', <InvestorPreferences />)} />

              {/* ---- HR product (verified access) ---- */}
              <Route path="/hr/verification" element={account('HR', <HrVerification />)} />
              <Route path="/hr/dashboard" element={eco('HR', <HrDashboard />)} />
              <Route path="/hr/talent" element={eco('HR', <HrTalent />)} />
              <Route path="/hr/shortlist" element={eco('HR', <HrPipeline page="shortlist" />)} />
              <Route path="/hr/invitations" element={eco('HR', <HrPipeline page="invitations" />)} />
              <Route path="/hr/interviews" element={eco('HR', <HrPipeline page="interviews" />)} />
              <Route path="/hr/offers" element={eco('HR', <HrPipeline page="offers" />)} />
              <Route path="/hr/hiring" element={eco('HR', <HrHiring />)} />
              <Route path="/hr/jobs" element={eco('HR', <HrJobs />)} />
              <Route path="/hr/jobs/new" element={eco('HR', <HrJobForm />)} />
              <Route path="/hr/jobs/:id" element={eco('HR', <HrJobForm />)} />
              <Route path="/hr/company" element={eco('HR', <HrCompany />)} />

              {/* ---- organization product (verified organizations) ---- */}
              <Route path="/organizations/onboarding" element={account('ORGANIZER', <OrgOnboarding />)} />
              <Route path="/organizations/dashboard" element={eco('ORGANIZER', <OrgDashboard />)} />
              <Route path="/organizations/profile" element={eco('ORGANIZER', <OrgProfile />)} />
              <Route path="/organizations/opportunities" element={eco('ORGANIZER', <OrgPrograms />)} />
              <Route path="/organizations/opportunities/new" element={eco('ORGANIZER', <OrgProgramForm />)} />
              <Route path="/organizations/opportunities/:id" element={eco('ORGANIZER', <OrgProgramForm />)} />
              <Route path="/organizations/hackathons" element={eco('ORGANIZER', <OrgPrograms type="HACKATHON" />)} />
              <Route path="/organizations/participants" element={eco('ORGANIZER', <OrgParticipants />)} />
              <Route path="/organizations/teams" element={eco('ORGANIZER', <OrgTeams />)} />
              <Route path="/organizations/submissions" element={eco('ORGANIZER', <OrgSubmissions />)} />
              <Route path="/organizations/evaluators" element={eco('ORGANIZER', <OrgEvaluators />)} />
              <Route path="/organizations/evaluations" element={eco('ORGANIZER', <OrgEvaluations />)} />
              <Route path="/organizations/rankings" element={eco('ORGANIZER', <OrgRankings />)} />
              <Route path="/organizations/winners" element={eco('ORGANIZER', <OrgWinners />)} />
              <Route path="/organizations/certificates" element={eco('ORGANIZER', <OrgCertificates />)} />
              <Route path="/organizations/analytics" element={eco('ORGANIZER', <OrgAnalytics />)} />
              <Route path="/organizations/members" element={eco('ORGANIZER', <OrgMembers />)} />

              {/* ---- admin ---- */}
              <Route path="/admin" element={<RequireAdmin><AccessRequests /></RequireAdmin>} />

              <Route path="*" element={<NotFound />} />
            </Route>

            {/* Full-screen flows (no nav/footer) */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/register" element={<RegisterRedirect />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  )
}
