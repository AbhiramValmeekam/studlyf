import { Link } from 'react-router-dom'
import { events } from '../../data/mock/events'
import { Card, StatCard, Badge, Button, PageTitle, Tag } from '../../components/ui/primitives'

/**
 * Organisation Dashboard — overview of all events run by the organisation.
 * Entry point to the evaluation platform: create events, track live submissions,
 * jump into jury rooms.
 */
export default function OrgDashboard() {
  const totals = events.reduce(
    (a, e) => ({ reg: a.reg + e.registrations, sub: a.sub + e.submissions }),
    { reg: 0, sub: 0 }
  )
  const live = events.filter((e) => e.status === 'Live')

  return (
    <>
      <PageTitle eyebrow="TechOrg India · Evaluation Platform" title="Your events">
        <Button size="sm" onClick={() => alert('Prototype: event creation is mocked.')}>
          + Create event
        </Button>
      </PageTitle>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
        <StatCard label="Total events" value={events.length} accent="flare" />
        <StatCard label="Registrations" value={totals.reg} accent="acid" />
        <StatCard label="Submissions" value={totals.sub} accent="violet" />
        <StatCard label="Live now" value={live.length} accent="flare" />
      </div>

      {live.length > 0 && (
        <div className="mb-6">
          <h2 className="font-display text-2xl text-bone tracking-crush mb-3">Live events</h2>
          <div className="space-y-3">
            {live.map((e) => (
              <Card key={e.id} hover className="p-5 flex flex-col md:flex-row md:items-center gap-4 border border-flare/20">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Tag tone="flare">{e.type}</Tag>
                    <Badge>{e.status}</Badge>
                  </div>
                  <h3 className="font-display text-xl text-bone tracking-crush">{e.name}</h3>
                  <p className="text-xs text-bone2 mt-1">{e.dates} · Prize {e.prize}</p>
                </div>
                <div className="flex gap-6 text-center">
                  <div><p className="font-display text-2xl text-bone">{e.registrations}</p><p className="text-[10px] text-bone2">REGISTERED</p></div>
                  <div><p className="font-display text-2xl text-bone">{e.teams}</p><p className="text-[10px] text-bone2">TEAMS</p></div>
                  <div><p className="font-display text-2xl text-bone">{e.submissions}</p><p className="text-[10px] text-bone2">SUBMITTED</p></div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Button to={`/org/events/${e.id}`} size="sm" variant="flare">Manage ↗</Button>
                  <Button to={`/org/evaluate/${e.id}`} size="sm" variant="ghost">Jury room ↗</Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <h2 className="font-display text-2xl text-bone tracking-crush mb-3">All events</h2>
      <div className="space-y-4">
        {events.map((e) => (
          <Card key={e.id} hover className="p-6 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Tag tone="flare">{e.type}</Tag>
                <Badge>{e.status}</Badge>
              </div>
              <h3 className="font-display text-xl text-bone tracking-crush">{e.name}</h3>
              <p className="text-xs text-bone2 mt-1">{e.dates} · Prize {e.prize}</p>
            </div>
            <div className="flex gap-6 text-center">
              <div><p className="font-display text-2xl text-bone">{e.registrations}</p><p className="text-[10px] text-bone2">REGISTERED</p></div>
              <div><p className="font-display text-2xl text-bone">{e.teams}</p><p className="text-[10px] text-bone2">TEAMS</p></div>
              <div><p className="font-display text-2xl text-bone">{e.submissions}</p><p className="text-[10px] text-bone2">SUBMITTED</p></div>
            </div>
            <Button to={`/org/events/${e.id}`} size="sm" variant="ghost">Manage ↗</Button>
          </Card>
        ))}
      </div>
    </>
  )
}
