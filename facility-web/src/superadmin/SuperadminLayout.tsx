// src/superadmin/SuperadminLayout.tsx
import { Outlet, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase' // asegurate que esto apunta bien

export default function SuperadminLayout() {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    const validar = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const { data: userData } = await supabase.auth.getUser()
      const user = userData?.user

      if (!session || !user) {
        setAuthorized(false)
        setLoading(false)
        return
      }

      const { data: perfil } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', user.id)
        .single()

      if (perfil?.rol === 'superadmin') {
        setAuthorized(true)
      } else {
        setAuthorized(false)
      }

      setLoading(false)
    }

    validar()
  }, [])

  if (loading) return <div>Cargando...</div>
  if (!authorized) return <Navigate to="/login" />

  return <Outlet />
}
