import { Link } from 'react-router-dom'
import { useSession } from '../../context/SessionContext'
import { opportunities } from '../../data/mock/opportunities'
import { myProfile } from '../../data/mock/talent'
import { Card, StatCard, Badge, Button, PageTitle, EmptyState, Tag } from '../../components/ui/primitives'
import { ProgressRing } from '../../components/ui/ProgressRing'

/**
 * Builder Dashboard — the home base: profile completion, active/submitted
 * applications with status, recommendations, and an activity feed.
 */
export default function BuilderDashboard() {
  const { applications, saved } = useSession()
  const recommended = opportunities.filter((o) => o.recommended).slice(0, 3)

  const activity = [
    { t: 'Your project “DevSync” scored 92 in evaluation', when: '2d ago', tone: 'acid' },
    { t: 'LoopHacks 2026 opened applications', when: '3d ago', tone: 'violet' },
    { t: 'Recruiter from Cygnus viewed your profile', when: '5d ago', tone: 'flare' },
  ]

  return (
    <>
      <PageTitle eyebrow="Welcome back, Aarav" title="Your builder hub">
        <Button to="/builder/opportunities" size="sm">Explore opportunities ↗</Button>
      </PageTitle>

      <div className="grid lg:grid-cols-4 gap-4 md:gap-6">
        {/* profile completion */}
        <Card className="p-6 flex items-center gap-5 lg:col-span-1">
          <ProgressRing value={myProfile.completion} label="COMPLETE" />
          <div>
            <p className="text-sm text-bone">Profile strength</p>
            <p className="text-xs text-bone2 mt-1">{myProfile.missing.length} steps to a stronger profile</p>
            <Link to="/builder/profile" className="text-xs text-acid mt-2 inline-block" data-cursor="hover">Improve →</Link>
          </div>
        </Card>

        <StatCard label="Applications" value={applications.length} sub="active + submitted" accent="acid" />
        <StatCard label="Saved" value={saved.length} sub="opportunities" accent="violet" />
        <StatCard label="Top Evaluation" value={myProfile.topEvaluation} sub="DevSync" accent="flare" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 md:gap-6 mt-6">
        {/* applications */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-display text-2xl text-bone tracking-crush">Your applications</h2>
          {applications.length === 0 ? (
            <EmptyState
              title="No applications yet"
              sub="Apply to a hackathon, internship or fellowship — your submissions and statuses will track here."
              action={<Button to="/builder/opportunities" size="sm">Browse opportunities</Button>}
            />
          ) : (
            applications.map((a) => (
              <Card key={a.id} hover className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-bone font-medium">{a.oppTitle}</p>
                  <p className="text-xs text-bone2 mt-1">{a.org} · Submission #{a.id}</p>
                </div>
                <div className="flex items-center gap-4">
                  <Badge>{a.status}</Badge>
                  <Link to={`/builder/submission/${a.id}`} className="text-sm text-acid" data-cursor="hover">View →</Link>
                </div>
              </Card>
            ))
          )}

          {/* completion prompts */}
          <Card className="p-5">
            <p className="text-sm text-bone font-medium mb-3">Complete your profile</p>
            <ul className="space-y-2">
              {myProfile.missing.map((m) => (
                <li key={m} className="flex items-center gap-3 text-sm text-bone2">
                  <span className="h-4 w-4 rounded-full border border-bone/30" />
                  {m}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* recommendations + activity */}
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-2xl text-bone tracking-crush mb-4">Recommended</h2>
            <div className="space-y-3">
              {recommended.map((o) => (
                <Link key={o.id} to={`/builder/opportunities/${o.id}`} data-cursor="hover">
                  <Card hover className="p-4">
                    <div className="flex items-center justify-between">
                      <Tag tone="acid">{o.type}</Tag>
                      <span className="text-[11px] text-bone2">{o.prize}</span>
                    </div>
                    <p className="text-sm text-bone mt-2 leading-snug">{o.title}</p>
                    <p className="text-xs text-bone2 mt-1">{o.org}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-display text-2xl text-bone tracking-crush mb-4">Activity</h2>
            <div className="space-y-3">
              {activity.map((a) => (
                <div key={a.t} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full shrink-0" style={{ background: `var(--${a.tone})` }} />
                  <div>
                    <p className="text-sm text-bone2 leading-snug">{a.t}</p>
                    <p className="text-[11px] text-bone2/60 mt-0.5">{a.when}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
