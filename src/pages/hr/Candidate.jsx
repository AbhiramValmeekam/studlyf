import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getCandidate } from '../../data/mock/talent'
import { useSession } from '../../context/SessionContext'
import { Card, Tag, Button, Avatar, EmptyState } from '../../components/ui/primitives'
import { ProgressBar } from '../../components/ui/ProgressRing'
import { Modal } from '../../components/ui/Modal'

/**
 * HR Candidate profile — identity, skills, and the Project Evidence surface:
 * each project shows GitHub, live demo, jury score and an evaluation breakdown.
 * Shortlist / Invite actions feed the hiring pipeline.
 */
export default function HrCandidate() {
  const { id } = useParams()
  const c = getCandidate(id)
  const { shortlist, toggleShortlist, setStage } = useSession()
  const [invite, setInvite] = useState(false)

  if (!c) return <EmptyState title="Candidate not found" action={<Button to="/hr/talent" size="sm">Back to discovery</Button>} />
  const listed = shortlist.includes(c.id)

  return (
    <>
      <Link to="/hr/talent" className="text-sm text-bone2 hover:text-bone transition-colors" data-cursor="hover">← Talent discovery</Link>

      <Card className="p-7 mt-4">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <Avatar src={c.avatar} name={c.name} size={88} />
          <div className="flex-1">
            <h1 className="font-display d-2 text-bone tracking-crush leading-none">{c.name}</h1>
            <p className="text-bone2 mt-2">{c.education}</p>
            <p className="text-sm text-bone2/80 mt-1">{c.summary}</p>
            <div className="flex flex-wrap gap-2 mt-3"><Tag tone="acid">{c.role}</Tag><Tag>{c.location}</Tag><Tag>{c.availability}</Tag></div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-center mb-2"><span className="font-display text-4xl text-acid leading-none">{c.topEvaluation}</span><span className="block text-[10px] text-bone2">HIGHEST EVAL</span></div>
            <Button size="sm" variant={listed ? 'ghost' : 'primary'} onClick={() => toggleShortlist(c.id)}>{listed ? '✓ Shortlisted' : 'Shortlist'}</Button>
            <Button size="sm" variant="ghost" onClick={() => setInvite(true)}>Invite</Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 mt-5 pt-5 border-t border-bone/10 text-sm text-bone2">
          <a href="#" className="hover:text-acid" data-cursor="hover">↗ {c.github} ({c.githubActivity} activity)</a>
          <a href="#" className="hover:text-acid" data-cursor="hover">↗ {c.linkedin}</a>
          <a href="#" className="hover:text-acid" data-cursor="hover">↗ {c.portfolio || `${c.github.split('/')[1]}.studlyf.dev`} (portfolio)</a>
          <span>◇ {c.hackathons} hackathons</span>
          <span>◇ {c.experience}</span>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2">
          <h2 className="font-display text-2xl text-bone tracking-crush mb-4">Project evidence</h2>
          <div className="space-y-4">
            {c.projects.map((p) => (
              <Card key={p.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-xl text-bone tracking-crush">{p.name}</h3>
                    <p className="text-sm text-bone2 mt-1">{p.blurb}</p>
                    <div className="flex flex-wrap gap-2 mt-3">{p.stack.map((s) => <Tag key={s}>{s}</Tag>)}</div>
                    <div className="flex gap-4 mt-3 text-xs">
                      <a href="#" className="text-acid" data-cursor="hover">↗ GitHub</a>
                      <a href="#" className="text-acid" data-cursor="hover">↗ Live demo</a>
                    </div>
                  </div>
                  <div className="text-center shrink-0"><span className="font-display text-3xl text-acid leading-none">{p.evaluation}</span><span className="block text-[10px] text-bone2 mt-1">JURY SCORE</span></div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                  {p.breakdown.map((b) => (
                    <div key={b.label}>
                      <div className="flex justify-between text-[11px] text-bone2 mb-1"><span>{b.label}</span><span className="text-bone">{b.value}</span></div>
                      <ProgressBar value={b.value} />
                    </div>
                  ))}
                </div>
                <p className="text-sm text-bone2 mt-4 pt-4 border-t border-bone/10 italic">“{p.jury}” <span className="not-italic text-bone2/60">— jury</span></p>
              </Card>
            ))}
          </div>
        </div>

        <Card className="p-6 h-fit">
          <h2 className="font-display text-xl text-bone tracking-crush mb-4">Skills & recognition</h2>
          <div className="flex flex-wrap gap-2">{c.skills.map((s) => <Tag key={s} tone="acid">{s}</Tag>)}</div>
          <ul className="mt-5 space-y-2">
            {c.achievements.map((a) => <li key={a} className="flex gap-2 text-sm text-bone2"><span className="text-acid">★</span>{a}</li>)}
          </ul>
        </Card>
      </div>

      <Modal
        open={invite}
        onClose={() => setInvite(false)}
        title={`Invite ${c.name}`}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setInvite(false)}>Cancel</Button>
            <Button size="sm" onClick={() => { if (!listed) toggleShortlist(c.id); setStage(c.id, 'invited'); setInvite(false) }}>Send invite</Button>
          </>
        }
      >
        <p>Invite {c.name} to interview for a role at Cygnus. They'll be added to your hiring pipeline at the "Invited" stage.</p>
      </Modal>
    </>
  )
}
