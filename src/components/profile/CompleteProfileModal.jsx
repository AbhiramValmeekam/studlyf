import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../../lib/api'
import { useLenis } from '../../lib/lenis'
import { EASE } from '../../lib/motion'
import { MISSING_LABELS, detailsToErrors, personalPayload, toPersonalForm } from '../../lib/profile'
import { Button, ArrowIcon } from '../ui/Button'
import { Spinner, Tag } from '../ui/atoms'
import { BasicFields, EducationFields, InterestsPicker, LinksFields } from './PersonalFields'

const STEPS = [
  {
    key: 'basic',
    label: 'Basic details',
    title: 'Let’s start with you',
    subtitle: 'So organisers and recruiters can reach you about opportunities.',
    fields: ['name', 'phone', 'gender', 'city'],
    required: ['name', 'phone'],
  },
  {
    key: 'education',
    label: 'Education',
    title: 'Where do you study?',
    subtitle: 'Your college and year decide which hackathons, internships and programs you’re eligible for.',
    fields: ['college', 'degree', 'branch', 'yearOfStudy', 'graduationYear'],
    required: ['college', 'degree', 'branch', 'yearOfStudy', 'graduationYear'],
  },
  {
    key: 'links',
    label: 'Links & goals',
    title: 'Show your work',
    subtitle: 'Profiles with GitHub or LinkedIn get noticed far more often. Both are optional.',
    fields: ['links', 'interests'],
    required: [],
  },
]

