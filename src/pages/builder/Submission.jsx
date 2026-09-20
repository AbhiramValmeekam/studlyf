import { useParams, Link } from 'react-router-dom'
import { useSession } from '../../context/SessionContext'
import { Card, Button, Badge, EmptyState } from '../../components/ui/primitives'

/**
 * Submission — confirmation screen after applying. Shows the generated
 * submission ID, current status, and the next-steps timeline.
 */
export default function Submission() {
  const { id } = useParams()
  const { applications } = useSession()
  const app = applications.find((a) => a.id === id)

  if (!app)
    return (
      <EmptyState
        title="No submission here"
        sub="This submission isn't in your session (state resets on refresh in the prototype)."
        action={<Button to="/builder/opportunities" size="sm">Browse opportunities</Button>}
      />
    )

  const steps = [
    { label: 'Submitted', done: true },
    { label: 'Under review', done: true, active: true },
    { label: 'Shortlist decision', done: false },
    { label: 'Results announced', done: false },
  ]

  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className="grid place-items-center h-20 w-20 rounded-full bg-acid/15 text-acid text-3xl mx-auto mb-6">✓</div>
      <h1 className="font-display d-2 text-bone tracking-crush">Application submitted</h1>
      <p className="text-bone2 mt-3">Your application to <span className="text-bone">{app.oppTitle}</span> is in.</p>

      <Card className="p-6 mt-8 text-left">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-bone2">Submission ID</p>
            <p className="font-display text-2xl text-bone tracking-crush">#{app.id}</p>
          </div>
          <Badge>{app.status}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-bone/10 text-sm">
          <div><p className="text-bone2 text-xs">Team</p><p className="text-bone">{app.team}</p></div>
          <div><p className="text-bone2 text-xs">Project</p><p className="text-bone">{app.project}</p></div>
        </div>
      </Card>

      <Card className="p-6 mt-6 text-left">
        <h2 className="font-display text-xl text-bone tracking-crush mb-4">Next steps</h2>
        <ol className="relative border-l border-bone/15 ml-2 space-y-5">
          {steps.map((s) => (
            <li key={s.label} className="ml-5">
              <span className={`absolute -left-[7px] h-3 w-3 rounded-full ${s.done ? 'bg-acid' : 'bg-bone/25'}`} />
              <p className={`text-sm ${s.active ? 'text-acid' : s.done ? 'text-bone' : 'text-bone2'}`}>{s.label}</p>
            </li>
          ))}
        </ol>
      </Card>

      <div className="flex justify-center gap-3 mt-8">
        <Button to="/builder" variant="ghost" size="md">Go to dashboard</Button>
        <Button to="/builder/opportunities" size="md">Explore more ↗</Button>
      </div>
    </div>
  )
}
