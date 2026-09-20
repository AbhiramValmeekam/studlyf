import { Link } from 'react-router-dom'
import { candidates } from '../../data/mock/talent'
import { useSession } from '../../context/SessionContext'
import { Card, StatCard, Button, PageTitle, Avatar, Tag } from '../../components/ui/primitives'

/**
 * HR Overview — talent platform home: pipeline pulse, top-evaluated candidates,
 * and a shortcut into discovery + hiring.
 */
export default function HrOverview() {
  const { shortlist } = useSession()
  const top = [...candidates].sort((a, b) => b.topEvaluation - a.topEvaluation).slice(0, 3)

  return (
    <>
      <PageTitle eyebrow="Cygnus · Talent" title="Talent overview">
        <Button to="/hr/talent" size="sm">Discover talent ↗</Button>
      </PageTitle>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
        <StatCard label="Talent pool" value={candidates.length} sub="verified builders" accent="acid" />
        <StatCard label="Shortlisted" value={shortlist.length} accent="violet" />
        <StatCard label="Avg top eval" value={Math.round(candidates.reduce((a, c) => a + c.topEvaluation, 0) / candidates.length)} accent="acid" />
        <StatCard label="Immediate joiners" value={candidates.filter((c) => c.availability === 'Immediate').length} accent="flare" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl text-bone tracking-crush">Top-evaluated builders</h2>
            <Link to="/hr/talent" className="text-sm text-acid" data-cursor="hover">See all →</Link>
          </div>
          <div className="space-y-3">
            {top.map((c) => (
              <Link key={c.id} to={`/hr/candidate/${c.id}`} data-cursor="hover">
                <Card hover className="p-5 flex items-center gap-4">
                  <Avatar src={c.avatar} name={c.name} size={48} />
                  <div className="flex-1 min-w-0">
                    <p className="text-bone font-medium">{c.name}</p>
                    <p className="text-xs text-bone2">{c.role} · {c.location} · {c.availability}</p>
                  </div>
                  <div className="hidden sm:flex flex-wrap gap-1.5 max-w-[180px] justify-end">
                    {c.skills.slice(0, 3).map((s) => <Tag key={s}>{s}</Tag>)}
                  </div>
                  <div className="text-center"><span className="font-display text-xl text-acid">{c.topEvaluation}</span><span className="block text-[10px] text-bone2">EVAL</span></div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        <Card className="p-6">
          <h2 className="font-display text-2xl text-bone tracking-crush mb-4">Hiring funnel</h2>
          <p className="text-sm text-bone2 mb-4">Move candidates through the pipeline as you evaluate real project evidence.</p>
          <Button to="/hr/hiring" variant="ghost" size="sm" className="w-full">Open pipeline →</Button>
        </Card>
      </div>
    </>
  )
}
