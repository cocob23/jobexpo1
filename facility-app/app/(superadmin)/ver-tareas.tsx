// (tu ruta) VerTareasSuperadmin.tsx
import { supabase } from '@/constants/supabase'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

dayjs.locale('es')

export default function VerTareasSuperadmin() {
  const [tareas, setTareas] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filtro, setFiltro] = useState<'Pendiente' | 'Realizado'>('Pendiente')
  const [busquedaFM, setBusquedaFM] = useState('')
  const router = useRouter()

  useEffect(() => { obtenerTareas() }, [filtro])

  const obtenerTareas = async () => {
    if (!refreshing) setCargando(true)
    const { data, error } = await supabase
      .from('trabajos_mantenimiento')
      .select(`
        id,
        descripcion,
        estado,
        empresa,
        fecha_realizacion,
        usuarios:usuario_id ( nombre, apellido ),
        asignador:fm_id ( nombre, apellido )
      `)
      .eq('estado', filtro)
      .order('fecha_realizacion', { ascending: true })

    if (error) { Alert.alert('Error', 'No se pudieron cargar las tareas.'); setTareas([]) }
    else { setTareas(data || []) }

    setCargando(false); setRefreshing(false)
  }

  const onRefresh = () => { setRefreshing(true); obtenerTareas() }

  const tareasFiltradas = useMemo(() => {
    const q = busquedaFM.trim().toLowerCase()
    if (!q) return tareas
    return tareas.filter((t) => {
      const nom = (t?.asignador?.nombre || '').toString().toLowerCase()
      const ape = (t?.asignador?.apellido || '').toString().toLowerCase()
      return `${nom} ${ape}`.includes(q)
    })
  }, [tareas, busquedaFM])

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/detalle-tarea-mantenimiento?id=${item.id}`)}
      activeOpacity={0.85}
    >
      <Text style={styles.nombreEmpleado}>
        Técnico: {item.usuarios?.nombre} {item.usuarios?.apellido}
      </Text>

      <Text style={styles.asignador}>
        Asignado por: {item.asignador?.nombre} {item.asignador?.apellido}
      </Text>

      <Text style={styles.descripcion}>{item.descripcion}</Text>
      <Text style={styles.empresa}>{item.empresa}</Text>
      <Text style={styles.fecha}>
        {dayjs(item.fecha_realizacion).format('DD/MM - HH:mm')}hs.
      </Text>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header Back */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnBack}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
          <Text style={styles.btnBackText}>Volver</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        <Text style={styles.tituloPantalla}>Tareas Asignadas (Superadmin)</Text>

        <TextInput
          style={styles.input}
          value={busquedaFM}
          onChangeText={setBusquedaFM}
          placeholder="Filtrar por FM (nombre o apellido)"
          placeholderTextColor="#94a3b8"
        />

        <View style={styles.filtros}>
          <TouchableOpacity
            style={[styles.botonFiltro, filtro === 'Pendiente' && styles.botonActivo]}
            onPress={() => setFiltro('Pendiente')}
          >
            <Text style={filtro === 'Pendiente' ? styles.textoActivo : styles.textoFiltro}>
              Pendientes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.botonFiltro, filtro === 'Realizado' && styles.botonActivo]}
            onPress={() => setFiltro('Realizado')}
          >
            <Text style={filtro === 'Realizado' ? styles.textoActivo : styles.textoFiltro}>
              Realizadas
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={tareasFiltradas}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 80 }}
          ListEmptyComponent={
            !cargando ? (
              <Text style={{ textAlign: 'center', color: '#64748b', marginTop: 16 }}>
                No hay tareas {busquedaFM ? 'que coincidan con la búsqueda' : 'para mostrar'}.
              </Text>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  headerRow: {
    paddingHorizontal: 20,
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

  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  tituloPantalla: { fontSize: 22, fontWeight: 'bold', marginBottom: 12, color: '#0f172a' },

  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, marginBottom: 12, backgroundColor: '#fff' },
  filtros: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16, gap: 12 },
  botonFiltro: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#2563EB' },
  botonActivo: { backgroundColor: '#2563EB' },
  textoFiltro: { color: '#2563EB', fontWeight: 'bold' },
  textoActivo: { color: '#fff', fontWeight: 'bold' },

  card: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 16, marginBottom: 14, backgroundColor: '#fff' },
  nombreEmpleado: { fontSize: 15, fontWeight: 'bold', marginBottom: 4, color: '#111827' },
  asignador: { fontSize: 14, marginBottom: 6, color: '#334155' },
  descripcion: { fontSize: 15, marginBottom: 6, color: '#111827' },
  empresa: { fontSize: 14, fontStyle: 'italic', marginBottom: 6, color: '#475569' },
  fecha: { fontSize: 14, color: '#1e40af', fontWeight: 'bold' },
})
