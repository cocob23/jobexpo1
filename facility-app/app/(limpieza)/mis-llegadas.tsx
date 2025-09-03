import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import MapView, { Marker } from 'react-native-maps'
import { supabase } from '../../constants/supabase'

export default function MisLlegadas() {
  const [llegadas, setLlegadas] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    cargarLlegadas()
  }, [])

  const cargarLlegadas = async (showSpinner = true) => {
    try {
      if (showSpinner) setCargando(true)

      const { data: usuarioData } = await supabase.auth.getUser()
      const usuarioId = usuarioData?.user?.id

      if (!usuarioId) {
        setLlegadas([])
        return
      }

      const { data, error } = await supabase
        .from('llegadas')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('fecha', { ascending: false })

      if (error) {
        console.error('Error al traer llegadas:', error)
        setLlegadas([])
      } else {
        setLlegadas(data || [])
      }
    } finally {
      if (showSpinner) setCargando(false)
      if (refreshing) setRefreshing(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await cargarLlegadas(false)
  }

  const abrirEnMaps = (lat: number, lng: number, label?: string | null) => {
    const query = label ? encodeURIComponent(`${label} @${lat},${lng}`) : `${lat},${lng}`
    const url = `https://www.google.com/maps?q=${query}`
    Linking.openURL(url)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Mis llegadas</Text>

      {cargando ? (
        <View style={{ paddingTop: 12 }}>
          <ActivityIndicator />
        </View>
      ) : llegadas.length === 0 ? (
        <Text>No tenés llegadas registradas.</Text>
      ) : (
        <FlatList
          data={llegadas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => {
            const lat = item?.latitud
            const lng = item?.longitud
            const hasCoords = lat != null && lng != null

            // fecha puede venir "YYYY-MM-DD" o con tiempo -> cortamos en "T"
            const fechaMostrada = (item.fecha || '').toString().split('T')[0]

            return (
              <View style={styles.item}>
                <Text style={styles.texto}>📍 {item.lugar || 'Sin lugar'}</Text>
                <Text style={styles.texto}>🕒 {item.hora}</Text>
                <Text style={styles.texto}>📅 {fechaMostrada}</Text>

                {hasCoords ? (
                  <View style={styles.mapBox}>
                    <MapView
                      style={styles.map}
                      pointerEvents="none" // solo visual, no interfiere con el scroll
                      initialRegion={{
                        latitude: Number(lat),
                        longitude: Number(lng),
                        latitudeDelta: 0.005,
                        longitudeDelta: 0.005,
                      }}
                    >
                      <Marker coordinate={{ latitude: Number(lat), longitude: Number(lng) }} />
                    </MapView>

                    <TouchableOpacity
                      onPress={() => abrirEnMaps(Number(lat), Number(lng), item.lugar)}
                      style={styles.mapBtn}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.mapBtnText}>Ver mapa</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={[styles.texto, { color: '#6b7280', marginTop: 6 }]}>
                    (Sin coordenadas)
                  </Text>
                )}
              </View>
            )
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    marginTop: 50,
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  item: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  texto: {
    fontSize: 14,
    marginBottom: 4,
    color: '#0f172a',
  },

  // Mini mapa
  mapBox: {
    marginTop: 10,
    height: 140,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  map: { flex: 1 },
  mapBtn: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  mapBtnText: { color: '#fff', fontWeight: '700' },
})
