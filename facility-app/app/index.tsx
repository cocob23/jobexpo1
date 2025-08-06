import { supabase } from '@/constants/supabase'
import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'

export default function Index() {
  const [checking, setChecking] = useState(true)
  const [redirect, setRedirect] = useState<string | null>(null)

  useEffect(() => {
    const validarSesion = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const { data: userData } = await supabase.auth.getUser()

        const user = userData?.user

        if (!session || !user) {
          await supabase.auth.signOut()
          setRedirect('/login')
          return
        }

        const { data: perfil, error } = await supabase
          .from('usuarios')
          .select('rol')
          .eq('id', user.id)
          .single()

        if (perfil?.rol === 'limpieza') setRedirect('/(limpieza)')
        else if (perfil?.rol === 'mantenimiento') setRedirect('/(mantenimiento)')
        else if (perfil?.rol === 'fm') setRedirect('/(fm)')
        else if (perfil?.rol === 'superadmin') setRedirect('/(superadmin)')
        else {
          await supabase.auth.signOut()
          setRedirect('/login')
        }
      } catch (err) {
        console.error('Error validando sesión', err)
        await supabase.auth.signOut()
        setRedirect('/login')
      } finally {
        setChecking(false)
      }
    }

    validarSesion()
  }, [])

  if (checking || !redirect) return null

  return <Redirect href={redirect} />
}
