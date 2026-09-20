import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getEvent, eventDetail, STAGES } from '../../data/mock/events'
import { Card, Tag, Badge, Button, PageTitle } from '../../components/ui/primitives'

/**
 * EventManage — staged management of one event:
 * Registration → Participants → Teams → Submissions → Jury Evaluation →
 * Ranking → Results. Tabs switch the active stage.
 */
export default function EventManage() {
  const { id } = useParams()
  const e = getEvent(id)
  const [stage, setStage] = useState('Participants')

  return (
    <>
      <Link to="/organizer" className="text-sm text-bone2 hover:text-bone transition-colors" data-cursor="hover">← All events</Link>
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <Tag tone="flare">{e.type}</Tag><Badge>{e.status}</Badge>
      </div>
      <PageTitle eyebrow={e.dates} title={e.name} />

      {/* stage tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-bone/10 mb-6">
        {STAGES.map((s) => (
          <button
            key={s}
            onClick={() => setStage(s)}
            data-cursor="hover"
            className={`px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
              stage === s ? 'border-flare text-bone' : 'border-transparent text-bone2 hover:text-bone'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {stage === 'Registration' && <Registration e={e} />}
      {stage === 'Participants' && <Participants />}
      {stage === 'Teams' && <Teams />}
      {stage === 'Submissions' && <Submissions />}
      {stage === 'Jury Evaluation' && <Jury />}
      {stage === 'Ranking' && <Ranking />}
      {stage === 'Results' && <Results />}
    </>
  )
}

function Registration({ e }) {
  return (
    <div className="grid sm:grid-cols-3 gap-4">
      <Card className="p-6"><p className="eyebrow text-bone2">Registered</p><p className="font-display text-5xl text-flare mt-2">{e.registrations}</p></Card>
      <Card className="p-6"><p className="eyebrow text-bone2">Capacity</p><p className="font-display text-5xl text-bone mt-2">500</p></Card>
      <Card className="p-6"><p className="eyebrow text-bone2">Fill rate</p><p className="font-display text-5xl text-acid mt-2">{Math.round((e.registrations / 500) * 100)}%</p></Card>
    </div>
  )
}

function Table({ head, rows }) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-bone2 text-xs border-b border-bone/10">
            {head.map((h) => <th key={h} className="py-3 px-5">{h}</th>)}
          </tr></thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    </Card>
  )
}

function Participants() {
  return (
    <Table head={['Name', 'College', 'Team', 'Status']} rows={eventDetail.participants.map((p) => (
      <tr key={p.id} className="border-b border-bone/5 text-bone2">
        <td className="py-3 px-5 text-bone">{p.name}</td>
        <td className="py-3 px-5">{p.college}</td>
        <td className="py-3 px-5">{p.team}</td>
        <td className="py-3 px-5"><Badge>{p.status}</Badge></td>
      </tr>
    ))} />
  )
}

function Teams() {
  return (
    <Table head={['Team', 'Members', 'Project', 'Status']} rows={eventDetail.teams.map((t) => (
      <tr key={t.id} className="border-b border-bone/5 text-bone2">
        <td className="py-3 px-5 text-bone">{t.name}</td>
        <td className="py-3 px-5">{t.members}</td>
        <td className="py-3 px-5">{t.project}</td>
        <td className="py-3 px-5"><Badge>{t.status}</Badge></td>
      </tr>
    ))} />
  )
}

function Submissions() {
  return (
    <Table head={['Team', 'Repository', 'Demo', 'Score']} rows={eventDetail.submissions.map((s) => (
      <tr key={s.id} className="border-b border-bone/5 text-bone2">
        <td className="py-3 px-5 text-bone">{s.team}</td>
        <td className="py-3 px-5"><a href="#" className="text-acid" data-cursor="hover">↗ {s.repo}</a></td>
        <td className="py-3 px-5"><a href="#" className="text-acid" data-cursor="hover">↗ demo</a></td>
        <td className="py-3 px-5 font-display text-acid">{s.score}</td>
      </tr>
    ))} />
  )
}

function Jury() {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Card className="p-6">
        <h3 className="font-display text-xl text-bone tracking-crush mb-4">Evaluation criteria</h3>
        <div className="space-y-3">
          {eventDetail.jury.map((j) => (
            <div key={j.criterion} className="flex items-center justify-between">
              <span className="text-sm text-bone2">{j.criterion}</span>
              <span className="text-sm text-acid font-display">{j.weight}%</span>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-6 flex flex-col justify-center">
        <p className="text-bone2 text-sm">4 jurors assigned. 3 of 4 submissions scored.</p>
        <Button size="sm" variant="flare" className="mt-4 w-fit" onClick={() => alert('Prototype: scoring sheet.')}>Open scoring sheet ↗</Button>
      </Card>
    </div>
  )
}

function Ranking() {
  return (
    <div className="space-y-3">
      {eventDetail.ranking.map((r) => (
        <Card key={r.rank} className="p-5 flex items-center gap-4">
          <span className={`font-display text-3xl ${r.rank === 1 ? 'text-acid' : r.rank === 2 ? 'text-bone' : 'text-flare'}`}>#{r.rank}</span>
          <p className="flex-1 text-bone font-medium">{r.team}</p>
          <span className="font-display text-2xl text-bone">{r.score}</span>
        </Card>
      ))}
    </div>
  )
}

function Results() {
  const winner = eventDetail.ranking[0]
  return (
    <Card className="p-10 text-center">
      <p className="eyebrow text-acid">Winner</p>
      <h2 className="font-display d-2 text-bone tracking-crush mt-2">{winner.team}</h2>
      <p className="text-bone2 mt-2">Score {winner.score}/100 · results published to all participants.</p>
      <Button size="md" className="mt-6" onClick={() => alert('Prototype: results published + certificates issued.')}>Publish results ↗</Button>
    </Card>
  )
}
