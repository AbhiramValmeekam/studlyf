import { useEffect, useState, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/atoms'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const { refresh } = useAuth()
  const [state, setState] = useState(token ? 'verifying' : 'missing')
  const ran = useRef(false)

  useEffect(() => {
    if (!token || ran.current) return
    ran.current = true
    api
      .verifyEmail({ token })
      .then(() => {
        setState('ok')
        refresh()
      })
      .catch(() => setState('error'))
  }, [token, refresh])

  const body = {
    verifying: (
      <div className="flex items-center gap-3 text-mute">
        <Spinner className="h-5 w-5 text-acid" /> Verifying your email…
      </div>
    ),
    ok: (
      <div className="space-y-6">
        <div className="rounded-xl border border-acid/25 bg-acid/[0.06] px-5 py-6 text-sm text-bone">
          Your email is verified. You’re all set.
        </div>
        <Button to="/account" magnetic={false}>
          Go to your account
        </Button>
      </div>
    ),
    error: (
      <div className="space-y-6">
        <div className="rounded-xl border border-flare/25 bg-flare/[0.06] px-5 py-6 text-sm text-flare">
          This verification link is invalid, expired, or already used.
        </div>
        <p className="text-sm text-mute">
          You can request a fresh link from your{' '}
          <Link to="/account" className="text-acid hover:underline">
            account page
          </Link>
          .
        </p>
      </div>
    ),
    missing: (
      <div className="rounded-xl border border-flare/25 bg-flare/[0.06] px-5 py-6 text-sm text-flare">
        This link is missing its token.
      </div>
    ),
  }[state]

  return <AuthLayout title="Email verification.">{body}</AuthLayout>
}
