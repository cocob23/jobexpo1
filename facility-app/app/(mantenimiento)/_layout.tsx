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
            // recorridos removed from tab bar; accessible via index button
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
  <Tabs.Screen name="planillas" options={{ title: 'Planillas' }} />
    {/* recorridos hidden from tab bar */}
    <Tabs.Screen name="recorridos" options={{ href: null }} />
    {/* marcar-llegada hidden from tab bar */}
    <Tabs.Screen name="marcar-llegada" options={{ href: null }} />
    {/* marcar-salida hidden from tab bar */}
    <Tabs.Screen name="marcar-salida" options={{ href: null }} />
  {/* mis-llegadas hidden from tab bar */}
  <Tabs.Screen name="mis-llegadas" options={{ href: null }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />

      {/* oculta del tab bar, pero accesible vía router.push */}
      <Tabs.Screen
        name="cargar-ticket"
        options={{ href: null }}
      />
    </Tabs>
  )
}
