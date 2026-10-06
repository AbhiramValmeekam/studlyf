import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { AuthLayout, fieldErrors } from '../../components/layout/AuthLayout'
import { Button } from '../../components/ui/Button'
import { Input, FormField } from '../../components/ui/Field'
import { Spinner } from '../../components/ui/atoms'
import { EcosystemSelector } from '../../components/ecosystem/EcosystemSelector'
import { ApiError } from '../../lib/api'
import { ECOSYSTEMS, ECOSYSTEM_KEYS, parseRole, resolveDestination } from '../../lib/ecosystems'
import { track } from '../../lib/analytics'
import { useSeo } from '../../lib/seo'

const NEXT_STEP = {
  BUILDER: 'Next: set up your builder profile.',
  FOUNDER: 'Next: create your founder and startup profile.',
  INVESTOR: 'Next: request investor access — the STUDLYF team verifies every investor.',
  HR: 'Next: verify your hiring organization.',
  ORGANIZER: 'Next: create your organization for verification.',
}

/**
 * /signup?role=… — one account for every ecosystem. The chosen role travels with the sign-up as
 * the onboarding intent: Builder and Founder are self-service; Investor, HR and Organization only
 * record the intent, and the resolver then routes to their verification flow.
 * Without a role, the page first asks "How will you use STUDLYF?" — it never defaults to Builder.
 */
export default function Signup() {
  const { register, isAuthed, user, isLoading } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const role = parseRole(params.get('role'))
  const eco = role ? ECOSYSTEMS[role] : null

  useSeo({ title: eco ? `Join STUDLYF as ${eco.label}` : 'Join STUDLYF', description: 'Create your STUDLYF account.', path: '/signup' })

  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  // A signed-in person choosing a path doesn't need a second account.
  if (!isLoading && isAuthed && !busy) return <Navigate to={resolveDestination(user, { intent: role })} replace />

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    setFormError('')
    try {
      const created = await register({ name: form.name, email: form.email, password: form.password, intent: role })
      track('signup_completed', { ecosystem: role })
      track('onboarding_started', { ecosystem: role })
      navigate(resolveDestination(created, { intent: role }), { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(fieldErrors(err))
        setFormError(err.code === 'EMAIL_TAKEN' ? 'That email is already registered — log in instead.' : err.message)
      } else {
        setFormError('Something went wrong. Try again.')
      }
      setBusy(false)
    }
  }

  if (!eco) {
    return (
      <div className="min-h-[100svh] px-5 py-16 md:px-10 md:py-24">
        <div className="mx-auto max-w-5xl">
          <Link to="/" className="display-face text-2xl tracking-crush">
            STUDLYF<span className="text-acid">.</span>
          </Link>
          <p className="eyebrow mb-4 mt-14">Join STUDLYF</p>
          <h1 className="display-face text-balance text-[clamp(2.4rem,6vw,4.5rem)] leading-[0.95] tracking-tight">How will you use STUDLYF?</h1>
          <p className="mt-4 max-w-xl text-mute">Pick where you want to start. One account works across every ecosystem — you can add another later.</p>
          <div className="mt-10">
            <EcosystemSelector
              keys={ECOSYSTEM_KEYS}
              onPick={(key) => {
                track('signup_started', { ecosystem: key, source: 'signup_page' })
                setParams({ role: key })
              }}
            />
          </div>
          <p className="mt-10 text-sm text-mute">
            Already have an account?{' '}
            <Link to="/login" className="text-acid hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <AuthLayout
      title={`Join as ${eco.label === 'HR & Talent' ? 'HR' : eco.label.toLowerCase()}.`}
      subtitle={NEXT_STEP[role]}
      eyebrow={`STUDLYF for ${eco.plural}`}
      aside={eco.blurb}
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="text-acid hover:underline">
            Log in
          </Link>{' '}
          ·{' '}
          <Link to="/signup" className="hover:text-bone">
            Choose a different path
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        {formError && (
          <div className="rounded-xl border border-flare/25 bg-flare/[0.06] px-4 py-3 text-sm text-flare" role="alert">
            {formError}
          </div>
        )}
        <FormField label="Name" htmlFor="name" error={errors.name}>
          <Input id="name" value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" required />
        </FormField>
        <FormField label={role === 'HR' || role === 'ORGANIZER' ? 'Email (work email preferred)' : 'Email'} htmlFor="email" error={errors.email}>
          <Input id="email" type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" required />
        </FormField>
        <FormField label="Password" htmlFor="password" error={errors.password} hint="At least 8 characters, with a letter and a number.">
          <Input id="password" type="password" value={form.password} onChange={set('password')} error={errors.password} autoComplete="new-password" required />
        </FormField>
        <Button type="submit" className="w-full" magnetic={false} disabled={busy}>
          {busy ? <Spinner className="h-5 w-5" /> : 'Create account'}
        </Button>
        <p className="text-center text-xs text-mute">We’ll email you a link to verify your address.</p>
      </form>
    </AuthLayout>
  )
}
