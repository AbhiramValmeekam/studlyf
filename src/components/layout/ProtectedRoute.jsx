import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Spinner } from '../ui/atoms'

export function ProtectedRoute({ children }) {
  const { isAuthed, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="grid min-h-[100svh] place-items-center">
        <Spinner className="h-8 w-8 text-acid" />
      </div>
    )
  }
  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}
