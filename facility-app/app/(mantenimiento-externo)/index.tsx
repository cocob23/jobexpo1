// pantalla principal del técnico de mantenimiento con tareas organizadas por fecha y pull to refresh
import { supabase } from '@/constants/supabase'
import dayjs from 'dayjs'
import { Image } from 'react-native'

import 'dayjs/locale/es'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

dayjs.locale('es')

export default function IndexMantenimiento() {
  const [usuario, setUsuario] = useState<any>(null)
  const [tareas, setTareas] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    obtenerUsuario()
    obtenerTareas()
  }, [])

  const obtenerUsuario = async () => {
    const { data } = await supabase.auth.getUser()
    setUsuario(data?.user)
  }

  const obtenerTareas = async () => {
    if (!refreshing) setCargando(true)

    const { data, error } = await supabase
      .from('trabajos_mantenimiento')
      .select('*')
      .eq('usuario_id', (await supabase.auth.getUser()).data?.user?.id)
      .order('fecha_realizacion', { ascending: true })

    if (!error) setTareas(data || [])
    setCargando(false)
    setRefreshing(false)
  }

  const onRefresh = () => {
    setRefreshing(true)
    obtenerTareas()
  }

  const hoy = dayjs()
  const finDeSemana = hoy.endOf('week')

  const tareasHoy = tareas.filter(t => dayjs(t.fecha_realizacion).isSame(hoy, 'day'))
  const tareasSemana = tareas.filter(t =>
    !dayjs(t.fecha_realizacion).isSame(hoy, 'day') &&
    dayjs(t.fecha_realizacion).isBefore(finDeSemana)
  )
  const tareasFuturas = tareas.filter(t => dayjs(t.fecha_realizacion).isAfter(finDeSemana))

  const Seccion = ({ titulo, lista }: { titulo: string, lista: any[] }) => (
    <View style={styles.seccionContenedor}>
      <Text style={styles.seccionTitulo}>{titulo}</Text>
      {lista.length === 0 ? (
        <Text style={{ color: '#666', marginLeft: 12 }}>Sin tareas</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {lista.map((tarea, index) => (
            <TouchableOpacity
              key={index}
              style={styles.card}
              onPress={() => router.push(`/detalle-tarea-mantenimiento?id=${tarea.id}`)}
            >
              <Text style={styles.cardTitulo}>{tarea.empresa}</Text>
              <Text>{tarea.descripcion}</Text>
              
              <Text style={styles.cardDireccion}>{tarea.direccion}</Text>
              <Text
                style={[
                styles.cardEstado,
                tarea.estado === 'Pendiente' && { color: '#dc2626' }, // rojo
                 tarea.estado === 'Realizado' && { color: '#16a34a' }  // verde
               ]}
              >
  {tarea.estado}
</Text>
              <Text style={styles.cardFecha}>
                {dayjs(tarea.fecha_realizacion).format('DD/MM HH:mm')}hs.
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  )

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Image
        source={require('@/assets/images/logo.png')}
        style={styles.logo}
      />
      <Text style={styles.subtitulo}>Inicio</Text>

      {cargando ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 20 }} />
      ) : (
        <>
          <Seccion titulo="Hoy" lista={tareasHoy} />
          <Seccion titulo="Esta semana" lista={tareasSemana} />
          <Seccion titulo="Próximas" lista={tareasFuturas} />
        </>
      )}

      <TouchableOpacity
        style={styles.cardExtra}
        onPress={() => router.push('/(mantenimiento)/tickets')}
      >
        <Text style={styles.cardTexto}>Cargar un ticket</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cardExtra}
        onPress={() => router.push('/(mantenimiento)/inventario')}
      >
        <Text style={styles.cardTexto}>Ver inventario personal</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cardExtra}
        onPress={() => router.push('/(mantenimiento-externo)/recorridos')}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.cardTexto}>Recorridos</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cardExtra}
        onPress={() => router.push('/(mantenimiento-externo)/marcar-llegada')}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.cardTexto}>Marcar llegada</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cardExtra}
        onPress={() => router.push('/(mantenimiento-externo)/marcar-salida' as any)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.cardTexto}>Marcar salida</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 30,
    marginBottom: 30
  },
  subtitulo: {
    fontSize: 24,
    marginBottom: 16,
    color: '#666',
  },
  seccionContenedor: {
    marginBottom: 24,
  },
  seccionTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  logo: {
  width: 270,
  height: 90,
  resizeMode: 'contain',
  alignSelf: 'center',
  marginTop: 34,
  marginBottom: 20,
},

  card: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 10,
    marginRight: 12,
    width: 220,
  },
  cardDireccion: {
  fontSize: 13,
  color: '#444',
  marginTop: 4,
},
  cardTitulo: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  cardFecha: {
    marginTop: 8,
    fontSize: 13,
    color: '#2563EB',
  },
  cardExtra: {
    backgroundColor: '#e0f2fe',
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
  },
cardEstado: {
  fontWeight: 'bold',
  marginTop: 4
},

  cardTexto: {
    fontSize: 16,
    color: '#0369a1',
    fontWeight: 'bold',
  },
})