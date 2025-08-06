import { supabase } from '@/constants/supabase'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

dayjs.locale('es')

export default function VerTareasFM() {
  const [tareas, setTareas] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filtro, setFiltro] = useState<'Pendiente' | 'Realizado'>('Pendiente')
  const router = useRouter()

  useEffect(() => {
    obtenerTareasAsignadas()
  }, [filtro])

 const obtenerTareasAsignadas = async () => {
  if (!refreshing) setCargando(true)

  const { data: usuarioActual } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('trabajos_mantenimiento')
    .select(`
      id,
      descripcion,
      estado,
      empresa,
      fecha_realizacion,
      usuarios:usuario_id (
        nombre,
        apellido
      )
    `)
    .eq('fm_id', usuarioActual?.user?.id)
    .eq('estado', filtro)
    .order('fecha_realizacion', { ascending: true })

  if (error) {
    Alert.alert('Error', 'No se pudieron cargar las tareas.')
  } else {
    setTareas(data || [])
  }

  setCargando(false)
  setRefreshing(false)
}


  const onRefresh = () => {
    setRefreshing(true)
    obtenerTareasAsignadas()
  }

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/detalle-tarea-fm?id=${item.id}`)}
    >
      <Text style={styles.nombreEmpleado}>
        {item.usuarios?.nombre} {item.usuarios?.apellido}
      </Text>
      <Text style={styles.descripcion}>{item.descripcion}</Text>
      <Text style={styles.empresa}>{item.empresa}</Text>
      <Text style={styles.fecha}>
        {dayjs(item.fecha_realizacion).format('DD/MM - HH:mm')}hs.
      </Text>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <Text style={styles.tituloPantalla}>Tareas Asignadas</Text>

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
        data={tareas}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 80 }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  tituloPantalla: {
    marginTop: 30,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  filtros: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 12,
  },
  botonFiltro: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  botonActivo: {
    backgroundColor: '#2563EB',
  },
  textoFiltro: {
    color: '#2563EB',
    fontWeight: 'bold',
  },
  textoActivo: {
    color: '#fff',
    fontWeight: 'bold',
  },
  card: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  nombreEmpleado: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  descripcion: {
    fontSize: 15,
    marginBottom: 4,
  },
  empresa: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 4,
    color: '#444',
  },
  fecha: {
    fontSize: 14,
    color: '#1e40af',
    fontWeight: 'bold',
  },
})
