import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getOpportunity } from '../../data/mock/opportunities'
import { useSession } from '../../context/SessionContext'
import { Card, Button, Tag, EmptyState } from '../../components/ui/primitives'
import { Stepper } from '../../components/ui/Stepper'
import { Field, Input, TextArea, ChipSelect } from '../../components/ui/forms'

const STEPS = ['Team', 'Project', 'Problem', 'Additional', 'Review']
const SKILL_OPTS = ['React', 'Node.js', 'Python', 'ML', 'UI/UX', 'Go', 'Cloud', 'Data']

/**
 * ApplyWizard — the multi-step application flow: Team → Project → Problem
 * Statement → Additional Info → Review → Submit → Confirmation. Per-step
 * validation, save-draft, back/continue. On submit it records a submission in
 * session and routes to the confirmation screen.
 */
export default function ApplyWizard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const o = getOpportunity(id)
  const { drafts, saveDraft, submitApplication } = useSession()

  const [step, setStep] = useState(0)
  const [form, setForm] = useState(
    drafts[id] || {
      teamName: '', teamSize: '1', members: '',
      projectName: '', projectStack: [], repo: '',
      problem: '', approach: '',
      links: '', notes: '', agree: false,
    },
  )
  const [errors, setErrors] = useState({})

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const validate = (s) => {
    const e = {}
    if (s === 0) {
      if (!form.teamName.trim()) e.teamName = 'Team name is required'
      if (!form.members.trim()) e.members = 'List at least yourself'
    }
    if (s === 1) {
      if (!form.projectName.trim()) e.projectName = 'Project name is required'
      if (form.projectStack.length === 0) e.projectStack = 'Pick at least one technology'
    }
    if (s === 2) {
      if (form.problem.trim().length < 20) e.problem = 'Describe the problem (20+ chars)'
      if (form.approach.trim().length < 20) e.approach = 'Describe your approach (20+ chars)'
    }
    if (s === 4) {
      if (!form.agree) e.agree = 'You must accept the rules to submit'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = () => {
    if (!validate(step)) return
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }
  const back = () => setStep((s) => Math.max(s - 1, 0))

  const submit = () => {
    if (!validate(4)) return
    const sid = `S${Math.random().toString(36).slice(2, 7).toUpperCase()}`
    submitApplication({
      id: sid,
      oppId: o.id,
      oppTitle: o.title,
      org: o.org,
      status: 'Under Review',
      submittedAt: new Date().toISOString(),
      team: form.teamName,
      project: form.projectName,
    })
    navigate(`/builder/submission/${sid}`)
  }

  if (!o) return <EmptyState title="Opportunity not found" action={<Button to="/builder/opportunities" size="sm">Back</Button>} />

  return (
    <>
      <Link to={`/builder/opportunities/${o.id}`} className="text-sm text-bone2 hover:text-bone transition-colors" data-cursor="hover">← {o.title}</Link>

      <div className="max-w-3xl mx-auto mt-4">
        <Card className="p-4 mb-6"><Stepper steps={STEPS} current={step} /></Card>

        <Card className="p-7">
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="font-display text-2xl text-bone tracking-crush">Team details</h2>
              <Field label="Team name" required error={errors.teamName}>
                <Input value={form.teamName} onChange={(e) => set('teamName', e.target.value)} placeholder="e.g. DevSync" error={errors.teamName} />
              </Field>
              <Field label="Team size">
                <Input type="number" min="1" max="4" value={form.teamSize} onChange={(e) => set('teamSize', e.target.value)} />
              </Field>
              <Field label="Members" required hint="Names or emails, comma-separated" error={errors.members}>
                <TextArea value={form.members} onChange={(e) => set('members', e.target.value)} placeholder="You, teammate@email.com" error={errors.members} />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <h2 className="font-display text-2xl text-bone tracking-crush">Project details</h2>
              <Field label="Project name" required error={errors.projectName}>
                <Input value={form.projectName} onChange={(e) => set('projectName', e.target.value)} placeholder="What are you building?" error={errors.projectName} />
              </Field>
              <Field label="Tech stack" required error={errors.projectStack}>
                <ChipSelect options={SKILL_OPTS} value={form.projectStack} onChange={(v) => set('projectStack', v)} />
              </Field>
              <Field label="Repository" hint="Optional at submission">
                <Input value={form.repo} onChange={(e) => set('repo', e.target.value)} placeholder="github.com/…" />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="font-display text-2xl text-bone tracking-crush">Problem statement</h2>
              <Field label="What problem are you solving?" required error={errors.problem}>
                <TextArea rows={4} value={form.problem} onChange={(e) => set('problem', e.target.value)} error={errors.problem} placeholder="Describe the problem and who it affects…" />
              </Field>
              <Field label="Your approach" required error={errors.approach}>
                <TextArea rows={4} value={form.approach} onChange={(e) => set('approach', e.target.value)} error={errors.approach} placeholder="How does your solution work?" />
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h2 className="font-display text-2xl text-bone tracking-crush">Additional information</h2>
              <Field label="Relevant links" hint="Demo, video, deck — optional">
                <Input value={form.links} onChange={(e) => set('links', e.target.value)} placeholder="https://…" />
              </Field>
              <Field label="Anything else?" hint="Optional">
                <TextArea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Notes for the organizers" />
              </Field>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <h2 className="font-display text-2xl text-bone tracking-crush">Review & submit</h2>
              <div className="rounded-xl border border-bone/10 divide-y divide-bone/10">
                {[
                  ['Team', form.teamName || '—'],
                  ['Members', form.members || '—'],
                  ['Project', form.projectName || '—'],
                  ['Stack', form.projectStack.join(', ') || '—'],
                  ['Problem', form.problem || '—'],
                  ['Approach', form.approach || '—'],
                  ['Links', form.links || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-4 p-3.5 text-sm">
                    <span className="w-24 shrink-0 text-bone2">{k}</span>
                    <span className="text-bone break-words">{v}</span>
                  </div>
                ))}
              </div>
              <label className="flex items-start gap-3 text-sm text-bone2 cursor-pointer" data-cursor="hover">
                <input type="checkbox" checked={form.agree} onChange={(e) => set('agree', e.target.checked)} className="mt-0.5 accent-[#C7F24E]" />
                I confirm this is original work and I accept the {o.org} rules.
              </label>
              {errors.agree && <p className="text-[11px] text-flare -mt-3">{errors.agree}</p>}
            </div>
          )}

          {/* controls */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-bone/10">
            <button
              onClick={() => { saveDraft(o.id, form) }}
              data-cursor="hover"
              className="text-sm text-bone2 hover:text-acid transition-colors"
            >
              Save draft
            </button>
            <div className="flex gap-3">
              {step > 0 && <Button variant="ghost" size="md" onClick={back}>Back</Button>}
              {step < STEPS.length - 1 ? (
                <Button size="md" onClick={next}>Continue →</Button>
              ) : (
                <Button size="md" onClick={submit}>Submit application ↗</Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}
