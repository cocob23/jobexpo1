import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Platform } from 'react-native'

export default function SuperadminTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
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
      {/* --- pestañas visibles --- */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="crear-usuario"
        options={{
          title: 'Usuarios',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-add-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: 'Tickets',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cotizaciones"
        options={{
          title: 'Cotizaciones',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calculator-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />

      {/* --- rutas ocultas (no aparecen en la tab bar) --- */}
      <Tabs.Screen name="inventario" options={{ href: null }} />
      <Tabs.Screen name="tecnicos" options={{ href: null }} />
      <Tabs.Screen name="ver-tareas" options={{ href: null }} />
      <Tabs.Screen name="llegadas" options={{ href: null }} />
      <Tabs.Screen name="asignar-tarea" options={{ href: null }} />
      <Tabs.Screen name="detalle-tarea-fm" options={{ href: null }} />
      <Tabs.Screen name="detalle-tarea-mantenimiento" options={{ href: null }} />
    </Tabs>
  )
}
