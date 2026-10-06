import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { useRoadmaps, useMyRoadmap } from '../../lib/queries'
import { useSeo } from '../../lib/seo'
import { Badge, EmptyState } from '../../components/ui/atoms'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Field'
import { Notice, Panel, ProductPage, QueryState, Stat } from '../../components/ecosystem/product'
import { RevealGroup, RevealItem, trackSpotlight } from '../../components/ui/Reveal'
import { EASE } from '../../lib/motion'

const PRIORITIES = ['CORE', 'IMPORTANT', 'OPTIONAL']
const PRIORITY_TONE = { CORE: 'urgent', IMPORTANT: 'soon', OPTIONAL: 'neutral' }
const PRIORITY_HINT = {
  CORE: 'Must-have for this role',
  IMPORTANT: 'Strongly expected',
  OPTIONAL: 'Worth having',
}

function ProgressBar({ percent }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-line/10" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-acid transition-[width] duration-500" style={{ width: `${percent}%` }} />
    </div>
  )
}

function RoleCard({ role, onPick, busy }) {
  return (
    <RevealItem
      as="article"
      onMouseMove={trackSpotlight}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="spotlight-card card-surface flex flex-col p-6"
    >
      <div className="flex flex-wrap items-center gap-2">
        {role.roleFamily && <Badge tone="violet">{role.roleFamily}</Badge>}
        {role.featured && <Badge tone="open">Popular</Badge>}
      </div>
      <h3 className="mt-4 text-lg font-semibold leading-tight text-bone">{role.role}</h3>
      <p className="mt-2 flex-grow text-sm text-mute">{role.summary}</p>
      <p className="mt-4 text-xs text-mute">
        {role.stepCount} skills · {role.stepCounts.CORE} core
      </p>
      <Button className="mt-5 self-start" magnetic={false} disabled={busy} onClick={() => onPick(role.slug)}>
        Aim for this role
      </Button>
    </RevealItem>
  )
}

