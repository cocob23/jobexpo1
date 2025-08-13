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

        if (error) {
          console.log('Error RLS/SELECT usuarios:', error)
          // No cierres sesión por esto; mostrás login solo si realmente no hay sesión.
          setRedirect('/login')
          return
        }

        const rol = perfil?.rol

        if (rol === 'limpieza') setRedirect('/(limpieza)')
        else if (rol === 'mantenimiento') setRedirect('/(mantenimiento)')
        else if (rol === 'mantenimiento-externo') setRedirect('/(mantenimiento-externo)')
        else if (rol === 'fm') setRedirect('/(fm)')
        else if (rol === 'superadmin') setRedirect('/(superadmin)')
        else if (rol === 'comercial') setRedirect('/(ejecutivo-comercial)')
        else setRedirect('/login')
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
