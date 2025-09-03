import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function IndexFM() {
  const router = useRouter()

  // Acciones rápidas (1 botón por funcionalidad)
  const acciones: { label: string; icon: keyof typeof Ionicons.glyphMap; path: string }[] = [
    { label: 'Asignar Tarea',        icon: 'add-circle-outline',     path: '/(fm)/asignar-tarea' },
    { label: 'Ver Tareas',           icon: 'checkbox-outline',       path: '/(fm)/ver-tareas' },
    { label: 'Agregar Técnico',      icon: 'person-add-outline',     path: '/crear-tecnico' }, // según tu ruta actual
    { label: 'Cotizaciones',         icon: 'calculator-outline',     path: '/(fm)/cotizaciones' },
    { label: 'Técnicos',             icon: 'construct-outline',      path: '/(fm)/tecnicos' },
    { label: 'Llegadas',             icon: 'time-outline',           path: '/(fm)/llegadas' },
    { label: 'Perfil',               icon: 'person-circle-outline',  path: '/(fm)/perfil' },

    // 👇 nuevos (quedan uno al lado del otro en la última fila)
    { label: 'Agregar Empresa/Cliente', icon: 'briefcase-outline',   path: '/(fm)/crear-empresa' },
  ]

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Image source={require('@/assets/images/logo.png')} style={styles.logo} />
        <Text style={styles.titulo}>Panel de Facility Manager</Text>

        {/* Botón principal (elige el que más uses; acá priorizo Ver Tareas) */}
        <TouchableOpacity
          style={styles.botonGrande}
          onPress={() => router.push('/(fm)/ver-tareas')}
          activeOpacity={0.85}
        >
          <Text style={styles.textoBoton}>📋 Ver Tareas Asignadas</Text>
        </TouchableOpacity>

        {/* Accesos rápidos */}
        <View style={styles.grid}>
          {acciones.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={styles.item}
              onPress={() => router.push(a.path)}
              activeOpacity={0.85}
            >
              <Ionicons name={a.icon} size={22} color="#2563EB" />
              <Text style={styles.itemText}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { padding: 24, alignItems: 'center', gap: 14 },
  logo: { width: 180, height: 60, resizeMode: 'contain', marginTop: 8 },
  titulo: { fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  botonGrande: {
    backgroundColor: '#2563EB',
    paddingVertical: 20,
    paddingHorizontal: 36,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
    marginTop: 6,
    marginBottom: 10,
  },
  textoBoton: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },

  grid: {
    width: '100%',
    gap: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingBottom: 20,
  },
  item: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'flex-start',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  itemText: { fontWeight: '600', color: '#0F172A' },
})
