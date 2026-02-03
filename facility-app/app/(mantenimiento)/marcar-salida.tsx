import * as Location from 'expo-location'
import { useEffect, useState } from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../../constants/supabase'

export default function MarcarSalidaMantenimientoScreen() {
  const [pendiente, setPendiente] = useState<any | null>(null)
  const [hora, setHora] = useState('')
  const [fechaISO, setFechaISO] = useState('')
  const [latitud, setLatitud] = useState<number | null>(null)
  const [longitud, setLongitud] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [marcando, setMarcando] = useState(false)

  useEffect(() => {
    const ahora = new Date()
  const hh = String(ahora.getHours()).padStart(2, '0')
  const mm = String(ahora.getMinutes()).padStart(2, '0')
  const ss = String(ahora.getSeconds()).padStart(2, '0')
  setHora(`${hh}:${mm}:${ss}`)
  // Guardamos salida_fecha como timestamp completo (ISO) para evitar inconsistencias
  setFechaISO(ahora.toISOString())

    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permiso denegado para acceder a la ubicación')
        return
      }
      const loc = await Location.getCurrentPositionAsync({})
      setLatitud(loc.coords.latitude)
      setLongitud(loc.coords.longitude)
    })()

    ;(async () => {
      setLoading(true)
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) {
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('llegadas')
        .select('id, lugar, fecha, hora')
        .eq('usuario_id', userId)
        .is('salida_hora', null)
        .order('fecha', { ascending: false })
        .limit(1)
      if (!error && data && data.length > 0) setPendiente(data[0])
      setLoading(false)
    })()
  }, [])

  const marcarSalida = async () => {
    if (!pendiente) return
    if (latitud == null || longitud == null) {
      Alert.alert('Ubicación', 'Aún no se obtuvo la ubicación. Intentá de nuevo en unos segundos.')
      return
    }
    setMarcando(true)
    // obtener userId para reforzar el filtro de UPDATE (útil con RLS)
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id
    const { error } = await supabase
      .from('llegadas')
      .update({
        // Si la columna es TIMESTAMP, este ISO completo funciona.
        // Si fuera DATE, el backend truncará la parte de tiempo.
        salida_fecha: fechaISO,
        salida_hora: hora,
        salida_latitud: latitud,
        salida_longitud: longitud,
      })
      .eq('id', pendiente.id)
      .eq('usuario_id', userId || '')
      .is('salida_hora', null)
      

    setMarcando(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      // Verificar luego del update con un SELECT por ID (sin depender de la forma de respuesta del UPDATE)
      const { data: verif, error: vErr } = await supabase
        .from('llegadas')
        .select('id, salida_hora')
        .eq('id', pendiente.id)
        .single()

      if (vErr) {
        Alert.alert('Error', vErr.message)
        setMarcando(false)
        return
      }
      if (!verif?.salida_hora) {
        Alert.alert('Error', 'No se pudo registrar la salida. Verificá permisos de actualización en Supabase (RLS).')
        setMarcando(false)
        return
      }
      Alert.alert('Salida registrada ✅')
      router.back()
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backBtnText}>◀ Volver</Text>
      </TouchableOpacity>

      <Text style={styles.titulo}>Marcar salida</Text>
      {loading ? (
        <Text>Cargando...</Text>
      ) : !pendiente ? (
        <Text style={{ color: '#475569' }}>No tenés una llegada pendiente de salida.</Text>
      ) : (
        <View style={styles.card}>
          <Text style={{ fontWeight: '700', color: '#0f172a' }}>{pendiente.lugar}</Text>
          <Text style={{ color: '#334155', marginTop: 4 }}>📅 {String(pendiente.fecha).split('T')[0]} · 🕒 {pendiente.hora}</Text>
          <Text style={{ color: '#334155', marginTop: 4 }}>Salida ahora: {hora}</Text>
          <Text style={{ color: '#334155' }}>
            Ubicación: {latitud != null && longitud != null ? `${latitud.toFixed(5)}, ${longitud.toFixed(5)}` : 'obteniendo...'}
          </Text>
          <TouchableOpacity style={styles.boton} onPress={marcarSalida} disabled={marcando}>
            <Text style={styles.botonTexto}>{marcando ? 'Guardando...' : 'Marcar salida'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  titulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  card: { backgroundColor: '#f1f5f9', borderRadius: 12, padding: 16 },
  boton: { backgroundColor: '#1e40af', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  botonTexto: { color: '#fff', fontWeight: '700' },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#eef2ff', marginBottom: 12 },
  backBtnText: { color: '#1e40af', fontWeight: '600' },
})
