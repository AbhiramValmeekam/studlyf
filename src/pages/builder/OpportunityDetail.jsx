import { useParams, Link } from 'react-router-dom'
import { getOpportunity } from '../../data/mock/opportunities'
import { useSession } from '../../context/SessionContext'
import { Card, Tag, Button, EmptyState } from '../../components/ui/primitives'

/**
 * OpportunityDetail — full brief for one opportunity with an Apply CTA that
 * launches the application wizard.
 */
export default function OpportunityDetail() {
  const { id } = useParams()
  const o = getOpportunity(id)
  const { saved, toggleSave } = useSession()

  if (!o) return <EmptyState title="Opportunity not found" action={<Button to="/builder/opportunities" size="sm">Back to list</Button>} />

  return (
    <>
      <Link to="/builder/opportunities" className="text-sm text-bone2 hover:text-bone transition-colors" data-cursor="hover">← All opportunities</Link>

      <div className="grid lg:grid-cols-3 gap-6 mt-4">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-7">
            <div className="flex items-start gap-4">
              <img src={o.orgLogo} alt={o.org} className="h-14 w-14 rounded-xl bg-white object-contain p-2 shrink-0" />
              <div>
                <div className="flex gap-2 mb-2"><Tag tone="acid">{o.type}</Tag><Tag>{o.mode}</Tag></div>
                <h1 className="font-display d-2 text-bone tracking-crush leading-none">{o.title}</h1>
                <p className="text-bone2 mt-2">{o.org} · {o.location}</p>
              </div>
            </div>
            <p className="text-bone2 leading-relaxed mt-6">{o.about}</p>
          </Card>

          <Card className="p-7">
            <h2 className="font-display text-xl text-bone tracking-crush mb-3">Eligibility</h2>
            <p className="text-bone2">{o.eligibility}</p>
          </Card>

          <div className="grid sm:grid-cols-2 gap-6">
            <Card className="p-7">
              <h2 className="font-display text-xl text-bone tracking-crush mb-3">Benefits</h2>
              <ul className="space-y-2">
                {o.benefits.map((b) => <li key={b} className="flex gap-2 text-sm text-bone2"><span className="text-acid">✦</span>{b}</li>)}
              </ul>
            </Card>
            <Card className="p-7">
              <h2 className="font-display text-xl text-bone tracking-crush mb-3">Rules</h2>
              <ul className="space-y-2">
                {o.rules.map((r) => <li key={r} className="flex gap-2 text-sm text-bone2"><span className="text-flare">•</span>{r}</li>)}
              </ul>
            </Card>
          </div>

          <Card className="p-7">
            <h2 className="font-display text-xl text-bone tracking-crush mb-4">Timeline</h2>
            <ol className="relative border-l border-bone/15 ml-2 space-y-5">
              {o.timeline.map((t) => (
                <li key={t.label} className="ml-5">
                  <span className="absolute -left-[7px] h-3 w-3 rounded-full bg-acid" />
                  <p className="text-sm text-bone">{t.label}</p>
                  <p className="text-xs text-bone2">{t.date}</p>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="p-7">
            <h2 className="font-display text-xl text-bone tracking-crush mb-4">About the organizer</h2>
            <div className="flex items-start gap-4">
              <img src={o.orgLogo} alt={o.org} className="h-12 w-12 rounded-xl bg-white object-contain p-2 shrink-0" />
              <div>
                <p className="text-bone font-medium">{o.org}</p>
                <p className="text-xs text-bone2">{o.location}</p>
                <p className="text-sm text-bone2 mt-2 max-w-md">
                  {o.org} hosts this {o.type.toLowerCase()} through STUDLYF to discover and back strong builders. Winning work is reviewed by their team, and standout participants are fast-tracked for opportunities.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* sticky apply rail */}
        <div>
          <Card className="p-6 lg:sticky lg:top-24">
            <p className="eyebrow text-bone2">Prize / Benefit</p>
            <p className="font-display text-3xl text-acid leading-none mt-2">{o.prize}</p>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-bone2">Duration</dt><dd className="text-bone">{o.duration}</dd></div>
              <div className="flex justify-between"><dt className="text-bone2">Deadline</dt><dd className="text-bone">{new Date(o.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</dd></div>
              <div className="flex justify-between"><dt className="text-bone2">Mode</dt><dd className="text-bone">{o.mode}</dd></div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              {o.skills.map((s) => <Tag key={s}>{s}</Tag>)}
            </div>
            <Button to={`/builder/opportunities/${o.id}/apply`} size="lg" className="w-full mt-6">Apply now ↗</Button>
            <button
              onClick={() => toggleSave(o.id)}
              data-cursor="hover"
              className={`w-full text-center text-sm mt-3 transition-colors ${saved.includes(o.id) ? 'text-acid' : 'text-bone2 hover:text-bone'}`}
            >
              {saved.includes(o.id) ? '★ Saved' : '☆ Save for later'}
            </button>
          </Card>
        </div>
      </div>
    </>
  )
}
