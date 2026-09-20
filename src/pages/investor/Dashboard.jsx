import { Link } from 'react-router-dom'
import { startups } from '../../data/mock/startups'
import { useSession } from '../../context/SessionContext'
import { Card, StatCard, Tag, Button, PageTitle } from '../../components/ui/primitives'

/**
 * Investor Dashboard — portfolio pulse: deal flow snapshot, connections, and a
 * shortcut into founder discovery + analytics.
 */
export default function InvestorDashboard() {
  const { connections } = useSession()
  const featured = [...startups].sort((a, b) => b.readiness - a.readiness).slice(0, 3)

  return (
    <>
      <PageTitle eyebrow="Northstar Capital" title="Deal flow overview">
        <Button to="/investor/discover" size="sm">Discover founders ↗</Button>
      </PageTitle>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
        <StatCard label="In pipeline" value={startups.length} sub="matching thesis" accent="acid" />
        <StatCard label="Connected" value={connections.length} sub="founders" accent="violet" />
        <StatCard label="Avg readiness" value={Math.round(startups.reduce((a, s) => a + s.readiness, 0) / startups.length)} accent="acid" />
        <StatCard label="Series A ready" value={startups.filter((s) => s.readiness > 85).length} accent="flare" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl text-bone tracking-crush">Top matches</h2>
            <Link to="/investor/discover" className="text-sm text-acid" data-cursor="hover">See all →</Link>
          </div>
          <div className="space-y-3">
            {featured.map((s) => (
              <Link key={s.id} to={`/investor/founder/${s.id}`} data-cursor="hover">
                <Card hover className="p-5 flex items-center gap-4">
                  <img src={s.logo} alt={s.name} className="h-11 w-11 rounded-lg bg-white object-contain p-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-bone font-medium">{s.name}</p>
                    <p className="text-xs text-bone2">{s.industry} · {s.stage} · {s.location}</p>
                  </div>
                  <div className="hidden sm:block text-right"><p className="text-sm text-bone">{s.metrics[0].value}</p><p className="text-[11px] text-bone2">{s.metrics[0].label}</p></div>
                  <div className="text-center"><span className="font-display text-xl text-acid">{s.readiness}</span><span className="block text-[10px] text-bone2">READY</span></div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        <Card className="p-6">
          <h2 className="font-display text-2xl text-bone tracking-crush mb-4">Your thesis</h2>
          <div className="space-y-3 text-sm text-bone2">
            <div className="flex justify-between"><span>Stages</span><span className="text-bone">Seed – Series A</span></div>
            <div className="flex justify-between"><span>Sectors</span><span className="text-bone">B2B SaaS, AI</span></div>
            <div className="flex justify-between"><span>Check size</span><span className="text-bone">₹4–12Cr</span></div>
            <div className="flex justify-between"><span>Geography</span><span className="text-bone">India</span></div>
          </div>
          <Button to="/investor/analytics" variant="ghost" size="sm" className="w-full mt-6">View analytics →</Button>
        </Card>
      </div>
    </>
  )
}
