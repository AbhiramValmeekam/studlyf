import { Link } from 'react-router-dom'
import { events } from '../../data/mock/events'
import { Card, StatCard, Badge, Button, PageTitle, Tag } from '../../components/ui/primitives'

/**
 * Organizer Dashboard — organizations run hackathons, workshops, competitions
 * and challenges through the Builder ecosystem. Manage events + their stages.
 */
export default function OrganizerDashboard() {
  const totals = events.reduce((a, e) => ({ reg: a.reg + e.registrations, sub: a.sub + e.submissions }), { reg: 0, sub: 0 })
  return (
    <>
      <PageTitle eyebrow="Devfolio · Organizer" title="Your events">
        <Button size="sm" onClick={() => alert('Prototype: event creation is mocked.')}>+ Create event</Button>
      </PageTitle>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
        <StatCard label="Events" value={events.length} accent="flare" />
        <StatCard label="Registrations" value={totals.reg} accent="acid" />
        <StatCard label="Submissions" value={totals.sub} accent="violet" />
        <StatCard label="Live now" value={events.filter((e) => e.status === 'Live').length} accent="acid" />
      </div>

      <div className="space-y-4">
        {events.map((e) => (
          <Card key={e.id} hover className="p-6 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1"><Tag tone="flare">{e.type}</Tag><Badge>{e.status}</Badge></div>
              <h3 className="font-display text-xl text-bone tracking-crush">{e.name}</h3>
              <p className="text-xs text-bone2 mt-1">{e.dates} · Prize {e.prize}</p>
            </div>
            <div className="flex gap-6 text-center">
              <div><p className="font-display text-2xl text-bone">{e.registrations}</p><p className="text-[10px] text-bone2">REGISTERED</p></div>
              <div><p className="font-display text-2xl text-bone">{e.teams}</p><p className="text-[10px] text-bone2">TEAMS</p></div>
              <div><p className="font-display text-2xl text-bone">{e.submissions}</p><p className="text-[10px] text-bone2">SUBMITTED</p></div>
            </div>
            <Button to={`/organizer/events/${e.id}`} size="sm" variant="flare">Manage ↗</Button>
          </Card>
        ))}
      </div>
    </>
  )
}
