// pantalla de Recorridos: iniciar/finalizar y cargar km manuales
import { supabase } from '@/constants/supabase'
import * as Location from 'expo-location'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { router } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

dayjs.locale('es')

type Recorrido = {
  id: string
  iniciado_en: string | null
  inicio_latitude: number | null
  inicio_longitude: number | null
  finalizado_en: string | null
  fin_latitude: number | null
  fin_longitude: number | null
  km_manual: number | null
  estado: 'iniciado' | 'finalizado' | null
}

export default function RecorridosMantenimiento() {
  const [uid, setUid] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [reciente, setReciente] = useState<Recorrido | null>(null)
  const [historial, setHistorial] = useState<Recorrido[]>([])
  const [kmText, setKmText] = useState('')

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser()
      const id = data?.user?.id ?? null
      setUid(id)
      await cargarEstado(id)
    })()
  }, [])

  async function cargarEstado(userId: string | null) {
    if (!userId) return
    setLoading(true)
    try {
      const { data: ult } = await supabase
        .from('recorridos')
        .select('id, iniciado_en, inicio_latitude, inicio_longitude, finalizado_en, fin_latitude, fin_longitude, km_manual, estado')
        .eq('usuario_id', userId)
        .order('creado_en', { ascending: false })
        .limit(1)
      setReciente((ult?.[0] as Recorrido) ?? null)

      const { data: hist } = await supabase
        .from('recorridos')
        .select('id, iniciado_en, finalizado_en, km_manual, estado')
        .eq('usuario_id', userId)
        .order('creado_en', { ascending: false })
        .limit(10)
      setHistorial((hist as Recorrido[]) || [])
    } finally {
      setLoading(false)
    }
  }

  async function pedirPermisoUbicacion() {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la ubicación para marcar el recorrido.')
      throw new Error('location-permission-denied')
    }
  }

  async function obtenerUbicacionActual() {
    await pedirPermisoUbicacion()
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
    return { lat: pos.coords.latitude, lng: pos.coords.longitude }
  }

  async function iniciarRecorrido() {
    if (!uid) return
    try {
      setLoading(true)
      const { lat, lng } = await obtenerUbicacionActual()
      const { data, error } = await supabase
        .from('recorridos')
        .insert({
          usuario_id: uid,
          estado: 'iniciado',
          iniciado_en: new Date().toISOString(),
          inicio_latitude: lat,
          inicio_longitude: lng,
        })
        .select('id, iniciado_en, inicio_latitude, inicio_longitude, estado')
        .single()
      if (error) throw error
      setReciente(data as Recorrido)
      Alert.alert('Recorrido iniciado', 'Se registró la ubicación de inicio.')
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo iniciar el recorrido')
    } finally {
      setLoading(false)
    }
  }

  async function finalizarRecorrido() {
    if (!uid || !reciente?.id) return
    if (!kmText.trim()) {
      Alert.alert('Faltan datos', 'Ingresá los kilómetros realizados.')
      return
    }
    const km = parseFloat(kmText.replace(',', '.'))
    if (!Number.isFinite(km) || km < 0) {
      Alert.alert('Dato inválido', 'Ingresá un número de kilómetros válido (>= 0).')
      return
    }
    try {
      setLoading(true)
      const { lat, lng } = await obtenerUbicacionActual()
      const { error } = await supabase
        .from('recorridos')
        .update({
          estado: 'finalizado',
          finalizado_en: new Date().toISOString(),
          fin_latitude: lat,
          fin_longitude: lng,
          km_manual: km,
        })
        .eq('id', reciente.id)
      if (error) throw error
      setKmText('')
      await cargarEstado(uid)
      Alert.alert('Recorrido finalizado', 'Se registró la ubicación de fin y los km.')
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo finalizar el recorrido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>Recorridos</Text>
      <Text style={styles.subtitulo}>Marcá el inicio y fin de tu recorrido y cargá los km realizados.</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginVertical: 16 }} />
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Recorrido actual</Text>
          {reciente?.estado === 'iniciado' ? (
            <View>
              <Text style={styles.info}>Inicio: {reciente.iniciado_en ? dayjs(reciente.iniciado_en).format('DD/MM HH:mm') : '—'}</Text>
              <Text style={styles.info}>Lat/Lng: {reciente.inicio_latitude?.toFixed(5)}, {reciente.inicio_longitude?.toFixed(5)}</Text>
              <Text style={styles.label}>KM realizados (manual):</Text>
              <TextInput
                value={kmText}
                onChangeText={setKmText}
                placeholder="Ej: 12.5"
                keyboardType="decimal-pad"
                style={styles.input}
              />
              <TouchableOpacity style={styles.btnPrimary} onPress={finalizarRecorrido} disabled={loading}>
                <Text style={styles.btnText}>Finalizar recorrido</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <TouchableOpacity style={styles.btnPrimary} onPress={iniciarRecorrido} disabled={loading}>
                <Text style={styles.btnText}>Iniciar recorrido</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitulo}>Historial reciente</Text>
        {historial.length === 0 ? (
          <Text style={{ color: '#666' }}>Sin recorridos recientes.</Text>
        ) : (
          historial.map((r) => (
            <View key={r.id} style={styles.row}>
              <Text style={styles.info}>Inicio: {r.iniciado_en ? dayjs(r.iniciado_en).format('DD/MM HH:mm') : '—'}</Text>
              <Text style={styles.info}>Fin: {r.finalizado_en ? dayjs(r.finalizado_en).format('DD/MM HH:mm') : '—'}</Text>
              <Text style={styles.info}>KM: {r.km_manual != null ? r.km_manual : '—'}</Text>
            </View>
          ))
        )}
      </View>

      <TouchableOpacity style={styles.btnGhost} onPress={() => router.back()}>
        <Text style={styles.btnGhostText}>← Volver</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  titulo: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitulo: { fontSize: 14, color: '#666', marginBottom: 12 },
  card: { backgroundColor: '#f3f4f6', padding: 16, borderRadius: 10, marginBottom: 12 },
  cardTitulo: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  info: { fontSize: 13, color: '#374151', marginBottom: 4 },
  label: { fontSize: 13, color: '#334155', fontWeight: '600', marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    backgroundColor: '#fff',
  },
  row: { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8, marginTop: 8 },
  btnPrimary: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  btnText: { color: '#fff', fontWeight: '700' },
  btnGhost: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  btnGhostText: { color: '#0f172a', fontWeight: '700' },
})
