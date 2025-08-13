// src/components/ProtectedRoute.tsx
import { ReactElement, useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useUser } from '../hooks/useUser'
import { supabase } from '../lib/supabase'

type Props = {
  children: ReactElement
  /** Opcional: lista de roles permitidos (e.g., ['fm', 'superadmin', 'mantenimiento']) */
  roles?: string[]
}

export default function ProtectedRoute({ children, roles }: Props) {
  const location = useLocation()
  const { user, loading } = useUser()
  const [roleCheckLoading, setRoleCheckLoading] = useState<boolean>(!!roles?.length)
  const [allowedByRole, setAllowedByRole] = useState<boolean>(false)

  const needsRoleCheck = useMemo(() => Array.isArray(roles) && roles.length > 0, [roles])

  useEffect(() => {
    let cancelled = false

    const checkRole = async () => {
      if (!needsRoleCheck) {
        setAllowedByRole(true)
        setRoleCheckLoading(false)
        return
      }
      if (!user?.id) {
        setAllowedByRole(false)
        setRoleCheckLoading(false)
        return
      }
      setRoleCheckLoading(true)
      const { data, error } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', user.id)
        .single()

      if (cancelled) return

      if (error || !data?.rol) {
        setAllowedByRole(false)
      } else {
        setAllowedByRole(roles!.includes(data.rol))
      }
      setRoleCheckLoading(false)
    }

    checkRole()
    return () => { cancelled = true }
  }, [user?.id, needsRoleCheck, roles])

  // Cargando sesión (hook)
  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '50vh', fontFamily: 'system-ui' }}>
        Cargando…
      </div>
    )
  }

  // No logueado → a login con returnTo
  if (!user) {
    return <Navigate to="/login" replace state={{ returnTo: location.pathname + location.search }} />
  }

  // Si hay restricción de roles, esperar verificación
  if (roleCheckLoading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '50vh', fontFamily: 'system-ui' }}>
        Verificando permisos…
      </div>
    )
  }

  // Usuario logueado pero sin rol permitido
  if (needsRoleCheck && !allowedByRole) {
    return <Navigate to="/login" replace />
  }

  return children
}
