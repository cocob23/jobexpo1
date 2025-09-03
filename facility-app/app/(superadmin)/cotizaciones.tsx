import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  Platform,
  StatusBar,
  RefreshControl,
} from 'react-native'
import { supabase } from '@/constants/supabase'

type Estado = 'cotizado' | 'aprobado' | 'cerrado' | 'facturado' | 'desestimado'

type Usuario = {
  id: string
  nombre: string | null
  apellido: string | null
  email: string | null
}

type Cotizacion = {
  id: string
  numero: number
  cliente: string
  descripcion: string | null
  monto: number | null
  fecha: string | null
  estado: Estado
  archivo_path: string | null
  archivo_mimetype: string | null
  creado_en: string
  subida_por: string
  usuarios?: Usuario | null // join
}

const ESTADO_COLOR: Record<Estado, { bg: string; border: string; text: string }> = {
  cotizado:    { bg: '#E0EAFF', border: '#BFDBFE', text: '#1E40AF' },
  aprobado:    { bg: '#DCFCE7', border: '#BBF7D0', text: '#166534' },
  cerrado:     { bg: '#F1F5F9', border: '#E2E8F0', text: '#334155' },
  facturado:   { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E' },
  desestimado: { bg: '#FEE2E2', border: '#FCA5A5', text: '#991B1B' },
}

export default function CotizacionesSuperadmin() {
  const [cargando, setCargando] = useState(false)
  const [listado, setListado] = useState<Cotizacion[]>([])

  // filtros
  const [qId, setQId] = useState('')           // N° o UUID
  const [fmId, setFmId] = useState<string>('') // elegido del selector
  const [clienteQ, setClienteQ] = useState('')
  const [estado, setEstado] = useState<Estado | ''>('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  // FMs para el "dropdown" simple
  const [fms, setFms] = useState<Usuario[]>([])
  const [abrirFM, setAbrirFM] = useState(false)

  // Empresas para autocompletar en el filtro "Cliente…"
  const [empresas, setEmpresas] = useState<{ id: string; nombre: string }[]>([])
  const [empresasFiltradas, setEmpresasFiltradas] = useState<{ id: string; nombre: string }[]>([])
  const [mostrarSugerenciasCliente, setMostrarSugerenciasCliente] = useState(false)

  const estados: Estado[] = useMemo(
    () => ['cotizado', 'aprobado', 'cerrado', 'facturado', 'desestimado'],
    []
  )

  // Helpers
  const isUUID = (s: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s.trim())

  const parseNumero = (s: string) => {
    const raw = s.trim().replace(/^#/, '')
    const n = parseInt(raw, 10)
    return Number.isFinite(n) ? n : null
  }

  const formatMoney = (n: number | null) => {
    if (n == null) return '—'
    try {
      return `$ ${Number(n).toLocaleString('es-AR')}`
    } catch {
      return `$ ${n}`
    }
  }

  const formatDate = (s: string | null) => {
    if (!s) return '—'
    const parts = s.split('-')
    if (parts.length === 3 && parts[0].length === 4) {
      const [yyyy, mm, dd] = parts
      const y = Number(yyyy), m = Number(mm), d = Number(dd)
      if (y > 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
      }
    }
    return s
  }

  useEffect(() => {
    cargarFMs()
    cargarListado()
    cargarEmpresas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cargarFMs = async () => {
    const { data } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, email')
      .eq('rol', 'fm')
      .order('apellido', { ascending: true })
    setFms(data || [])
  }

  const cargarEmpresas = async () => {
    const { data, error } = await supabase
      .from('empresas')
      .select('id, nombre')
      .order('nombre', { ascending: true })
    if (!error && data) setEmpresas(data)
  }

  const cargarListado = async () => {
    setCargando(true)

    let q = supabase
      .from('cotizaciones')
      .select(`
        id, numero, cliente, descripcion, monto, fecha, estado,
        archivo_path, archivo_mimetype, creado_en, subida_por,
        usuarios:subida_por ( id, nombre, apellido, email )
      `)
      .order('numero', { ascending: false })

    // Filtro por N°/UUID
    if (qId.trim()) {
      if (isUUID(qId)) {
        q = q.eq('id', qId.trim())
      } else {
        const n = parseNumero(qId)
        if (n !== null) q = q.eq('numero', n)
      }
    }

    // Otros filtros
    if (fmId) q = q.eq('subida_por', fmId)
    if (clienteQ) q = q.ilike('cliente', `%${clienteQ}%`)
    if (estado) q = q.eq('estado', estado)
    if (desde) q = q.gte('fecha', desde)
    if (hasta) q = q.lte('fecha', hasta)

    const { data, error } = await q
    if (!error && data) setListado(data as unknown as Cotizacion[])
    setCargando(false)
  }

  useEffect(() => {
    if (!clienteQ.trim()) {
      setEmpresasFiltradas([])
      setMostrarSugerenciasCliente(false)
      return
    }
    const q = clienteQ.toLowerCase()
    const res = empresas.filter((e) => e.nombre.toLowerCase().includes(q)).slice(0, 12)
    setEmpresasFiltradas(res)
    setMostrarSugerenciasCliente(res.length > 0)
  }, [clienteQ, empresas])

  const limpiarFiltros = () => {
    setQId('')
    setFmId('')
    setClienteQ('')
    setEstado('')
    setDesde('')
    setHasta('')
    setEmpresasFiltradas([])
    setMostrarSugerenciasCliente(false)
  }

  const verArchivo = async (row: Cotizacion) => {
    if (!row.archivo_path) return Alert.alert('Sin archivo', 'No hay archivo para esta cotización')
    const { data, error } = await supabase.storage.from('cotizaciones').createSignedUrl(row.archivo_path, 3600)
    if (error || !data?.signedUrl) return Alert.alert('Error', 'No se pudo obtener el archivo')
    Linking.openURL(data.signedUrl)
  }

  const actualizarEstado = async (id: string, nuevo: Estado) => {
    const prev = listado.slice()
    setListado((x) => x.map((r) => (r.id === id ? { ...r, estado: nuevo } : r)))

    const { error } = await supabase.from('cotizaciones').update({ estado: nuevo }).eq('id', id)
    if (error) {
      Alert.alert('Error', 'No se pudo actualizar el estado: ' + error.message)
      setListado(prev) // rollback visual
    }
  }

  const nombreFM = (u?: Usuario | null) =>
    u ? `${u.apellido ?? ''} ${u.nombre ?? ''}`.trim() || u.email || '—' : '—'

  const abrirSelectorEstado = (row: Cotizacion) => {
    Alert.alert(
      'Cambiar estado',
      `COT-${String(row.numero).padStart(6, '0')}`,
      estados.map((es) => ({
        text: es,
        onPress: () => actualizarEstado(row.id, es),
      })),
    )
  }

  const etiquetaFM = () => {
    if (!fmId) return 'Todos los FM'
    const found = fms.find((u) => u.id === fmId)
    return found ? `${found.apellido ?? ''} ${found.nombre ?? ''}`.trim() || found.email || found.id : fmId
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <Text style={styles.title}>Gestionar Cotizaciones (Superadmin)</Text>

        {/* Filtros */}
        <View style={styles.filtros}>
          <TextInput
            placeholder="N° o UUID…"
            value={qId}
            onChangeText={setQId}
            style={styles.input}
            onSubmitEditing={cargarListado}
            placeholderTextColor="#94a3b8"
          />

          {/* Selector FM "simple" */}
          <View>
            <TouchableOpacity style={styles.input} onPress={() => setAbrirFM((x) => !x)}>
              <Text style={styles.inputText}>{etiquetaFM()}</Text>
            </TouchableOpacity>
            {abrirFM && (
              <View style={styles.fmPicker}>
                <TouchableOpacity style={styles.fmItem} onPress={() => { setFmId(''); setAbrirFM(false) }}>
                  <Text>Todos los FM</Text>
                </TouchableOpacity>
                <ScrollView style={{ maxHeight: 220 }}>
                  {fms.map((u) => (
                    <TouchableOpacity
                      key={u.id}
                      style={styles.fmItem}
                      onPress={() => { setFmId(u.id); setAbrirFM(false) }}
                    >
                      <Text>{`${u.apellido ?? ''} ${u.nombre ?? ''}`.trim() || u.email || u.id}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Cliente con autocompletar */}
          <View style={{ position: 'relative' }}>
            <TextInput
              placeholder="Cliente…"
              value={clienteQ}
              onChangeText={(t) => {
                setClienteQ(t)
                setMostrarSugerenciasCliente(true)
              }}
              style={styles.input}
              onSubmitEditing={cargarListado}
              placeholderTextColor="#94a3b8"
            />
            {mostrarSugerenciasCliente && empresasFiltradas.length > 0 && (
              <View style={styles.suggestBox}>
                <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 220 }}>
                  {empresasFiltradas.map((e) => (
                    <TouchableOpacity
                      key={e.id}
                      style={styles.suggestItem}
                      onPress={() => {
                        setClienteQ(e.nombre)
                        setEmpresasFiltradas([])
                        setMostrarSugerenciasCliente(false)
                      }}
                    >
                      <Text style={{ color: '#0f172a' }}>{e.nombre}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Estado: botón que abre Alert con opciones */}
          <TouchableOpacity
            style={styles.input}
            onPress={() =>
              Alert.alert(
                'Estado',
                'Filtrar por estado',
                [{ text: 'Todos', onPress: () => setEstado('') }].concat(
                  estados.map((es) => ({ text: es, onPress: () => setEstado(es) }))
                )
              )
            }
          >
            <Text style={styles.inputText}>{estado || 'Todos los estados'}</Text>
          </TouchableOpacity>

          <TextInput
            placeholder="Desde (YYYY-MM-DD)"
            value={desde}
            onChangeText={setDesde}
            style={styles.input}
            placeholderTextColor="#94a3b8"
          />
          <TextInput
            placeholder="Hasta (YYYY-MM-DD)"
            value={hasta}
            onChangeText={setHasta}
            style={styles.input}
            placeholderTextColor="#94a3b8"
          />

          <View style={styles.filaBtns}>
            <TouchableOpacity onPress={cargarListado} disabled={cargando} style={[styles.btn, styles.btnPrimario, cargando && { opacity: 0.7 }]}>
              <Text style={[styles.btnText, { color: '#fff' }]}>{cargando ? 'Cargando…' : 'Aplicar filtros'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={limpiarFiltros} style={[styles.btn, styles.btnSecundario]}>
              <Text style={styles.btnText}>Limpiar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Lista */}
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargarListado} />}
          contentContainerStyle={{ paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {!listado.length && (
            <Text style={styles.empty}>No hay resultados</Text>
          )}
          {listado.map((r) => {
            const color = ESTADO_COLOR[r.estado]
            return (
              <View key={r.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.num}>#{String(r.numero).padStart(6, '0')}</Text>
                  <TouchableOpacity
                    onPress={() => abrirSelectorEstado(r)}
                    style={[
                      styles.estadoChip,
                      { backgroundColor: color.bg, borderColor: color.border },
                    ]}
                  >
                    <Text style={[styles.estadoText, { color: color.text }]}>{r.estado}</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.cliente}>{r.cliente}</Text>
                <Text style={styles.desc}>{r.descripcion ?? '—'}</Text>

                <View style={styles.grid2}>
                  <Text style={styles.meta}>
                    Monto: <Text style={styles.bold}>{formatMoney(r.monto)}</Text>
                  </Text>
                  <Text style={styles.meta}>
                    Fecha: <Text style={styles.bold}>{formatDate(r.fecha)}</Text>
                  </Text>
                </View>

                <Text style={styles.meta}>
                  Subida por: <Text style={styles.bold}>{nombreFM(r.usuarios)}</Text>
                </Text>

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.linkBtn, !r.archivo_path && { opacity: 0.5 }]}
                    onPress={() => verArchivo(r)}
                    disabled={!r.archivo_path}
                  >
                    <Text style={styles.linkBtnText}>{r.archivo_path ? 'Ver/Descargar' : 'Sin archivo'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  // Safe area + “bajar” el inicio del contenido
  safe: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 8,
  },

  wrap: { flex: 1, paddingHorizontal: 16, backgroundColor: '#f1f5f9' },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 12 },

  // Filtros
  filtros: { gap: 8, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  inputText: { color: '#0f172a' },

  fmPicker: {
    borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, backgroundColor: '#fff', marginTop: 6,
  },
  fmItem: {
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0',
  },

  // Sugerencias cliente
  suggestBox: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    zIndex: 50,
  },
  suggestItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },

  filaBtns: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimario: { backgroundColor: '#2563EB' },
  btnSecundario: {
    backgroundColor: '#e2e8f0',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  btnText: { fontWeight: '700', color: '#0f172a' },

  empty: { textAlign: 'center', color: '#64748b', paddingVertical: 16 },

  // Cards
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 12,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  num: { fontWeight: '800', color: '#0f172a' },

  estadoChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  estadoText: { fontWeight: '700' },

  cliente: { fontWeight: '700', color: '#0f172a', marginBottom: 2, fontSize: 16 },
  desc: { color: '#334155', marginBottom: 8 },
  grid2: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  meta: { color: '#475569', marginBottom: 2 },
  bold: { fontWeight: '700', color: '#0f172a' },

  actions: { marginTop: 10, flexDirection: 'row', gap: 8 },
  linkBtn: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  linkBtnText: { fontWeight: '700', color: '#0f172a' },
})
