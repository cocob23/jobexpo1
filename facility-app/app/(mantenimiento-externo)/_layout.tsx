import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'

export default function Layout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
            index: 'home',
            tareas: 'checkmark-circle',
            tickets: 'document-text',
            inventario: 'clipboard',
            perfil: 'person-circle-outline',
          }

          const iconName = iconMap[route.name] || 'alert'
          return <Ionicons name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: '#1e40af',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="tareas" options={{ title: 'Tareas' }} />
      <Tabs.Screen name="tickets" options={{ title: 'Tickets' }} />
      <Tabs.Screen name="inventario" options={{ title: 'Inventario' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
      <Tabs.Screen name="planillas" options={{ title: 'Planillas' }} />


      {/* oculta del tab bar, pero accesible vía router.push */}
      <Tabs.Screen
        name="cargar-ticket"
        options={{ href: null }}
      />
    </Tabs>
  )
}
