import { supabase } from '@/constants/supabase'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'

export default function Inventario() {
  const [herramientas, setHerramientas] = useState<any[]>([])
  const [vestimenta, setVestimenta] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    cargarInventario()
  }, [])

  const cargarInventario = async () => {
    if (!refreshing) setCargando(true)

    const { data: userData, error: errorUsuario } = await supabase.auth.getUser()
    if (errorUsuario || !userData?.user) {
      Alert.alert('Error', 'No se pudo obtener el usuario.')
      return
    }

    const usuarioId = userData.user.id

    const { data: inventarioData, error } = await supabase
      .from('inventario')
      .select('*')
      .eq('usuario_id', usuarioId)

    if (error) {
      Alert.alert('Error', 'No se pudo cargar el inventario.')
      return
    }

    const herramientasFiltradas =
      inventarioData?.filter(item => item.tipo === 'herramienta') || []
    const vestimentaFiltrada =
      inventarioData?.filter(item => item.tipo === 'vestimenta') || []

    setHerramientas(herramientasFiltradas)
    setVestimenta(vestimentaFiltrada)
    setCargando(false)
    setRefreshing(false)
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await cargarInventario()
  }

  if (cargando && !refreshing) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Image
        source={require('@/assets/images/logo.png')}
        style={styles.logo}
      />

      <Text style={styles.titulo}>Inventario Personal</Text>

      <Text style={styles.subtitulo}>Herramientas</Text>
      <View style={styles.lista}>
        {herramientas.length === 0 ? (
          <Text style={styles.vacio}>No tenés herramientas asignadas.</Text>
        ) : (
          herramientas.map((item) => (
            <View key={item.id} style={styles.cardHerramienta}>
              <Text style={styles.icono}>🛠️</Text>
              <View>
                <Text style={styles.itemDescripcion}>{item.descripcion}</Text>
                <Text style={styles.itemCantidad}>Cantidad: {item.cantidad}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <Text style={styles.subtitulo}>Vestimenta</Text>
      <View style={styles.lista}>
        {vestimenta.length === 0 ? (
          <Text style={styles.vacio}>No tenés vestimenta asignada.</Text>
        ) : (
          vestimenta.map((item) => (
            <View key={item.id} style={styles.cardVestimenta}>
              <Text style={styles.icono}>👕</Text>
              <View>
                <Text style={styles.itemDescripcion}>{item.descripcion}</Text>
                <Text style={styles.itemCantidad}>Cantidad: {item.cantidad}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  logo: {
    width: 270,
    height: 90,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  subtitulo: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
    color: '#1e3a8a',
  },
  vacio: {
    fontSize: 14,
    color: '#666',
    paddingLeft: 8,
  },
  lista: {
    gap: 12,
    marginBottom: 20,
  },
  cardHerramienta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    padding: 12,
    gap: 12,
  },
  cardVestimenta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    borderRadius: 10,
    padding: 12,
    gap: 12,
  },
  icono: {
    fontSize: 28,
  },
  itemDescripcion: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemCantidad: {
    fontSize: 14,
    color: '#555',
  },
})
