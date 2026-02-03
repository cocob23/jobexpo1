// app/layout.tsx
import 'react-native-reanimated'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Stack, Redirect, usePathname } from 'expo-router'
import { supabase } from '@/constants/supabase'

export default function RootLayout() {
  const [ready, setReady] = useState(false)
  const [isLogged, setIsLogged] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    // cargar sesión persistida al inicio
    supabase.auth.getSession().then(({ data }) => {
      setIsLogged(!!data.session)
      setReady(true)
    })
    // escuchar login/logout/refresh
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsLogged(!!session)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // pantalla de carga mínima mientras leemos la sesión
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    )
  }

  // rutas públicas que NO requieren sesión
  const publicRoutes = ['/login', '/recuperar', '/verificar-codigo', '/nueva-password']
  const isPublic = publicRoutes.includes(pathname)

  // si no hay sesión y la ruta no es pública ➜ mandá al login
  if (!isLogged && !isPublic) {
    return <Redirect href="/login" />
  }

  return <Stack screenOptions={{ headerShown: false }} />
}
