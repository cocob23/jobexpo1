import { supabase } from '@/constants/supabase'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { useRouter } from 'expo-router'
import { Image } from 'react-native'

import { useEffect, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native'

dayjs.locale('es')

export default function TicketsPrincipal() {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    cargarTickets()
  }, [])

  const cargarTickets = async () => {
    if (!refreshing) setLoading(true)

    const { data: userData, error: errorUsuario } = await supabase.auth.getUser()
    if (errorUsuario || !userData?.user) {
      Alert.alert('Error', 'No se pudo obtener el usuario.')
      return
    }

    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('usuario_id', userData.user.id)
      .order('fecha_reporte', { ascending: false })

    if (error) {
      Alert.alert('Error', 'No se pudieron cargar los tickets.')
    } else {
      setTickets(data || [])
    }

    setLoading(false)
    setRefreshing(false)
  }

  const onRefresh = () => {
    setRefreshing(true)
    cargarTickets()
  }

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <Image source={{ uri: item.foto }} style={styles.imagen} />
      <Text style={styles.descripcion}>{item.descripcion}</Text>
      <Text style={styles.fecha}>{dayjs(item.fecha_reporte).format('DD/MM/YYYY - HH:mm')}hs.</Text>
      <Text style={styles.importe}>${item.importe}</Text>
      <Text style={[styles.estado, item.estado === 'Aprobado' ? styles.aprobado : item.estado === 'Desaprobado' ? styles.desaprobado : styles.pendiente]}>
        Estado: {item.estado}
      </Text>
    </View>
  )

  return (
    <View style={styles.container}>
        <Image
        source={require('@/assets/images/logo.png')}
        style={styles.logo}
        />
      <View style={styles.encabezado}>
        
        <Text style={styles.titulo}>Tickets</Text>

        <TouchableOpacity style={styles.boton} onPress={() => router.push('/(mantenimiento)/cargar-ticket')}>
          <Text style={styles.botonTexto}>Cargar Ticket</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1e40af" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
  },
      logo: {
  width: 270,
  height: 90,
  resizeMode: 'contain',
  alignSelf: 'center',
  marginTop: 34,
  marginBottom: 20,
},
  boton: {
    backgroundColor: '#1e40af',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  botonTexto: {
    color: '#fff',
    fontWeight: 'bold',
  },
  card: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  imagen: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  descripcion: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  fecha: {
    fontSize: 14,
    color: '#666',
  },
  importe: {
    fontSize: 16,
    color: '#1e40af',
    fontWeight: 'bold',
    marginTop: 4,
  },
  estado: {
    marginTop: 8,
    fontWeight: 'bold',
  },
  aprobado: {
    color: '#15803d',
  },
  desaprobado: {
    color: '#ef4444',
  },
  pendiente: {
    color: '#f59e0b',
  },
})
