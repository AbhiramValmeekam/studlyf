import { Link } from 'react-router-dom'
import { getCandidate } from '../../data/mock/talent'
import { useSession } from '../../context/SessionContext'
import { Card, Button, Avatar, PageTitle, EmptyState } from '../../components/ui/primitives'

/**
 * HR Hiring Pipeline — the full workflow as a stage board:
 * Shortlisted → Invited → Accepted → Interview → Selected → Offer → Joining →
 * Hired. Advance/rewind a candidate's stage with mock actions.
 */
const STAGES = [
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'invited', label: 'Invited' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'interview', label: 'Interview' },
  { key: 'selected', label: 'Selected' },
  { key: 'offer', label: 'Offer Letter' },
  { key: 'joining', label: 'Joining Letter' },
  { key: 'hired', label: 'Hired' },
]
const KEYS = STAGES.map((s) => s.key)

export default function HrHiring() {
  const { shortlist, pipeline, setStage } = useSession()

  if (shortlist.length === 0)
    return (
      <>
        <PageTitle eyebrow="Hiring Pipeline" title="Your pipeline" />
        <EmptyState
          title="No candidates in the pipeline"
          sub="Shortlist builders from Talent Discovery — they'll appear here to move through the hiring workflow."
          action={<Button to="/hr/talent" size="sm">Discover talent</Button>}
        />
      </>
    )

  const advance = (id, dir) => {
    const cur = KEYS.indexOf(pipeline[id] || 'shortlisted')
    const nextIdx = Math.min(KEYS.length - 1, Math.max(0, cur + dir))
    setStage(id, KEYS[nextIdx])
  }

  return (
    <>
      <PageTitle eyebrow="Hiring Pipeline" title="Your pipeline">
        <Button to="/hr/talent" variant="ghost" size="sm">+ Add from discovery</Button>
      </PageTitle>

      {/* horizontal stage board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const inStage = shortlist.filter((id) => (pipeline[id] || 'shortlisted') === stage.key)
          return (
            <div key={stage.key} className="w-64 shrink-0">
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-xs uppercase tracking-widest text-bone2">{stage.label}</p>
                <span className="text-xs text-bone2/60">{inStage.length}</span>
              </div>
              <div className="space-y-3 min-h-[80px]">
                {inStage.map((id) => {
                  const c = getCandidate(id)
                  if (!c) return null
                  return (
                    <Card key={id} className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={c.avatar} name={c.name} size={38} />
                        <div className="min-w-0">
                          <Link to={`/hr/candidate/${c.id}`} className="text-sm text-bone hover:text-acid transition-colors block truncate" data-cursor="hover">{c.name}</Link>
                          <p className="text-[11px] text-bone2 truncate">{c.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <button onClick={() => advance(id, -1)} data-cursor="hover" className="text-bone2 hover:text-bone text-lg leading-none disabled:opacity-30" disabled={stage.key === 'shortlisted'}>‹</button>
                        <span className="text-[10px] text-acid">{c.topEvaluation} eval</span>
                        <button onClick={() => advance(id, 1)} data-cursor="hover" className="text-bone2 hover:text-acid text-lg leading-none disabled:opacity-30" disabled={stage.key === 'hired'}>›</button>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-bone2/60 mt-2">Use ‹ › to move a candidate through the workflow. Offer & joining letters are mocked for the prototype.</p>
    </>
  )
}
