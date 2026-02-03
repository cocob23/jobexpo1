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
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { supabase } from '../../constants/supabase'

export default function MisLlegadas() {
  const router = useRouter()
  const [llegadas, setLlegadas] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    cargarLlegadas()
  }, [])

  const cargarLlegadas = async (showSpinner = true) => {
    try {
      if (showSpinner) setCargando(true)

      // ⚠️ getSession en lugar de getUser (evita “logout” al refrescar)
      const { data } = await supabase.auth.getSession()
      const usuarioId = data?.session?.user?.id

      if (!usuarioId) {
        setLlegadas([])
        return
      }

      const { data: rows, error } = await supabase
        .from('llegadas')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('fecha', { ascending: false })

      if (error) {
        console.error('Error al traer llegadas:', error)
        setLlegadas([])
      } else {
        setLlegadas(rows || [])
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

  const calcularDuracionMin = (l: any): number | null => {
    const fIn = l?.fecha
    const hIn = l?.hora
    const fOut = l?.salida_fecha
    const hOut = l?.salida_hora
    if (!fIn || !hIn || !fOut || !hOut) return null
    try {
      const inDate = new Date(String(fIn).split('T')[0] + 'T' + hIn)
      const outDate = new Date(String(fOut).split('T')[0] + 'T' + hOut)
      const diff = outDate.getTime() - inDate.getTime()
      if (!Number.isFinite(diff)) return null
      const mins = Math.round(diff / 60000)
      return mins < 0 ? null : mins
    } catch {
      return null
    }
  }

  return (
    <View style={styles.container}>
      {/* Header con botón atrás */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnBack}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
          <Text style={styles.btnBackText}>Volver</Text>
        </TouchableOpacity>
      </View>

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
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => {
            const lat = item?.latitud
            const lng = item?.longitud
            const hasCoords = lat != null && lng != null
            const fechaMostrada = (item.fecha || '').toString().split('T')[0]
            const tarde = item?.tarde === true
            const salidaLat = item?.salida_latitud
            const salidaLng = item?.salida_longitud
            const hasSalidaCoords = salidaLat != null && salidaLng != null
            const salidaFecha = (item.salida_fecha || '')?.toString().split('T')[0]
            const dur = calcularDuracionMin(item)

            return (
              <View style={styles.item}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.texto}>📍 {item.lugar || 'Sin lugar'}</Text>
                  {tarde && (
                    <View style={styles.badgeTarde}>
                      <Ionicons name="alert" size={14} color="#b91c1c" />
                      <Text style={styles.badgeTardeText}>Tarde</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.texto}>🕒 {item.hora}</Text>
                <Text style={styles.texto}>📅 {fechaMostrada}</Text>
                {dur != null && (
                  <View style={styles.badgeDuration}>
                    <Text style={styles.badgeDurationText}>Duración: {dur} min</Text>
                  </View>
                )}

                {hasCoords ? (
                  <>
                    <Text style={[styles.texto, { color: '#6b7280', marginTop: 6 }]}>
                      {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => abrirEnMaps(Number(lat), Number(lng), item.lugar)}
                      style={[styles.mapBtn, { alignSelf: 'flex-start', marginTop: 8 }]}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.mapBtnText}>Ver mapa</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text style={[styles.texto, { color: '#6b7280', marginTop: 6 }]}>
                    (Sin coordenadas)
                  </Text>
                )}

                {/* Sección de salida */}
                <View style={styles.salidaBox}>
                  <Text style={styles.subtitulo}>Salida</Text>
                  {item?.salida_hora ? (
                    <>
                      <Text style={styles.texto}>🕒 {item.salida_hora}</Text>
                      <Text style={styles.texto}>📅 {salidaFecha}</Text>
                      {hasSalidaCoords ? (
                        <>
                          <Text style={[styles.texto, { color: '#6b7280', marginTop: 6 }]}> 
                            {Number(salidaLat).toFixed(5)}, {Number(salidaLng).toFixed(5)}
                          </Text>
                          <TouchableOpacity
                            onPress={() => abrirEnMaps(Number(salidaLat), Number(salidaLng), item.lugar)}
                            style={[styles.mapBtn, { alignSelf: 'flex-start', marginTop: 8 }]}
                            activeOpacity={0.9}
                          >
                            <Text style={styles.mapBtnText}>Ver mapa salida</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <Text style={[styles.texto, { color: '#6b7280', marginTop: 6 }]}> (Sin coordenadas de salida)</Text>
                      )}
                    </>
                  ) : (
                    <Text style={{ color: '#b91c1c', fontWeight: '700', marginTop: 6 }}>Pendiente de salida</Text>
                  )}
                </View>
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
    paddingTop: 70, // deja lugar para el botón
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    marginBottom: 6,
  },
  btnBack: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6b7280',
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 10,
  },
  btnBackText: { color: '#fff', fontWeight: '700', marginLeft: 4 },

  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#0f172a',
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
  mapBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  mapBtnText: { color: '#fff', fontWeight: '700' },
  badgeTarde: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    height: 24,
    borderRadius: 999,
    columnGap: 4,
  },
  badgeTardeText: {
    color: '#b91c1c',
    fontWeight: '700',
    fontSize: 12,
  },
  subtitulo: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginTop: 10, marginBottom: 4 },
  salidaBox: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  badgeDuration: { alignSelf: 'flex-start', backgroundColor: '#e0f2fe', borderRadius: 999, paddingHorizontal: 10, height: 22, justifyContent: 'center', marginTop: 4 },
  badgeDurationText: { color: '#0369a1', fontWeight: '700', fontSize: 12 },
})