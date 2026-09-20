import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getStartup } from '../../data/mock/startups'
import { useSession } from '../../context/SessionContext'
import { Card, Tag, Button, Avatar, StatCard, EmptyState } from '../../components/ui/primitives'
import { ProgressRing } from '../../components/ui/ProgressRing'
import { Modal } from '../../components/ui/Modal'

/**
 * Investor-facing Founder/Startup profile — the full venture with a Connect
 * action (Modal). Connecting persists in session.
 */
export default function InvestorFounder() {
  const { id } = useParams()
  const s = getStartup(id)
  const { connections, toggleConnect } = useSession()
  const [open, setOpen] = useState(false)

  if (!s) return <EmptyState title="Startup not found" action={<Button to="/investor/discover" size="sm">Back to discovery</Button>} />
  const connected = connections.includes(s.id)

  return (
    <>
      <Link to="/investor/discover" className="text-sm text-bone2 hover:text-bone transition-colors" data-cursor="hover">← Founder discovery</Link>

      <Card className="p-7 mt-4">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <img src={s.logo} alt={s.name} className="h-16 w-16 rounded-xl bg-white object-contain p-2" />
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display d-2 text-bone tracking-crush leading-none">{s.name}</h1>
              <Tag tone="acid">{s.stage}</Tag>
            </div>
            <p className="text-bone2 mt-2">{s.tagline}</p>
            <div className="flex flex-wrap gap-2 mt-3"><Tag>{s.industry}</Tag><Tag>{s.location}</Tag><Tag>{s.funding}</Tag></div>
          </div>
          <div className="flex items-center gap-5">
            <ProgressRing value={s.readiness} label="READY" />
            <Button size="md" variant={connected ? 'ghost' : 'primary'} onClick={() => (connected ? toggleConnect(s.id) : setOpen(true))}>
              {connected ? '✓ Connected' : 'Connect'}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 my-6">
        {s.metrics.map((m) => <StatCard key={m.label} label={m.label} value={m.value} />)}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6"><h2 className="font-display text-xl text-bone tracking-crush mb-2">Problem</h2><p className="text-bone2">{s.problem}</p></Card>
          <Card className="p-6"><h2 className="font-display text-xl text-bone tracking-crush mb-2">Solution</h2><p className="text-bone2">{s.solution}</p></Card>
          <div className="grid sm:grid-cols-2 gap-6">
            <Card className="p-6"><h2 className="font-display text-lg text-bone tracking-crush mb-2">Business model</h2><p className="text-sm text-bone2">{s.businessModel}</p></Card>
            <Card className="p-6"><h2 className="font-display text-lg text-bone tracking-crush mb-2">Product</h2><p className="text-sm text-bone2">{s.product}</p></Card>
          </div>
        </div>

        <Card className="p-6 h-fit">
          <h2 className="font-display text-xl text-bone tracking-crush mb-4">Founder</h2>
          <div className="flex items-center gap-3">
            <Avatar src={s.founder.avatar} name={s.founder.name} size={56} />
            <div><p className="text-bone">{s.founder.name}</p><p className="text-xs text-bone2">{s.founder.role}</p></div>
          </div>
          <a href="#" className="text-sm text-acid mt-4 inline-block" data-cursor="hover">↗ {s.founder.linkedin}</a>
          <div className="mt-5 pt-5 border-t border-bone/10 text-sm text-bone2">
            <p><span className="text-bone">Traction:</span> {s.traction}</p>
            <p className="mt-2"><span className="text-bone">Team:</span> {s.teamSize} people</p>
            <p className="mt-2"><a href="#" className="text-acid" data-cursor="hover">↗ {s.website}</a></p>
          </div>
        </Card>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Connect with ${s.name}`}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => { toggleConnect(s.id); setOpen(false) }}>Send request</Button>
          </>
        }
      >
        <p>We'll share your fund profile and thesis with {s.founder.name}. If they accept, you'll both get contact details and can schedule a call.</p>
      </Modal>
    </>
  )
}
