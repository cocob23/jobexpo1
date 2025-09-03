// app/(fm)/lista-tecnicos.tsx
import { supabase } from '@/constants/supabase'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

export default function ListaTecnicos() {
  const [tecnicos, setTecnicos] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [filtrados, setFiltrados] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => { obtenerTecnicos() }, [])

  const obtenerTecnicos = async () => {
    setCargando(true); setErrorMsg(null)
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, rol')
      .in('rol', ['mantenimiento', 'mantenimiento-externo'])
    if (error) { setErrorMsg('No se pudieron cargar los técnicos.'); setTecnicos([]); setFiltrados([]) }
    else { setTecnicos(data || []); setFiltrados(data || []) }
    setCargando(false)
  }

  useEffect(() => {
    const q = busqueda.trim().toLowerCase()
    const filtro = tecnicos.filter((t) => {
      const nombre = (t?.nombre || '').toString().toLowerCase()
      const apellido = (t?.apellido || '').toString().toLowerCase()
      return `${nombre} ${apellido}`.includes(q)
    })
    setFiltrados(filtro)
  }, [busqueda, tecnicos])

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header Back */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnBack}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
          <Text style={styles.btnBackText}>Volver</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.titulo}>Técnicos de mantenimiento</Text>

        <TextInput
          style={styles.input}
          placeholder="Buscar técnico por nombre o apellido"
          value={busqueda}
          onChangeText={setBusqueda}
          placeholderTextColor="#94a3b8"
        />

        {cargando ? (
          <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 20 }} />
        ) : errorMsg ? (
          <Text style={{ color: '#ef4444', marginTop: 12 }}>{errorMsg}</Text>
        ) : filtrados.length === 0 ? (
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: '#64748b' }}>No se encontraron técnicos.</Text>
          </View>
        ) : (
          filtrados.map((tecnico) => (
            <TouchableOpacity
              key={tecnico.id}
              style={styles.card}
              onPress={() => router.push(`/perfil-tecnico?id=${tecnico.id}`)}
              activeOpacity={0.85}
            >
              <Text style={styles.cardNombre}>
                {tecnico.nombre} {tecnico.apellido}
              </Text>
              <Text style={styles.cardRol}>
                {tecnico.rol === 'mantenimiento-externo'
                  ? 'Mantenimiento externo'
                  : 'Mantenimiento'}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  headerRow: {
    paddingHorizontal: 24,
    paddingTop: 40,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnBack: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6b7280',
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 10,
  },
  btnBackText: { color: '#fff', fontWeight: '700', marginLeft: 4 },

  container: { flex: 1, paddingHorizontal: 24, backgroundColor: '#fff' },
  titulo: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#0f172a' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, marginBottom: 16, backgroundColor: '#fff' },
  card: { backgroundColor: '#f3f4f6', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  cardNombre: { fontSize: 16, fontWeight: 'bold', color: '#1e40af' },
  cardRol: { marginTop: 4, color: '#475569' },
})
