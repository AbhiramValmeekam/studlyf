import { events } from '../../data/mock/events'
import { Card, StatCard, Badge, Button, PageTitle, Tag } from '../../components/ui/primitives'

/**
 * Org Events — list of all events owned by the organisation.
 * Entry point to manage an event's full lifecycle or jump into the jury room.
 */
export default function OrgEvents() {
  return (
    <>
      <PageTitle eyebrow="Organisation · Events" title="My events">
        <Button size="sm" onClick={() => alert('Prototype: event creation is mocked.')}>
          + Create event
        </Button>
      </PageTitle>

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
              <div>
                <p className="font-display text-2xl text-bone">{e.registrations}</p>
                <p className="text-[10px] text-bone2">REGISTERED</p>
              </div>
              <div>
                <p className="font-display text-2xl text-bone">{e.teams}</p>
                <p className="text-[10px] text-bone2">TEAMS</p>
              </div>
              <div>
                <p className="font-display text-2xl text-bone">{e.submissions}</p>
                <p className="text-[10px] text-bone2">SUBMITTED</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <Button to={`/org/events/${e.id}`} size="sm" variant="flare">
                Manage ↗
              </Button>
              {e.submissions > 0 && (
                <Button to={`/org/evaluate/${e.id}`} size="sm" variant="ghost">
                  Jury room ↗
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}
