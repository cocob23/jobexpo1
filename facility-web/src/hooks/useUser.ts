// src/hooks/useUser.ts
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useUser() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        const { data: perfil, error } = await supabase
          .from('usuarios')
          .select('rol')
          .eq('auth_id', session.user.id)
          .single()

        if (!error && perfil) {
          setUser({ ...session.user, rol: perfil.rol })
        } else {
          setUser(session.user) // fallback
        }
      } else {
        setUser(null)
      }

      setLoading(false)
    }

    getUser()
  }, [])

  return { user, loading }
}
