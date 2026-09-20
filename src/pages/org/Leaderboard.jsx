import { useState } from 'react'
import { Link } from 'react-router-dom'
import { events, eventDetail } from '../../data/mock/events'
import { Card, Tag, Badge, Button, PageTitle } from '../../components/ui/primitives'

/**
 * Org Leaderboard — cross-event rankings. Select an event to view the final
 * leaderboard. When results are published, participants can view them publicly.
 * Juries and org admins see the full breakdown here.
 */

// Extended mock leaderboard with per-criterion breakdown
const DETAILED_RANKING = [
  {
    rank: 1, team: 'Recall', score: 95, members: 2,
    breakdown: { Innovation: 24, 'Technical execution': 29, 'Design & UX': 20, Impact: 22 },
    repo: 'github.com/saraq/recall', college: 'BITS Pilani',
  },
  {
    rank: 2, team: 'DevSync', score: 92, members: 3,
    breakdown: { Innovation: 22, 'Technical execution': 28, 'Design & UX': 17, Impact: 24 },
    repo: 'github.com/aaravbuilds/devsync', college: 'IIT Hyderabad',
  },
  {
    rank: 3, team: 'Cadence', score: 89, members: 1,
    breakdown: { Innovation: 20, 'Technical execution': 26, 'Design & UX': 18, Impact: 25 },
    repo: 'github.com/devp/cadence', college: 'MITID',
  },
  {
    rank: 4, team: 'Pulse', score: 86, members: 2,
    breakdown: { Innovation: 19, 'Technical execution': 25, 'Design & UX': 17, Impact: 21 },
    repo: 'github.com/ananyas/pulse', college: 'St. Xavier\'s',
  },
]

const CRITERIA = ['Innovation', 'Technical execution', 'Design & UX', 'Impact']

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default function OrgLeaderboard() {
  const [activeEvent, setActiveEvent] = useState(events[0].id)
  const event = events.find((e) => e.id === activeEvent) || events[0]

  // Only the first event has full mock data
  const hasResults = activeEvent === 'hack-loop-2026' || activeEvent === 'ml-cup-2026'

  return (
    <>
      <PageTitle eyebrow="Organisation · Results" title="Leaderboard">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => alert('Prototype: export leaderboard as PDF/CSV.')}
        >
          Export ↓
        </Button>
      </PageTitle>

      {/* Event selector */}
      <div className="flex gap-2 flex-wrap mb-6">
        {events.map((e) => (
          <button
            key={e.id}
            onClick={() => setActiveEvent(e.id)}
            data-cursor="hover"
            className={`rounded-full px-4 py-1.5 text-sm border transition-colors ${
              activeEvent === e.id
                ? 'bg-flare text-ink border-flare'
                : 'text-bone2 border-bone/20 hover:border-bone/50'
            }`}
          >
            {e.name}
          </button>
        ))}
      </div>

      {/* Event meta */}
      <Card className="p-5 mb-6 flex flex-wrap gap-6 items-center">
        <div>
          <p className="eyebrow text-bone2">Event</p>
          <p className="text-bone font-medium mt-0.5">{event.name}</p>
        </div>
        <div>
          <p className="eyebrow text-bone2">Dates</p>
          <p className="text-bone mt-0.5">{event.dates}</p>
        </div>
        <div>
          <p className="eyebrow text-bone2">Teams</p>
          <p className="font-display text-xl text-bone mt-0.5">{event.teams}</p>
        </div>
        <div>
          <p className="eyebrow text-bone2">Submissions</p>
          <p className="font-display text-xl text-bone mt-0.5">{event.submissions}</p>
        </div>
        <div>
          <p className="eyebrow text-bone2">Prize pool</p>
          <p className="font-display text-xl text-acid mt-0.5">{event.prize}</p>
        </div>
        <div className="ml-auto">
          <Badge>{event.status}</Badge>
        </div>
      </Card>

      {hasResults ? (
        <>
          {/* Podium — top 3 */}
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            {DETAILED_RANKING.slice(0, 3).map((r) => (
              <Card
                key={r.rank}
                className={`p-6 text-center ${r.rank === 1 ? 'border border-acid/30 bg-acid/4' : ''}`}
              >
                <p className="text-3xl mb-2">{MEDAL[r.rank] || `#${r.rank}`}</p>
                <h3 className="font-display text-xl text-bone tracking-crush">{r.team}</h3>
                <p className="text-bone2 text-xs mt-1">{r.college} · {r.members} member{r.members !== 1 ? 's' : ''}</p>
                <p className="font-display text-4xl text-acid mt-3 leading-none">{r.score}</p>
                <p className="text-[10px] text-bone2 mt-1">TOTAL SCORE</p>
              </Card>
            ))}
          </div>

          {/* Full table */}
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-bone2 text-xs border-b border-bone/10">
                    <th className="py-3 px-5">Rank</th>
                    <th className="py-3 px-5">Team</th>
                    <th className="py-3 px-5">College</th>
                    {CRITERIA.map((c) => (
                      <th key={c} className="py-3 px-5 hidden md:table-cell">{c}</th>
                    ))}
                    <th className="py-3 px-5">Total</th>
                    <th className="py-3 px-5"></th>
                  </tr>
                </thead>
                <tbody>
                  {DETAILED_RANKING.map((r) => (
                    <tr key={r.rank} className="border-b border-bone/5 text-bone2 hover:bg-bone/2 transition-colors">
                      <td className="py-3 px-5">
                        <span className={`font-display text-lg ${r.rank <= 3 ? 'text-acid' : 'text-bone'}`}>
                          {MEDAL[r.rank] || `#${r.rank}`}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-bone font-medium">{r.team}</td>
                      <td className="py-3 px-5">{r.college}</td>
                      {CRITERIA.map((c) => (
                        <td key={c} className="py-3 px-5 hidden md:table-cell font-display text-bone">
                          {r.breakdown[c]}
                        </td>
                      ))}
                      <td className="py-3 px-5 font-display text-xl text-acid">{r.score}</td>
                      <td className="py-3 px-5">
                        <a href="#" className="text-xs text-acid hover:underline" data-cursor="hover">↗ Repo</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="mt-4 flex gap-3">
            <Button
              size="sm"
              onClick={() => alert('Prototype: certificates issued to all participants.')}
            >
              Issue certificates ↗
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => alert('Prototype: results published publicly.')}
            >
              Publish results
            </Button>
          </div>
        </>
      ) : (
        <Card className="p-12 text-center">
          <p className="font-display text-2xl text-bone tracking-crush">Results pending</p>
          <p className="text-bone2 mt-2 text-sm">
            This event hasn't been evaluated yet. Open the{' '}
            <Link to={`/org/evaluate/${activeEvent}`} className="text-acid hover:underline" data-cursor="hover">
              jury room
            </Link>{' '}
            to score submissions.
          </p>
        </Card>
      )}
    </>
  )
}