/** First step that still has a required field missing (or the last step). */
function firstIncompleteStep(user) {
  const missing = new Set(user?.completion?.requiredMissing || [])
  const i = STEPS.findIndex((s) => s.required.some((f) => missing.has(f)))
  return i === -1 ? STEPS.length - 1 : i
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Unstop-style "Complete your profile" dialog. Each step saves on Continue, so partial
 * progress is kept even if the user skips halfway. Data goes to PATCH /me/profile —
 * the same store the profile page and the builder profile read from.
 */
export function CompleteProfileModal({ user, onClose, onFinished }) {
  const qc = useQueryClient()
  const lenis = useLenis()
  const reduce = useReducedMotion()
  const titleId = useId()
  const panelRef = useRef(null)
  const bodyRef = useRef(null)

  const [step, setStep] = useState(() => firstIncompleteStep(user))
  const [form, setForm] = useState(() => toPersonalForm(user))
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [completion, setCompletion] = useState(user?.completion)
  const done = step >= STEPS.length
  const current = STEPS[Math.min(step, STEPS.length - 1)]

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e))
  }

  // Lock page scroll (native + Lenis smooth scroll) and restore focus on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement
    const { overflow } = document.documentElement.style
    document.documentElement.style.overflow = 'hidden'
    lenis?.current?.stop()
    return () => {
      document.documentElement.style.overflow = overflow
      lenis?.current?.start()
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [lenis])

  // Focus the first field of each step, and scroll the step back to its top.
  useEffect(() => {
    bodyRef.current?.scrollTo?.({ top: 0 })
    const first = bodyRef.current?.querySelector('input:not([disabled]), select, button')
    first?.focus({ preventScroll: true })
  }, [step])

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab' || !panelRef.current) return
    const nodes = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null)
    if (!nodes.length) return
    const first = nodes[0]
    const last = nodes[nodes.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const save = async (e) => {
    e.preventDefault()
    setFormError('')
    const missing = current.required.filter((k) => !String(form[k] ?? '').trim())
    if (missing.length) {
      setErrors(Object.fromEntries(missing.map((k) => [k, 'Required'])))
      return
    }
    setBusy(true)
    try {
      const { data } = await api.updateMyProfile(personalPayload(form, current.fields))
      // The response is the fresh session user — update it in place, then let
      // builder views (profile page, dashboard, welcome) pick up the new values.
      qc.setQueryData(['me'], data)
      for (const key of ['builder-profile', 'builder-completion', 'builder-dashboard']) {
        qc.invalidateQueries({ queryKey: [key] })
      }
      setCompletion(data?.completion)
      setForm(toPersonalForm(data)) // normalised values (e.g. full GitHub URL) if they go Back
      setErrors({})
      setStep((s) => s + 1)
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) setErrors(detailsToErrors(err))
      else setFormError(err instanceof ApiError ? err.message : 'Couldn’t save — check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  const score = completion?.score ?? 0
  const slide = reduce
    ? {}
    : { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -24 }, transition: { duration: 0.28, ease: EASE } }

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/75 backdrop-blur-sm sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.25 }}
      onKeyDown={onKeyDown}
      data-lenis-prevent
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="card-surface flex max-h-[100svh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl !bg-ink2 shadow-2xl sm:max-h-[88svh] sm:rounded-3xl"
        initial={reduce ? false : { y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={reduce ? undefined : { y: 40, opacity: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        {/* Header: step progress + live completion */}
        <div className="border-b border-line/10 px-6 pb-5 pt-6 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Complete your profile</p>
              <p className="text-sm text-mute">
                Your profile is <span className="font-semibold text-acid">{score}%</span> complete
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close — finish later"
              className="-mr-2 -mt-1 rounded-full p-2 text-mute transition-colors hover:bg-line/[0.06] hover:text-bone"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <ol className="mt-5 grid grid-cols-3 gap-2" aria-label="Progress">
            {STEPS.map((s, i) => {
              const state = done || i < step ? 'done' : i === step ? 'current' : 'todo'
              return (
                <li key={s.key} aria-current={state === 'current' ? 'step' : undefined}>
                  <div className={`h-1.5 rounded-full transition-colors duration-500 ${state === 'todo' ? 'bg-line/10' : 'bg-acid'}`} />
                  <p className={`mt-2 hidden text-xs sm:block ${state === 'current' ? 'text-bone' : 'text-mute'}`}>
                    {i + 1}. {s.label}
                  </p>
                </li>
              )
            })}
          </ol>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {done ? (
            <motion.div key="done" {...slide} className="overflow-y-auto px-6 py-10 text-center sm:px-10">
              <DoneRing score={score} />
              <h2 id={titleId} className="display-face mt-6 text-3xl tracking-tight">
                You’re all set{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-mute">
                Your profile is ready. We’ll use it to recommend opportunities that fit your college, year and goals.
              </p>
              {completion?.missing?.length > 0 && (
                <div className="mt-6">
                  <p className="mb-2 text-xs uppercase tracking-wide text-mute">To reach 100%</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {completion.missing.map((m) => (
                      <Tag key={m}>{MISSING_LABELS[m] || m}</Tag>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-8 flex flex-col-reverse items-center justify-center gap-3 sm:flex-row">
                <Link to="/account" onClick={onFinished} className="text-sm text-acid hover:underline">
                  View my profile
                </Link>
                <Button type="button" onClick={onFinished} magnetic={false}>
                  Start exploring <ArrowIcon />
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.form key={current.key} {...slide} onSubmit={save} noValidate className="flex min-h-0 flex-1 flex-col">
              <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
                <p className="mb-1 font-mono text-xs text-mute">
                  Step {step + 1} of {STEPS.length}
                </p>
                <h2 id={titleId} className="display-face text-2xl tracking-tight sm:text-3xl">
                  {current.title}
                </h2>
                <p className="mb-6 mt-2 text-sm text-mute">{current.subtitle}</p>

                {formError && (
                  <div role="alert" className="mb-5 rounded-xl border border-flare/30 bg-flare/[0.06] px-4 py-3 text-sm text-flare">
                    {formError}
                  </div>
                )}

                {current.key === 'basic' && (
                  <BasicFields form={form} set={set} errors={errors} email={user?.email} emailVerified={user?.emailVerified} idPrefix="cp" />
                )}
                {current.key === 'education' && <EducationFields form={form} set={set} errors={errors} idPrefix="cp" />}
                {current.key === 'links' && (
                  <div className="space-y-6">
                    <LinksFields form={form} set={set} errors={errors} idPrefix="cp" />
                    <InterestsPicker form={form} set={set} errors={errors} />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-line/10 px-6 py-4 sm:px-8">
                {step > 0 ? (
                  <button type="button" onClick={() => setStep((s) => s - 1)} className="text-sm text-mute hover:text-bone">
                    ← Back
                  </button>
                ) : (
                  <button type="button" onClick={onClose} className="text-sm text-mute hover:text-bone">
                    Skip for now
                  </button>
                )}
                <div className="flex items-center gap-4">
                  {step > 0 && (
                    <button type="button" onClick={onClose} className="hidden text-sm text-mute hover:text-bone sm:inline">
                      Skip for now
                    </button>
                  )}
                  <Button type="submit" magnetic={false} disabled={busy}>
                    {busy ? (
                      <Spinner className="h-5 w-5" />
                    ) : step === STEPS.length - 1 ? (
                      'Finish'
                    ) : (
                      <>
                        Save & continue <ArrowIcon />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

function DoneRing({ score }) {
  const r = 34
  const c = 2 * Math.PI * r
  return (
    <div className="relative mx-auto h-24 w-24" aria-hidden>
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="6" className="stroke-line/10" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          className="stroke-acid transition-[stroke-dashoffset] duration-700"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-display text-2xl text-bone">{score}%</span>
    </div>
  )
}
