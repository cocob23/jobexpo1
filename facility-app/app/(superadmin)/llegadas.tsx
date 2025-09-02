// app/(fm)/llegadas.tsx
import { useEffect, useMemo, useState } from 'react'
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator, TextInput, Platform
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { supabase } from '@/constants/supabase'

dayjs.locale('es')

type Llegada = {
  id: string
  usuario_id: string
  fecha: string            // en DB: DATE o TIMESTAMP (guardamos como string YYYY-MM-DD si es DATE)
  hora: string             // "HH:mm" o similar
  lugar: string | null
  latitud?: number | null
  longitud?: number | null
}

type Usuario = { id: string; nombre: string; apellido: string }

export default function LlegadasFM() {
  const [items, setItems] = useState<Llegada[]>([])
  const [empleadasMap, setEmpleadasMap] = useState<Record<string, Usuario>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // filtros
  const [selectedDate, setSelectedDate] = useState<Date | null>(null) // null = sin filtro
  const [showPicker, setShowPicker] = useState(false)
  const [lugar, setLugar] = useState<string>('')
  const [buscar, setBuscar] = useState<string>('')

  useEffect(() => {
    fetchLlegadas()

    // realtime
    const ch = supabase
      .channel('llegadas-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'llegadas' }, () => {
        fetchLlegadas(false) // refresco silencioso
      })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, lugar])

  const fetchLlegadas = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true)

      let query = supabase
        .from('llegadas')
        .select('id, usuario_id, fecha, hora, lugar, latitud, longitud')

      // Filtrado por fecha (si `fecha` es DATE, eq matchea perfecto)
      if (selectedDate) {
        const dateStr = dayjs(selectedDate).format('YYYY-MM-DD')
        query = query.eq('fecha', dateStr)
      }

      // Filtro por lugar (server-side)
      if (lugar.trim()) {
        query = query.ilike('lugar', `%${lugar.trim()}%`)
      }

      // Siempre ordenar de más reciente a más viejo
      query = query
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false })

      const { data, error } = await query
      if (error) throw error

      const llegadas = (data || []) as Llegada[]
      setItems(llegadas)

      // Traer nombres de las empleadas
      const ids = Array.from(new Set(llegadas.map(l => l.usuario_id)))
      if (ids.length) {
        const { data: usrs, error: uerr } = await supabase
          .from('usuarios')
          .select('id, nombre, apellido')
          .in('id', ids)
        if (uerr) throw uerr
        const map: Record<string, Usuario> = {}
        ;(usrs || []).forEach(u => { map[u.id] = u as Usuario })
        setEmpleadasMap(map)
      } else {
        setEmpleadasMap({})
      }
    } catch (e) {
      console.error('Error cargando llegadas:', e)
    } finally {
      if (showSpinner) setLoading(false)
      if (refreshing) setRefreshing(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchLlegadas()
  }

  // Filtro por nombre/apellido (client-side)
  const dataRender = useMemo(() => {
    const q = buscar.trim().toLowerCase()
    if (!q) return items
    return items.filter(it => {
      const u = empleadasMap[it.usuario_id]
      const nombre = u ? `${u.nombre} ${u.apellido}`.toLowerCase() : ''
      return nombre.includes(q)
    })
  }, [items, empleadasMap, buscar])

  const renderItem = ({ item }: { item: Llegada }) => {
    const u = empleadasMap[item.usuario_id]
    const nombre = u ? `${u.nombre} ${u.apellido}` : '—'
    const fechaStr = dayjs(item.fecha).isValid()
      ? dayjs(item.fecha).format('DD/MM')
      : String(item.fecha)
    const when = `${fechaStr} ${item.hora || ''}`.trim()

    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.nombre}>{nombre}</Text>
          <Text style={styles.meta}>{when} • {item.lugar || 'Sin lugar'}</Text>
          {(item.latitud != null && item.longitud != null) && (
            <Text style={styles.metaSmall}>
              {Number(item.latitud).toFixed(5)}, {Number(item.longitud).toFixed(5)}
            </Text>
          )}
        </View>
      </View>
    )
  }

  const openPicker = () => setShowPicker(true)
  const clearDate = () => setSelectedDate(null)

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Llegadas de Limpieza</Text>

      <View style={styles.filters}>
        {/* Selector de fecha */}
        <View style={[styles.inputWrap, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Fecha</Text>
            <TouchableOpacity onPress={openPicker} style={styles.dateBtn}>
              <Text style={styles.dateBtnText}>
                {selectedDate ? dayjs(selectedDate).format('YYYY-MM-DD') : 'Todas'}
              </Text>
            </TouchableOpacity>
          </View>

          {selectedDate && (
            <TouchableOpacity onPress={clearDate} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Quitar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Lugar (server-side) */}
        <View style={styles.inputWrap}>
          <Text style={styles.label}>Lugar</Text>
          <TextInput
            value={lugar}
            onChangeText={setLugar}
            placeholder="Filtrar por lugar"
            style={styles.input}
            autoCapitalize="none"
          />
        </View>

        {/* Buscar por nombre (client-side) */}
        <View style={styles.inputWrapFull}>
          <Text style={styles.label}>Buscar empleado</Text>
          <TextInput
            value={buscar}
            onChangeText={setBuscar}
            placeholder="Nombre o apellido"
            style={styles.input}
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchLlegadas()}>
          <Text style={styles.refreshText}>Aplicar</Text>
        </TouchableOpacity>
      </View>

{showPicker && (
  <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 10 }}>
    <DateTimePicker
      value={selectedDate ?? new Date()}
      mode="date"
      display={Platform.OS === 'ios' ? 'inline' : 'spinner'}
      onChange={(_, d) => {
        if (Platform.OS === 'android') {
          setShowPicker(false)
          if (d) setSelectedDate(d)
        } else {
          if (d) setSelectedDate(d)
        }
      }}
      themeVariant="light"
    />

    {/* Botón Cancelar */}
    <TouchableOpacity
      onPress={() => setShowPicker(false)}
      style={{
        marginTop: 10,
        backgroundColor: '#ef4444',
        paddingVertical: 8,
        borderRadius: 6
      }}
    >
      <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>
        Cancelar
      </Text>
    </TouchableOpacity>
  </View>
)}


      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={dataRender}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#6b7280' }}>No hay llegadas para ese filtro.</Text>}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16, paddingTop: 50 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  filters: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginBottom: 12, flexWrap: 'wrap' },
  inputWrap: { width: '47%' },
  inputWrapFull: { width: '100%' },
  label: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10 },
  dateBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  dateBtnText: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 14,
  },
  clearBtn: { backgroundColor: '#ef4444', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, alignSelf: 'flex-end' },
  clearBtnText: { color: '#fff', fontWeight: '700' },
  refreshBtn: { backgroundColor: '#1e40af', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12 },
  refreshText: { color: '#fff', fontWeight: '600' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 10, marginBottom: 8 },
  nombre: { fontWeight: '700' },
  meta: { color: '#374151', marginTop: 2 },
  metaSmall: { color: '#6b7280', marginTop: 2, fontSize: 12 },
})
