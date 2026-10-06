import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { AuthLayout, fieldErrors } from '../../components/layout/AuthLayout'
import { Button } from '../../components/ui/Button'
import { Input, FormField } from '../../components/ui/Field'
import { Spinner } from '../../components/ui/atoms'
import { ApiError } from '../../lib/api'
import { resolveDestination } from '../../lib/ecosystems'
import { track } from '../../lib/analytics'
import { useSeo } from '../../lib/seo'

/**
 * /login — ONE universal sign-in. It takes no parameters: every visitor sees the same
 * screen, and where they land afterwards is decided entirely by the server (`user.ecosystems`,
 * plus `user.role` as the primary) and by a deep link they were bounced from (`state.from`).
 *
 * Older `?role=` links are folded away below, so a bookmarked `/login?role=FOUNDER` resolves
 * to a clean `/login`.
 */
export default function Login() {
  const { login, isAuthed, user, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const from = location.state?.from || null

  useSeo({ title: 'Log in | STUDLYF', description: 'Log in to your STUDLYF account.', path: '/login' })

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    track('login_started')
  }, [])

  // Already signed in (e.g. clicked "Log in" from a landing page): go straight on.
  if (!isLoading && isAuthed && !busy) return <Navigate to={resolveDestination(user, { from })} replace />
  // Canonical URL: /login never carries a role. The deep link they came from still wins.
  if (params.has('role')) return <Navigate to="/login" replace state={location.state} />

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    setFormError('')
    try {
      const signedIn = await login(form)
      track('login_completed')
      navigate(resolveDestination(signedIn, { from }), { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(fieldErrors(err))
        setFormError(err.code === 'INVALID_CREDENTIALS' ? 'Wrong email or password.' : err.message)
      } else {
        setFormError('Something went wrong. Try again.')
      }
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="One account · five ecosystems"
      title="Welcome back."
      subtitle="Log in and we’ll take you straight to your ecosystem."
      footer={
        <>
          New here?{' '}
          <Link to="/signup" className="text-acid hover:underline">
            Create an account
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
        <FormField label="Email" htmlFor="email" error={errors.email}>
          <Input id="email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} required />
        </FormField>
        <FormField label="Password" htmlFor="password" error={errors.password}>
          <Input id="password" type="password" autoComplete="current-password" value={form.password} onChange={set('password')} error={errors.password} required />
        </FormField>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm text-mute hover:text-bone">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" magnetic={false} disabled={busy}>
          {busy ? <Spinner className="h-5 w-5" /> : 'Log in'}
        </Button>
      </form>
    </AuthLayout>
  )
}
