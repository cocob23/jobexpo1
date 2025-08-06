// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom'
import { useUser } from '../hooks/useUser'

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useUser()

  if (loading) return <p>Cargando...</p>
  if (!user) return <Navigate to="/login" />

  return children
}
