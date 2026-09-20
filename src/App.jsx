import { Routes, Route, Navigate } from 'react-router-dom'

import Cursor from './components/Cursor'
import AppShell from './components/app/AppShell'
import { ProtectedRoute } from './components/app/ProtectedRoute'

import HomePage from './pages/HomePage'
import LoginHub from './pages/LoginHub'
import PortalLogin from './pages/PortalLogin'

// Builder
import BuilderDashboard from './pages/builder/Dashboard'
import BuilderProfile from './pages/builder/Profile'
import Opportunities from './pages/builder/Opportunities'
import OpportunityDetail from './pages/builder/OpportunityDetail'
import ApplyWizard from './pages/builder/ApplyWizard'
import Submission from './pages/builder/Submission'
import StudHub from './pages/builder/StudHub'
import StudOtt from './pages/builder/StudOtt'
import ResumeBuilder from './pages/builder/ResumeBuilder'
import PortfolioBuilder from './pages/builder/PortfolioBuilder'
import Roadmap from './pages/builder/Roadmap'

// Startup / Founder
import FounderWorkspace from './pages/startup/Workspace'
import FounderProfile from './pages/startup/FounderProfile'
import StartupProfile from './pages/startup/StartupProfile'
import WorkspaceTool from './pages/startup/WorkspaceTool'
import FounderInvestors from './pages/startup/InvestorDiscovery'

// Investor
import InvestorDashboard from './pages/investor/Dashboard'
import InvestorDiscover from './pages/investor/Discover'
import InvestorFounder from './pages/investor/FounderProfile'
import InvestorAnalytics from './pages/investor/Analytics'

// HR
import HrOverview from './pages/hr/Overview'
import HrTalent from './pages/hr/Talent'
import HrCandidate from './pages/hr/Candidate'
import HrHiring from './pages/hr/Hiring'

// Organisation — evaluation platform
import OrgDashboard from './pages/org/Dashboard'
import OrgEvents from './pages/org/Events'
import OrgEventManage from './pages/org/EventManage'
import OrgEvaluationRoom from './pages/org/EvaluationRoom'
import OrgLeaderboard from './pages/org/Leaderboard'

export default function App() {
  return (
    <>
      <div className="grain" aria-hidden />
      <Cursor />

      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginHub />} />
        <Route path="/investor/login" element={<PortalLogin portal="investor" />} />
        <Route path="/hr/login" element={<PortalLogin portal="hr" />} />
        <Route path="/org/login" element={<PortalLogin portal="org" />} />

        {/* Builder */}
        <Route element={<AppShell role="builder" />}>
          <Route path="/builder" element={<BuilderDashboard />} />
          <Route path="/builder/profile" element={<BuilderProfile />} />
          <Route path="/builder/opportunities" element={<Opportunities />} />
          <Route path="/builder/opportunities/:id" element={<OpportunityDetail />} />
          <Route path="/builder/opportunities/:id/apply" element={<ApplyWizard />} />
          <Route path="/builder/submission/:id" element={<Submission />} />
          <Route path="/builder/hub" element={<StudHub />} />
          <Route path="/builder/ott" element={<StudOtt />} />
          <Route path="/builder/resume" element={<ResumeBuilder />} />
          <Route path="/builder/portfolio" element={<PortfolioBuilder />} />
          <Route path="/builder/roadmap" element={<Roadmap />} />
        </Route>

        {/* Startup / Founder */}
        <Route element={<AppShell role="founder" />}>
          <Route path="/startup" element={<FounderWorkspace />} />
          <Route path="/startup/founder-profile" element={<FounderProfile />} />
          <Route path="/startup/profile" element={<StartupProfile />} />
          <Route path="/startup/workspace/:tool" element={<WorkspaceTool />} />
          <Route path="/startup/investors" element={<FounderInvestors />} />
        </Route>

        {/* Investor — gated */}
        <Route element={<ProtectedRoute loginPath="/investor/login" />}>
          <Route element={<AppShell role="investor" />}>
            <Route path="/investor" element={<InvestorDashboard />} />
            <Route path="/investor/discover" element={<InvestorDiscover />} />
            <Route path="/investor/founder/:id" element={<InvestorFounder />} />
            <Route path="/investor/analytics" element={<InvestorAnalytics />} />
          </Route>
        </Route>

        {/* HR — gated: talent discovery + hiring pipeline */}
        <Route element={<ProtectedRoute loginPath="/hr/login" />}>
          <Route element={<AppShell role="hr" />}>
            <Route path="/hr" element={<HrOverview />} />
            <Route path="/hr/talent" element={<HrTalent />} />
            <Route path="/hr/candidate/:id" element={<HrCandidate />} />
            <Route path="/hr/hiring" element={<HrHiring />} />
          </Route>
        </Route>

        {/* Organisation — gated: evaluation platform (hackathons, jury scoring, leaderboards) */}
        <Route element={<ProtectedRoute loginPath="/org/login" />}>
          <Route element={<AppShell role="org" />}>
            <Route path="/org" element={<OrgDashboard />} />
            <Route path="/org/events" element={<OrgEvents />} />
            <Route path="/org/events/:id" element={<OrgEventManage />} />
            <Route path="/org/evaluate/:id" element={<OrgEvaluationRoom />} />
            <Route path="/org/leaderboard" element={<OrgLeaderboard />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
