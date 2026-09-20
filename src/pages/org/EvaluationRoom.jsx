import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getEvent, eventDetail } from '../../data/mock/events'
import { Card, Tag, Badge, Button, PageTitle } from '../../components/ui/primitives'
import { ProgressBar } from '../../components/ui/ProgressRing'

/**
 * Org EvaluationRoom — the jury scoring interface. Juries score each submission
 * across the event's criteria. Scores are shown live per team. This is the
 * core "Unstop-style" evaluation surface of the Organisation platform.
 */

// Mock per-submission breakdown scores for each criterion
const MOCK_SCORES = {
  DevSync:  { Innovation: 22, 'Technical execution': 28, 'Design & UX': 17, Impact: 24 },
  Recall:   { Innovation: 24, 'Technical execution': 29, 'Design & UX': 20, Impact: 22 },
  Cadence:  { Innovation: 20, 'Technical execution': 26, 'Design & UX': 18, Impact: 25 },
  Pulse:    { Innovation: 19, 'Technical execution': 25, 'Design & UX': 17, Impact: 21 },
  Gustav:   { Innovation: null, 'Technical execution': null, 'Design & UX': null, Impact: null },
}

const STATUS_COLORS = {
  Submitted: 'acid',
  'In progress': 'flare',
}

export default function OrgEvaluationRoom() {
  const { id } = useParams()
  const e = getEvent(id)

  // Which submission is expanded for detailed jury scoring
  const [active, setActive] = useState(eventDetail.submissions[0]?.team ?? null)

  const activeSubmission = eventDetail.submissions.find((s) => s.team === active)
  const activeScores = active ? MOCK_SCORES[active] : null
  const criteriaTotal = activeScores
    ? Object.values(activeScores).reduce((sum, v) => sum + (v ?? 0), 0)
    : 0

  return (
    <>
      <Link
        to={`/org/events/${id}`}
        className="text-sm text-bone2 hover:text-bone transition-colors"
        data-cursor="hover"
      >
        ← Back to event
      </Link>

      <PageTitle eyebrow={`${e.name} · Jury Room`} title="Evaluate submissions">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => alert('Prototype: export scores as CSV.')}
        >
          Export scores ↓
        </Button>
      </PageTitle>

      {/* Criteria legend */}
      <Card className="p-5 mb-6">
        <p className="text-xs uppercase tracking-widest text-bone2 mb-3">Scoring criteria</p>
        <div className="flex flex-wrap gap-6">
          {eventDetail.jury.map((j) => (
            <div key={j.criterion} className="flex items-center gap-2">
              <span className="text-sm text-bone">{j.criterion}</span>
              <span className="text-xs text-acid font-display">{j.weight}%</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left — submission list */}
        <div className="lg:col-span-1 space-y-3">
          <p className="text-xs uppercase tracking-widest text-bone2 mb-1">Submissions</p>
          {/* Scored teams */}
          {eventDetail.submissions.map((s) => {
            const scores = MOCK_SCORES[s.team]
            const scored = scores && Object.values(scores).some((v) => v !== null)
            const total = scored
              ? Object.values(scores).reduce((sum, v) => sum + (v ?? 0), 0)
              : null
            return (
              <button
                key={s.team}
                onClick={() => setActive(s.team)}
                data-cursor="hover"
                className={`w-full text-left rounded-xl p-4 border transition-colors ${
                  active === s.team
                    ? 'border-flare bg-flare/5'
                    : 'border-bone/10 hover:border-bone/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-bone font-medium">{s.team}</p>
                  {total !== null ? (
                    <span className="font-display text-xl text-acid">{total}</span>
                  ) : (
                    <span className="text-xs text-bone2/60">Pending</span>
                  )}
                </div>
                <div className="flex gap-3 mt-1 text-[11px] text-bone2">
                  <a href="#" className="hover:text-acid" onClick={(ev) => ev.stopPropagation()} data-cursor="hover">
                    ↗ Repo
                  </a>
                  <a href="#" className="hover:text-acid" onClick={(ev) => ev.stopPropagation()} data-cursor="hover">
                    ↗ Demo
                  </a>
                </div>
              </button>
            )
          })}

          {/* Unscored teams from teams list */}
          {eventDetail.teams
            .filter((t) => !eventDetail.submissions.find((s) => s.team === t.name))
            .map((t) => (
              <div key={t.id} className="rounded-xl p-4 border border-bone/5 opacity-50">
                <p className="text-bone2 text-sm">{t.name}</p>
                <p className="text-[11px] text-bone2/60 mt-0.5">{t.status}</p>
              </div>
            ))}
        </div>

        {/* Right — detailed scoring panel */}
        <div className="lg:col-span-2">
          {activeSubmission ? (
            <Card className="p-6">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="font-display text-2xl text-bone tracking-crush">
                    {activeSubmission.team}
                  </h2>
                  <div className="flex gap-3 mt-2 text-sm">
                    <a href="#" className="text-acid hover:underline" data-cursor="hover">↗ {activeSubmission.repo}</a>
                    <a href="#" className="text-acid hover:underline" data-cursor="hover">↗ Live demo</a>
                  </div>
                </div>
                <div className="text-center shrink-0">
                  <span className="font-display text-4xl text-acid leading-none">{criteriaTotal}</span>
                  <span className="block text-[10px] text-bone2 mt-1">TOTAL SCORE</span>
                </div>
              </div>

              {/* Per-criterion scores */}
              <div className="space-y-5">
                {eventDetail.jury.map((j) => {
                  const val = activeScores?.[j.criterion]
                  const pct = val != null ? Math.round((val / j.weight) * 100) : 0
                  return (
                    <div key={j.criterion}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-bone2">{j.criterion}</span>
                        <span className="font-display text-bone">
                          {val != null ? `${val} / ${j.weight}` : '— / ' + j.weight}
                        </span>
                      </div>
                      <ProgressBar value={pct} />
                    </div>
                  )
                })}
              </div>

              <div className="mt-6 pt-5 border-t border-bone/10 flex items-center gap-3">
                <Button
                  size="sm"
                  variant="flare"
                  onClick={() => alert('Prototype: open jury scoring sheet for ' + activeSubmission.team)}
                >
                  Edit scores ↗
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => alert('Prototype: jury notes for ' + activeSubmission.team)}
                >
                  Add jury note
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-10 text-center">
              <p className="text-bone2">Select a submission to view its scores.</p>
            </Card>
          )}

          {/* Juror status */}
          <Card className="p-5 mt-4">
            <p className="text-xs uppercase tracking-widest text-bone2 mb-3">Jurors assigned</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { name: 'Ravi Shankar', org: 'Google', done: true },
                { name: 'Deepa Menon', org: 'Microsoft', done: true },
                { name: 'Arjun Nair', org: 'Flipkart', done: true },
                { name: 'Sunitha Rao', org: 'Adobe', done: false },
              ].map((j) => (
                <div key={j.name} className="flex items-center gap-3">
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${j.done ? 'bg-acid' : 'bg-bone/20'}`}
                  />
                  <div>
                    <p className="text-sm text-bone">{j.name}</p>
                    <p className="text-[11px] text-bone2">{j.org} · {j.done ? 'Scoring done' : 'Pending'}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