function StepRow({ step, onToggle, busy }) {
  const locked = step.source === 'PROFILE'
  return (
    <li className="flex items-start gap-4 border-b border-line/10 py-4 last:border-0">
      <button
        type="button"
        aria-pressed={step.done}
        aria-label={step.done ? `Mark ${step.skillName} as not done` : `Mark ${step.skillName} as done`}
        disabled={locked || busy}
        onClick={() => onToggle(step.skillSlug, !step.done)}
        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border transition-colors ${
          step.done ? 'border-acid bg-acid/20 text-acid' : 'border-line/30 text-transparent hover:border-acid/50'
        } ${locked ? 'cursor-default' : 'cursor-pointer'}`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="m5 13 4 4L19 7" />
        </svg>
      </button>
      <div className="min-w-0 flex-grow">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`font-medium ${step.done ? 'text-mute line-through' : 'text-bone'}`}>{step.skillName}</span>
          <Badge tone={PRIORITY_TONE[step.priority]}>{step.priority}</Badge>
          {locked && <span className="text-xs text-mute">From your profile</span>}
          {step.source === 'MARKED' && <span className="text-xs text-mute">Marked by you</span>}
        </div>
        {step.rationale && <p className="mt-1 text-sm text-mute">{step.rationale}</p>}
      </div>
      {step.resourceSlug && (
        <a href={`/resources/${step.resourceSlug}`} className="mt-1 shrink-0 text-xs text-acid hover:underline">
          Learn ↗
        </a>
      )}
    </li>
  )
}

/**
 * /builders/roadmap — pick the role you're aiming at and see the skills between you and it.
 * The plan is computed on the server by diffing the role's steps against your profile, so a skill
 * you add to your profile completes its step here without anyone ticking anything. Rule-based by
 * design: no model is consulted.
 */
export default function BuilderRoadmap() {
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [choice, setChoice] = useState('')

  const mine = useMyRoadmap()
  // The full catalog is always fetched: the picker must be able to reach every published role,
  // not just the featured ones.
  const catalog = useRoadmaps({ pageSize: 50 })

  const plan = mine.data?.plan ?? null
  const roles = catalog.data?.items ?? []

  const chosen = plan?.goal.roleSlug ?? choice
  const targetDate = useMemo(() => (plan?.goal.targetDate ? plan.goal.targetDate.slice(0, 10) : ''), [plan])

  useSeo({
    title: 'Career roadmap | STUDLYF',
    description: 'Pick the role you are aiming at and see exactly which skills stand between you and it.',
    path: '/builders/roadmap',
  })

  const refresh = () => qc.invalidateQueries({ queryKey: ['my-roadmap'] })

  const run = async (fn, message) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await refresh()
      if (message) setError({ tone: 'success', text: message })
    } catch (err) {
      setError({ tone: 'error', text: err?.message || 'Something went wrong. Please try again.' })
    } finally {
      setBusy(false)
    }
  }

  const pick = (roleSlug) => run(() => api.setRoadmapGoal({ roleSlug }))

  const changeTarget = (value) =>
    run(() => api.setRoadmapGoal({ roleSlug: plan.goal.roleSlug, targetDate: value ? new Date(value).toISOString() : null }))

  const toggleStep = (skillSlug, done) => run(() => api.setRoadmapStep(skillSlug, done))

  const clear = () => {
    if (!window.confirm('Clear your goal? Your progress on this role will be forgotten.')) return
    run(() => api.clearRoadmapGoal())
  }

  return (
    <ProductPage
      eco="BUILDER"
      title="Career roadmap"
      subtitle="Aim at a role and the plan writes itself: what this role needs, diffed against what you already have."
      actions={plan && <Button variant="ghost" magnetic={false} disabled={busy} onClick={clear}>Change goal</Button>}
    >
      <QueryState
        query={mine}
        empty={false}
        emptyTitle="No roadmaps published yet"
        emptyHint="A STUDLYF editor publishes these role templates."
      >
        <div className="space-y-6">
          {error && <Notice tone={error.tone}>{error.text}</Notice>}

          {!plan ? (
            <>
              <Panel title="Choose the role you're aiming at">
                <p className="text-sm text-mute">
                  One goal at a time. You can change it whenever you like — the plan is recomputed, and
                  skills already on your profile count wherever they apply.
                </p>
              </Panel>
              {roles.length === 0 ? (
                <EmptyState title="No roles published yet" hint="Check back once the STUDLYF team publishes the catalog." />
              ) : (
                <RevealGroup className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {roles.map((role) => (
                    <RoleCard key={role.id} role={role} onPick={pick} busy={busy} />
                  ))}
                </RevealGroup>
              )}
            </>
          ) : (
            <>
              <Panel
                title={plan.goal.role}
                action={plan.goal.roleFamily && <Badge tone="violet">{plan.goal.roleFamily}</Badge>}
              >
                <p className="text-sm text-mute">{plan.goal.summary}</p>
                {plan.goal.demandNote && <p className="mt-3 text-sm text-bone">{plan.goal.demandNote}</p>}
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <Stat label="Skills done" value={`${plan.progress.complete} / ${plan.progress.total}`} />
                  <Stat label="Started" value={formatDate(plan.goal.startedAt)} />
                  <Stat label="Target" value={plan.goal.targetDate ? formatDate(plan.goal.targetDate) : 'Not set'} />
                </div>
              </Panel>

              <Panel title="Progress">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-3xl font-semibold text-bone">{plan.progress.percent}%</span>
                  <span className="text-sm text-mute">
                    {plan.progress.complete} of {plan.progress.total} skills
                  </span>
                </div>
                <div className="mt-4">
                  <ProgressBar percent={plan.progress.percent} />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {PRIORITIES.map((p) => {
                    const row = plan.progress.byPriority[p]
                    return (
                      <div key={p} className="rounded-xl border border-line/10 px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <Badge tone={PRIORITY_TONE[p]}>{p}</Badge>
                          <span className="text-sm text-bone">{row.complete} / {row.total}</span>
                        </div>
                        <p className="mt-2 text-xs text-mute">{PRIORITY_HINT[p]}</p>
                      </div>
                    )
                  })}
                </div>
                {plan.progress.nextSteps.length > 0 && (
                  <div className="mt-6 rounded-xl border border-acid/25 bg-acid/[0.05] p-4">
                    <p className="text-sm font-medium text-bone">Learn next</p>
                    <p className="mt-1 text-sm text-mute">
                      {plan.progress.nextSteps.map((s) => s.skillName).join(' · ')}
                    </p>
                  </div>
                )}
              </Panel>

              <Panel title="Your plan" action={<Badge tone="neutral">{plan.steps.length} skills</Badge>}>
                <ul>
                  {plan.steps.map((step) => (
                    <StepRow key={step.skillSlug} step={step} onToggle={toggleStep} busy={busy} />
                  ))}
                </ul>
              </Panel>

              <Panel title="Goal settings">
                <div className="grid gap-5 sm:grid-cols-3">
                  <label className="block">
                    <span className="mb-2 block text-sm text-mute">Role</span>
                    <Select value={chosen} disabled={busy} onChange={(e) => pick(e.target.value)}>
                      {[plan.goal, ...roles.filter((r) => r.slug !== plan.goal.roleSlug)].map((r) => (
                        <option key={r.slug} value={r.slug}>{r.role}</option>
                      ))}
                    </Select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm text-mute">Target date</span>
                    <input
                      type="date"
                      defaultValue={targetDate}
                      disabled={busy}
                      onChange={(e) => changeTarget(e.target.value)}
                      className="w-full rounded-xl border border-line/20 bg-transparent px-4 py-3 text-sm text-bone outline-none focus:border-acid/60"
                    />
                  </label>
                  <div className="flex items-end">
                    <p className="text-xs text-mute">
                      Answers update live as you add skills to your profile — a skill you list there
                      completes its step automatically.
                    </p>
                  </div>
                </div>
                <div className="mt-5">
                  <Button variant="ghost" magnetic={false} disabled={busy} onClick={clear}>Clear this goal</Button>
                </div>
              </Panel>
            </>
          )}
        </div>
      </QueryState>
    </ProductPage>
  )
}
