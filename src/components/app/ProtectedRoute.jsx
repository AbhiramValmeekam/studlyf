import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/**
 * ProtectedRoute — represents the "controlled access" for the Investor & HR
 * portals. If nobody is signed in, redirect to that portal's login. Auth is
 * fake (any credentials pass) — this only demonstrates the gated flow.
 */
export function ProtectedRoute({ loginPath = '/login' }) {
  const { role } = useAuth()
  if (!role) return <Navigate to={loginPath} replace />
  return <Outlet />
}
