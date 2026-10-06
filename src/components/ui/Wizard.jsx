import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiError } from '../../lib/api'
import { fieldErrors } from '../layout/AuthLayout'
import { Button } from './Button'
import { Spinner } from './atoms'
import { Notice } from '../ecosystem/product'
import { useForm } from '../ecosystem/forms'

/**
 * A page-level stepped form: a step indicator, the current step's fields, and a live preview of
 * what the public page will look like. Modelled on CompleteProfileModal's step grammar (numbered
 * bars that fill acid as you advance) but sized for a page rather than a modal.
 *
 * It is a shell over the existing form kit — `renderStep` receives the same `useForm` object the
 * rest of the product uses, so `Text`, `Area`, `Choice`, `Repeater`, `SaveRow` all work unchanged.
 * One step's fields are validated, persisted, then the next opens; the preview re-renders as the
 * author types, so the "same as Unstop" page is literally built in front of them.
 */
export default function Wizard({
  eyebrow,
  title,
  subtitle,
  steps,
  initialValues,
  onSubmitStep,
  onFinish,
  onExit,
  renderStep,
  preview,
  previewTitle = 'Live preview',
  labels = {},
  finishLabel,
  renderDone,
  embedded = false,
}) {
  const L = { next: 'Save & continue', back: 'Back', exit: 'Save & exit', ...labels }
  const form = useForm(initialValues)
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)
  const [localErrors, setLocalErrors] = useState({})
  const bodyRef = useRef(null)
  const current = steps[step]
  const last = step === steps.length - 1

  // A step change starts a clean slate: clear stale errors and put the caret in the first field.
  useEffect(() => {
    setLocalErrors({})
    form.setErrors({})
    setDone(false)
    const el = bodyRef.current
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.setTimeout(() => el.querySelector('input,select,textarea,[contenteditable="true"],button')?.focus?.(), 260)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const errors = useMemo(() => ({ ...form.errors, ...localErrors }), [form.errors, localErrors])

  /** Client-side gate: required keys present, then the step's own cross-field check. */
  const validateStep = () => {
    const missing = {}
    for (const key of current.required ?? []) {
      const v = form.values?.[key]
      if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
        missing[key] = 'This field is required.'
      }
    }
    const custom = current.validate?.(form.values) ?? null
    const next = { ...missing, ...(custom ?? {}) }
    setLocalErrors(next)
    return Object.keys(next).length === 0
  }

  const persist = async (fn) => {
    form.setErrors({})
    form.setStatus(null)
    try {
      return { ok: true, value: await fn() }
    } catch (err) {
      if (err instanceof ApiError) {
        form.setErrors(fieldErrors(err))
        form.setStatus({ tone: 'error', text: err.message })
      } else {
        form.setStatus({ tone: 'error', text: 'Something went wrong. Try again.' })
      }
      return { ok: false }
    }
  }

  const next = async () => {
    if (form.busy) return
    if (!validateStep()) return
    if (onSubmitStep) {
      form.setStatus(null)
      const res = await persist(() => onSubmitStep(current.key, form.values))
      if (!res.ok) return
    }
    if (last) {
      const res = await persist(() => (onFinish ? onFinish(form.values) : undefined))
      if (!res.ok) return
      setDone(true)
      form.setStatus({ tone: 'success', text: 'All set.' })
      return
    }
    setStep((s) => s + 1)
  }

  const back = () => setStep((s) => Math.max(0, s - 1))

  const exit = async () => {
    if (onExit) {
      await persist(() => onExit(form.values))
    }
  }

  if (done && renderDone) return renderDone(form.values)

  const body = (
    <>
      {/* Step indicator — the CompleteProfileModal bars, one per step */}
      <ol className="grid gap-2 pb-8" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }} aria-label="Progress">
        {steps.map((s, i) => {
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

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card-surface p-6 md:p-8">
          <header className="mb-6">
            <p className="eyebrow mb-2">Step {step + 1} of {steps.length}</p>
            <h2 className="display-face text-2xl tracking-tight md:text-3xl">{current.title}</h2>
            {current.subtitle && <p className="mt-2 max-w-xl text-sm text-mute">{current.subtitle}</p>}
          </header>

          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              next()
            }}
          >
            <div className="space-y-5">{renderStep(current, { ...form, errors, setErrors: setLocalErrors })}</div>

            <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line/10 pt-6">
              {step > 0 && (
                <Button type="button" variant="ghost" magnetic={false} onClick={back} disabled={form.busy}>
                  {L.back}
                </Button>
              )}
              <Button type="submit" magnetic={false} disabled={form.busy}>
                {form.busy ? <Spinner className="h-5 w-5" /> : last ? finishLabel || L.finish || 'Publish' : L.next}
              </Button>
              {onExit && !last && (
                <Button type="button" variant="ghost" magnetic={false} onClick={exit} disabled={form.busy}>
                  {L.exit}
                </Button>
              )}
              <div className="sm:ml-2">
                {form.status && <Notice tone={form.status.tone}>{form.status.text}</Notice>}
              </div>
            </div>
          </form>
        </section>

        {preview && (
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <p className="eyebrow mb-3">{previewTitle}</p>
            <div className="card-surface max-h-[70vh] overflow-y-auto p-5">{preview(form.values, current, errors)}</div>
          </aside>
        )}
      </div>
    </>
  )

  // Inside an ecosystem product page the chrome (tabs, title, wrap) is already rendered, so the
  // wizard contributes only its own steps; standalone it brings its own header.
  if (embedded) return <div ref={bodyRef}>{body}</div>

  return (
    <div ref={bodyRef} className="pb-24 pt-28 md:pt-32">
      <div className="wrap">
        <header className="pb-8">
          {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
          <h1 className="display-face text-balance text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.02] tracking-tight">{title}</h1>
          {subtitle && <p className="mt-3 max-w-2xl text-mute">{subtitle}</p>}
        </header>
        {body}
      </div>
    </div>
  )
}
