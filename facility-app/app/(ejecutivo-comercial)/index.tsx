import { useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Linking,
} from 'react-native'
import { supabase } from '@/constants/supabase'
import { router } from 'expo-router'

export default function EjecutivaInicio() {
  const [notis, setNotis] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('todos')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    obtenerNotis()
  }, [])

  const obtenerNotis = async () => {
    const { data, error } = await supabase
      .from('notis')
      .select('*')
      .order('id', { ascending: true })

    if (!error) setNotis(data || [])
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await obtenerNotis()
    setRefreshing(false)
  }

  const abrirPDF = async (url: string) => {
    if (!url) {
      alert('Esta noti no tiene PDF')
      return
    }

    const supported = await Linking.canOpenURL(url)
    if (supported) {
      await Linking.openURL(url)
    } else {
      alert('No se pudo abrir el PDF')
    }
  }

  const notisFiltradas = notis.filter(n => {
    const coincideId = n.id.toString().includes(busqueda.trim())
    const coincideEstado = estadoFiltro === 'todos' || n.estado === estadoFiltro
    return coincideId && coincideEstado
  })

  const renderNoti = ({ item }: { item: any }) => (
    <View style={styles.notiCard}>
      <Text style={styles.notiTitulo}>#{item.id} - {item.titulo}</Text>
      <Text style={styles.notiEstado}>Estado: {item.estado}</Text>
      <TouchableOpacity style={styles.botonVer} onPress={() => abrirPDF(item.archivo_url)}>
        <Text style={styles.botonVerTexto}>Ver PDF</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Listado de Notis</Text>

      <TextInput
        placeholder="Buscar por ID"
        value={busqueda}
        onChangeText={setBusqueda}
        keyboardType="numeric"
        style={styles.inputBusqueda}
      />

      <View style={styles.filtrosEstado}>
        {['todos', 'pendiente', 'aprobado', 'desaprobado'].map((estado) => (
          <TouchableOpacity
            key={estado}
            style={[
              styles.filtroBoton,
              estadoFiltro === estado && styles.filtroActivo,
            ]}
            onPress={() => setEstadoFiltro(estado)}
          >
            <Text
              style={[
                styles.filtroTexto,
                estadoFiltro === estado && styles.filtroTextoActivo,
              ]}
            >
              {estado}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={notisFiltradas}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderNoti}
        ListEmptyComponent={<Text style={{ textAlign: 'center' }}>No hay notis.</Text>}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <TouchableOpacity style={styles.boton} onPress={() => router.push('/subir-notis')}>
        <Text style={styles.botonTexto}>Subir nueva noti</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 60,
    flex: 1,
    backgroundColor: '#fff',
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  inputBusqueda: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 16,
  },
  filtrosEstado: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  filtroBoton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#999',
  },
  filtroActivo: {
    backgroundColor: '#1e40af',
    borderColor: '#1e40af',
  },
  filtroTexto: {
    fontSize: 14,
    color: '#333',
  },
  filtroTextoActivo: {
    color: '#fff',
    fontWeight: 'bold',
  },
  notiCard: {
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginBottom: 10,
  },
  notiTitulo: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  notiEstado: {
    color: '#4b5563',
    marginTop: 4,
    marginBottom: 8,
  },
  botonVer: {
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  botonVerTexto: {
    color: '#fff',
    fontWeight: 'bold',
  },
  boton: {
    marginTop: 10,
    backgroundColor: '#1e40af',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  botonTexto: {
    color: '#fff',
    fontWeight: 'bold',
  },
})
