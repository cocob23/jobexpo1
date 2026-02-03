import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { Platform } from 'react-native'

export default function Layout() {
  return (
    <Tabs
      safeAreaInsets={{ bottom: 8 }}
      screenOptions={{
        headerShown: false,                   // 👈 saca el header feo de arriba
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: Platform.select({ ios: 78, android: 64 }),
          paddingTop: 6,
          paddingBottom: Platform.select({ ios: 16, android: 10 }),
        },
        tabBarLabelStyle: { fontSize: 12 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Mi Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />

      {/* Rutas que existen pero NO aparecen en la tab bar */}
      <Tabs.Screen name="mis-llegadas" options={{ href: null }} />
      <Tabs.Screen name="marcar-llegada" options={{ href: null }} />
      <Tabs.Screen name="marcar-salida" options={{ href: null }} />
    </Tabs>
  )
}
