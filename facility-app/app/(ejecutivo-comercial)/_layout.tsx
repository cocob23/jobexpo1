// app/(ejecutiva)/_layout.tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

export default function LayoutEjecutiva() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#1E90FF',
        tabBarInactiveTintColor: 'gray',
        tabBarIcon: ({ color, size }) => {
          let iconName: any

          if (route.name === 'index') iconName = 'home'
          else if (route.name === 'subir-notis') iconName = 'cloud-upload'
          else if (route.name === 'perfil') iconName = 'person-circle'

          return <Ionicons name={iconName} size={size} color={color} />
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="subir-notis" options={{ title: 'Subir Notis' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  )
}
