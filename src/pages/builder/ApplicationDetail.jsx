import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../../lib/api'
import { useBuilderApplication, useOpportunity } from '../../lib/queries'
import { Button, ArrowIcon } from '../../components/ui/Button'
import { Input, Textarea } from '../../components/ui/Field'
import { StatusBadge } from '../../components/ui/status'
import { Chip, Tag, Spinner } from '../../components/ui/atoms'
import { Reveal, RevealGroup, RevealItem } from '../../components/ui/Reveal'
import { EASE } from '../../lib/motion'
import { titleCase, formatDate } from '../../lib/format'
import { NotFoundInline } from '../NotFound'

const TEXTUAL = new Set(['SHORT_TEXT', 'LONG_TEXT', 'URL'])

function initAnswers(app) {
  const map = {}
  for (const a of app?.answers || []) {
    map[a.questionId] = { text: a.text ?? '', choices: a.choices ?? [] }
  }
  return map
}

export default function BuilderApplicationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: app, isLoading, isError, error } = useBuilderApplication(id)
  const { data: opp } = useOpportunity(app?.opportunity?.slug)

  const [answers, setAnswers] = useState({})
  const [busy, setBusy] = useState(null) // 'save' | 'submit' | 'withdraw'
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    if (app) setAnswers(initAnswers(app))
  }, [app])

  const questions = opp?.applicationQuestions || []
  const editable = app?.status === 'DRAFT'
  const withdrawable = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED'].includes(app?.status)

  const setAnswer = (qid, patch) => setAnswers((prev) => ({ ...prev, [qid]: { ...prev[qid], ...patch } }))

  const payloadAnswers = useMemo(
    () =>
      questions
        .map((q) => {
          const a = answers[q.id] || {}
          if (TEXTUAL.has(q.type) || q.type === 'BOOLEAN') {
            if (!a.text) return null
            return { questionId: q.id, text: a.text }
          }
          if (!a.choices?.length) return null
          return { questionId: q.id, choices: a.choices }
        })
        .filter(Boolean),
    [questions, answers],
  )

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['builder-application', id] })
    qc.invalidateQueries({ queryKey: ['builder-applications'] })
    qc.invalidateQueries({ queryKey: ['builder-dashboard'] })
  }

  const run = async (kind, fn) => {
    setBusy(kind)
    setErrors({})
    setNotice(null)
    try {
      await fn()
      invalidate()
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) {
        setErrors(Object.fromEntries(err.details.map((d) => [d.field.replace(/^answers\./, ''), d.message])))
        setNotice(err.message)
      } else if (err instanceof ApiError) {
        setNotice(err.message)
      }
    } finally {
      setBusy(null)
    }
  }

  const saveDraft = () => run('save', async () => {
    await api.updateApplication(id, { answers: payloadAnswers })
    setNotice('Draft saved.')
  })
  const submit = () => run('submit', async () => {
    await api.updateApplication(id, { answers: payloadAnswers })
    await api.submitApplication(id)
    setNotice('Application submitted.')
  })
  const withdraw = () => run('withdraw', async () => {
    await api.withdrawApplication(id)
  })

  if (isLoading) {
    return (
      <div className="grid min-h-[100svh] place-items-center">
        <Spinner className="h-8 w-8 text-acid" />
      </div>
    )
  }
  if (isError && error?.status === 404) return <NotFoundInline kind="application" backTo="/builders/applications" />
  if (isError || !app) return <NotFoundInline kind="application" backTo="/builders/applications" />

  return (
    <article className="wrap py-28">
      <Link
        to="/builders/applications"
        className="mb-6 inline-flex items-center gap-2 text-sm text-mute hover:text-bone"
      >
        <ArrowIcon className="rotate-180" /> All applications
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {app.opportunity?.type && <Tag>{titleCase(app.opportunity.type)}</Tag>}
            <StatusBadge status={app.status} />
          </div>
          <h1 className="display-face text-balance text-4xl tracking-tight">
            {app.opportunity?.title || 'Application'}
          </h1>
          <p className="mt-2 text-mute">{app.opportunity?.organizationName}</p>
        </div>
        {app.opportunity?.slug && (
          <Button to={`/opportunities/${app.opportunity.slug}`} size="sm" variant="outline" magnetic={false}>
            View opportunity
          </Button>
        )}
      </motion.div>

      {notice && <p className="mt-6 text-sm text-acid">{notice}</p>}

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-8">
          {questions.length === 0 ? (
            <p className="text-mute">
              This opportunity has no application questions. {editable ? 'Submit when you’re ready.' : ''}
            </p>
          ) : (
            <RevealGroup className="space-y-8">
              {questions.map((q) => (
                <RevealItem key={q.id}>
                  <QuestionField
                    q={q}
                    value={answers[q.id] || { text: '', choices: [] }}
                    onChange={(patch) => setAnswer(q.id, patch)}
                    error={errors[q.id]}
                    disabled={!editable}
                  />
                </RevealItem>
              ))}
            </RevealGroup>
          )}

          {editable && (
            <div className="flex flex-wrap items-center gap-4 border-t border-line/10 pt-8">
              <Button onClick={saveDraft} variant="outline" magnetic={false} disabled={!!busy}>
                {busy === 'save' ? <Spinner className="h-5 w-5" /> : 'Save draft'}
              </Button>
              <Button onClick={submit} magnetic={false} disabled={!!busy}>
                {busy === 'submit' ? <Spinner className="h-5 w-5" /> : <>Submit application <ArrowIcon /></>}
              </Button>
            </div>
          )}
        </div>

        <Reveal as="aside" delay={0.15} className="lg:sticky lg:top-28 lg:self-start">
          <div className="card-surface p-6">
            <p className="eyebrow mb-4">Status</p>
            <StatusBadge status={app.status} />
            {app.submittedAt && <p className="mt-4 text-sm text-mute">Submitted {formatDate(app.submittedAt)}</p>}
            {app.reviewerNote && (
              <div className="mt-5 rounded-xl border border-line/12 bg-ink2/40 p-4">
                <p className="text-xs uppercase tracking-wide text-mute">Reviewer note</p>
                <p className="mt-1.5 text-sm text-bone">{app.reviewerNote}</p>
              </div>
            )}
            {app.statusHistory?.length > 0 && (
              <div className="mt-6">
                <p className="mb-3 text-xs uppercase tracking-wide text-mute">Timeline</p>
                <ol className="space-y-3 border-l border-line/12 pl-4">
                  {app.statusHistory.map((h, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-acid" />
                      <p className="text-sm text-bone">{titleCase(h.status)}</p>
                      <p className="text-xs text-mute">{formatDate(h.at, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {withdrawable && (
              <button
                onClick={withdraw}
                disabled={!!busy}
                className="mt-6 text-sm text-flare hover:underline disabled:opacity-50"
              >
                {busy === 'withdraw' ? 'Withdrawing…' : 'Withdraw application'}
              </button>
            )}
          </div>
        </Reveal>
      </div>
    </article>
  )
}

function QuestionField({ q, value, onChange, error, disabled }) {
  const label = (
    <div className="mb-2 flex items-baseline gap-2">
      <p className="text-sm font-medium text-bone/90">{q.label}</p>
      {q.required && <span className="text-xs text-flare">Required</span>}
    </div>
  )

  // Read-only rendering once the draft is no longer editable.
  if (disabled) {
    const display =
      value.choices?.length > 0
        ? value.choices.join(', ')
        : value.text
          ? q.type === 'BOOLEAN'
            ? value.text === 'true'
              ? 'Yes'
              : 'No'
            : value.text
          : '—'
    return (
      <div>
        {label}
        <p className="rounded-xl border border-line/12 bg-ink2/40 px-4 py-3 text-bone">{display}</p>
      </div>
    )
  }

  let control = null
  if (q.type === 'LONG_TEXT') {
    control = <Textarea value={value.text} onChange={(e) => onChange({ text: e.target.value })} rows={4} error={error} />
  } else if (q.type === 'SHORT_TEXT' || q.type === 'URL') {
    control = (
      <Input
        value={value.text}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder={q.type === 'URL' ? 'https://…' : ''}
        error={error}
      />
    )
  } else if (q.type === 'BOOLEAN') {
    control = (
      <div className="flex gap-2">
        <Chip active={value.text === 'true'} onClick={() => onChange({ text: 'true' })}>
          Yes
        </Chip>
        <Chip active={value.text === 'false'} onClick={() => onChange({ text: 'false' })}>
          No
        </Chip>
      </div>
    )
  } else if (q.type === 'SINGLE_SELECT') {
    control = (
      <div className="flex flex-wrap gap-2">
        {(q.options || []).map((opt) => (
          <Chip key={opt} active={value.choices?.[0] === opt} onClick={() => onChange({ choices: [opt] })}>
            {opt}
          </Chip>
        ))}
      </div>
    )
  } else if (q.type === 'MULTI_SELECT') {
    const toggle = (opt) => {
      const has = value.choices?.includes(opt)
      onChange({ choices: has ? value.choices.filter((c) => c !== opt) : [...(value.choices || []), opt] })
    }
    control = (
      <div className="flex flex-wrap gap-2">
        {(q.options || []).map((opt) => (
          <Chip key={opt} active={value.choices?.includes(opt)} onClick={() => toggle(opt)}>
            {opt}
          </Chip>
        ))}
      </div>
    )
  }

  return (
    <div>
      {label}
      {control}
      {error && <p className="mt-1.5 text-sm text-flare">{error}</p>}
    </div>
  )
}
