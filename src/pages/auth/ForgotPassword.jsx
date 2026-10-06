import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { Button } from '../../components/ui/Button'
import { Input, FormField } from '../../components/ui/Field'
import { Spinner } from '../../components/ui/atoms'
import { api } from '../../lib/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      // Always 200 — the API never reveals whether an account exists.
      await api.forgotPassword({ email })
      setSent(true)
    } catch {
      setSent(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Reset password."
      subtitle="We’ll email you a link to set a new one."
      footer={
        <Link to="/login" className="text-acid hover:underline">
          Back to log in
        </Link>
      }
    >
      {sent ? (
        <div className="rounded-xl border border-acid/25 bg-acid/[0.06] px-5 py-6 text-sm text-bone">
          If an account exists for <span className="font-medium">{email}</span>, a reset link is on its way.
          Check your inbox (and the server console in dev).
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          <FormField label="Email" htmlFor="email">
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </FormField>
          <Button type="submit" className="w-full" magnetic={false} disabled={busy}>
            {busy ? <Spinner className="h-5 w-5" /> : 'Send reset link'}
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
