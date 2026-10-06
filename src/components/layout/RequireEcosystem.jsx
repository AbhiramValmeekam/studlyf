import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { rememberEcosystem } from '../../lib/ecosystems'
import { Spinner } from '../ui/atoms'

function FullSpinner() {
  return (
    <div className="grid min-h-[100svh] place-items-center">
      <Spinner className="h-8 w-8 text-acid" />
    </div>
  )
}

/**
 * RoleGuard + VerificationGate for an ecosystem's product area. The decision comes from the
 * server-computed `user.ecosystems[key]` (never from the URL): signed out → the universal
 * /login (which returns them here via `state.from`); not onboarded / pending / rejected /
 * suspended → that ecosystem's onboarding or status page.
 * The API enforces the same rules on every request, so this guard is UX, not security.
 */
export function RequireEcosystem({ ecosystem, children }) {
  const { user, isAuthed, isLoading } = useAuth()
  const location = useLocation()
  const state = user?.ecosystems?.[ecosystem]
  // Older API responses (before multi-ecosystem) only carried roles[].
  const allowed = state ? state.active : !!user?.roles?.includes(ecosystem)

  useEffect(() => {
    if (allowed) rememberEcosystem(ecosystem)
  }, [allowed, ecosystem])

  if (isLoading) return <FullSpinner />
  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  if (!allowed) {
    const to = state?.destination || '/choose'
    return to === location.pathname ? children : <Navigate to={to} replace />
  }
  return children
}

/** Login gate for pages that start an ecosystem (onboarding, access requests). The page they
 *  were heading to travels in `state.from`, so the universal login still returns them there. */
export function RequireAccount({ children }) {
  const { isAuthed, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) return <FullSpinner />
  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return children
}

export function RequireAdmin({ children }) {
  const { isAuthed, isAdmin, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) return <FullSpinner />
  if (!isAuthed) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!isAdmin) return <Navigate to="/choose" replace />
  return children
}
