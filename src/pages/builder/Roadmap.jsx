import { roadmaps } from '../../data/mock/content'
import { Card, Button, PageTitle } from '../../components/ui/primitives'
import { ProgressBar } from '../../components/ui/ProgressRing'

/**
 * Career Roadmap — a role-based learning path tied to the builder's progress.
 * Completed milestones link back to what made the profile stronger.
 */
export default function Roadmap() {
  const r = roadmaps['Full-Stack']
  return (
    <>
      <PageTitle eyebrow="Career Roadmap" title={r.role} />

      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-bone">Path progress</p>
          <span className="text-acid font-display text-xl">{r.progress}%</span>
        </div>
        <ProgressBar value={r.progress} />
      </Card>

      <div className="relative border-l-2 border-bone/12 ml-3 space-y-6">
        {r.milestones.map((m, i) => (
          <div key={m.name} className="ml-6 relative">
            <span
              className={`absolute -left-[35px] grid place-items-center h-7 w-7 rounded-full text-xs font-display ${
                m.done ? 'bg-acid text-ink' : 'bg-ink2 border border-bone/25 text-bone2'
              }`}
            >
              {m.done ? '✓' : i + 1}
            </span>
            <Card className={`p-5 ${m.done ? '' : 'opacity-90'}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl text-bone tracking-crush">{m.name}</h3>
                {m.done ? <span className="text-xs text-acid">Complete</span> : <span className="text-xs text-bone2">Up next</span>}
              </div>
              <p className="text-sm text-bone2 mt-1">{m.note}</p>
            </Card>
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-3">
        <Button to="/builder/opportunities" size="md">Find opportunities to level up ↗</Button>
        <Button to="/builder/hub" variant="ghost" size="md">Open STUD Hub</Button>
      </div>
    </>
  )
}
