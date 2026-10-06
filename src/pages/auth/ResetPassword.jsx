import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { AuthLayout, fieldErrors } from '../../components/layout/AuthLayout'
import { Button } from '../../components/ui/Button'
import { Input, FormField } from '../../components/ui/Field'
import { Spinner } from '../../components/ui/atoms'
import { api, ApiError } from '../../lib/api'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    setFormError('')
    try {
      await api.resetPassword({ token, password })
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 2200)
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(fieldErrors(err))
        setFormError(err.code === 'INVALID_TOKEN' ? 'This reset link is invalid or expired.' : err.message)
      } else {
        setFormError('Something went wrong. Try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Set a new password." footer={<Link to="/login" className="text-acid hover:underline">Back to log in</Link>}>
      {!token ? (
        <div className="rounded-xl border border-flare/25 bg-flare/[0.06] px-5 py-6 text-sm text-flare">
          This link is missing its token. Request a new one from the{' '}
          <Link to="/forgot-password" className="underline">
            reset page
          </Link>
          .
        </div>
      ) : done ? (
        <div className="rounded-xl border border-acid/25 bg-acid/[0.06] px-5 py-6 text-sm text-bone">
          Password updated. Redirecting you to log in…
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          {formError && (
            <div className="rounded-xl border border-flare/25 bg-flare/[0.06] px-4 py-3 text-sm text-flare">{formError}</div>
          )}
          <FormField label="New password" htmlFor="password" error={errors.password} hint="At least 8 characters, with a letter and a number.">
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              autoComplete="new-password"
              required
            />
          </FormField>
          <Button type="submit" className="w-full" magnetic={false} disabled={busy}>
            {busy ? <Spinner className="h-5 w-5" /> : 'Update password'}
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
