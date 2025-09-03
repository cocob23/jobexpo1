// app/(fm)/cotizaciones/index.tsx  (CotizacionesFM)
import { Buffer } from 'buffer'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
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
  Modal,
  BackHandler,
  Platform,
} from 'react-native'
import { supabase } from '@/constants/supabase'
import { Stack, useRouter } from 'expo-router'
import { useNavigation } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

global.Buffer = Buffer

type Estado = 'cotizado' | 'aprobado' | 'cerrado' | 'facturado' | 'desestimado'

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
}

const pad6 = (n: number) => String(n).padStart(6, '0')

export default function CotizacionesFM() {
  const router = useRouter()
  const navigation = useNavigation()

  const [meId, setMeId] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const [listado, setListado] = useState<Cotizacion[]>([])

  // Filtros
  const [qId, setQId] = useState('')
  const [qCliente, setQCliente] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  // Form
  const [cliente, setCliente] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState<string>('')
  const [fecha, setFecha] = useState<string>('')
  const [estado, setEstado] = useState<Estado>('cotizado')
  const [archivo, setArchivo] = useState<{ uri: string, name: string, mimeType: string } | null>(null)
  const [subiendo, setSubiendo] = useState(false)

  // Empresas para autocompletar en el formulario de alta
  const [empresas, setEmpresas] = useState<{ id: string; nombre: string }[]>([])
  const [empresasFiltradas, setEmpresasFiltradas] = useState<{ id: string; nombre: string }[]>([])
  const [empresaSeleccionadaId, setEmpresaSeleccionadaId] = useState<string>('')

  // Modales
  const [showForm, setShowForm] = useState(false)
  const [showFiltros, setShowFiltros] = useState(false)

  const estados: Estado[] = useMemo(
    () => ['cotizado', 'aprobado', 'cerrado', 'facturado', 'desestimado'],
    []
  )

  useEffect(() => {
    const sub = navigation.addListener('beforeRemove', (e) => {
      if (showForm || showFiltros) {
        e.preventDefault()
        if (showForm) setShowForm(false)
        if (showFiltros) setShowFiltros(false)
        return
      }
      // @ts-ignore
      if (navigation.canGoBack && (navigation as any).canGoBack?.()) return
      e.preventDefault()
      router.replace('/(fm)')
    })
    return sub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, router, showForm, showFiltros])

  useEffect(() => {
    if (Platform.OS !== 'android') return
    const onBack = () => {
      if (showForm) { setShowForm(false); return true }
      if (showFiltros) { setShowFiltros(false); return true }
      return false
    }
    const bh = BackHandler.addEventListener('hardwareBackPress', onBack)
    return () => bh.remove()
  }, [showForm, showFiltros])

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      const uid = data?.user?.id ?? null
      setMeId(uid)
      await Promise.all([cargarListado(), cargarEmpresas()])
    })()
  }, [])

  const isUUID = (s: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s.trim())
  const parseNumero = (s: string) => {
    const raw = s.trim().replace(/^#/, '')
    const n = parseInt(raw, 10)
    return Number.isFinite(n) ? n : null
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
    let q = supabase.from('cotizaciones').select('*').order('numero', { ascending: false })

    if (qId.trim()) {
      if (isUUID(qId)) q = q.eq('id', qId.trim())
      else {
        const n = parseNumero(qId)
        if (n !== null) q = q.eq('numero', n)
      }
    }

    if (qCliente) q = q.ilike('cliente', `%${qCliente}%`)
    if (desde) q = q.gte('fecha', desde)
    if (hasta) q = q.lte('fecha', hasta)

    const { data, error } = await q
    if (!error && data) setListado(data as Cotizacion[])
    setCargando(false)
  }

  useEffect(() => {
    if (!cliente.trim()) {
      setEmpresasFiltradas([])
      return
    }
    const q = cliente.toLowerCase()
    const res = empresas.filter((e) => e.nombre.toLowerCase().includes(q)).slice(0, 12)
    setEmpresasFiltradas(res)
  }, [cliente, empresas])

  const limpiarForm = () => {
    setCliente('')
    setDescripcion('')
    setMonto('')
    setFecha('')
    setEstado('cotizado')
    setArchivo(null)
    setEmpresasFiltradas([])
    setEmpresaSeleccionadaId('')
  }

  const elegirArchivo = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      multiple: false,
      copyToCacheDirectory: true,
    })
    if (res.canceled) return
    const f = res.assets?.[0]
    if (!f) return
    setArchivo({ uri: f.uri, name: f.name || 'archivo.pdf', mimeType: f.mimeType || 'application/octet-stream' })
  }

  const uploadToStorage = async (bucket: string, path: string, fileUri: string, mime: string) => {
    const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 })
    const bin = Buffer.from(base64, 'base64')
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
    if (sessionErr || !sessionData?.session) throw new Error('Sesión inválida')
    // @ts-ignore
    const SUPABASE_URL = (supabase as any).supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL
    // @ts-ignore
    const SUPABASE_ANON_KEY = (supabase as any).supabaseKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${encodeURI(path)}`
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': mime || 'application/octet-stream',
        'Authorization': `Bearer ${sessionData.session.access_token}`,
        'apikey': SUPABASE_ANON_KEY,
        'x-upsert': 'true',
      },
      body: bin as any,
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`Upload error: ${res.status} ${txt}`)
    }
  }

  const subirCotizacion = async () => {
    try {
      if (!meId) return Alert.alert('Sesión', 'No hay sesión')
      if (!empresaSeleccionadaId) {
        return Alert.alert('Empresa requerida', 'Seleccioná una Empresa/Cliente existente. Si no existe, creala antes desde “Agregar Empresa/Cliente”.')
      }
      const empresaReal = empresas.find((e) => e.id === empresaSeleccionadaId)?.nombre || ''
      if (!empresaReal || empresaReal !== cliente) {
        return Alert.alert('Validación', 'Elegí una empresa de la lista de sugerencias.')
      }
      if (!archivo) return Alert.alert('Validación', 'Adjuntá el archivo (PDF/Excel)')

      setSubiendo(true)

      const { data: inserted, error: insertErr } = await supabase
        .from('cotizaciones')
        .insert({
          cliente: empresaReal.trim(),
          descripcion: descripcion.trim() || null,
          monto: monto ? Number(monto) : null,
          fecha: fecha || null,
          estado,
          subida_por: meId,
          archivo_path: null,
          archivo_mimetype: archivo.mimeType || null,
        })
        .select('id, numero')
        .single()

      if (insertErr || !inserted) throw new Error(insertErr?.message || 'Error al crear la cotización')

      const safeCliente = empresaReal.toLowerCase().replace(/[^a-z0-9-_]+/g, '-')
      const ext = (archivo.name.split('.').pop() || (archivo.mimeType?.includes('pdf') ? 'pdf' : 'dat')).toLowerCase()
      const fileName = `${pad6(inserted.numero)}_${safeCliente}.${ext}`
      const path = `${meId}/${fileName}`

      await uploadToStorage('cotizaciones', path, archivo.uri, archivo.mimeType)

      const { error: updErr } = await supabase.from('cotizaciones').update({ archivo_path: path }).eq('id', inserted.id)
      if (updErr) throw new Error('Subido, pero no se guardó el path: ' + updErr.message)

      Alert.alert('OK', `Cotización COT-${pad6(inserted.numero)} creada`)
      limpiarForm()
      setShowForm(false)
      cargarListado()
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo subir la cotización')
    } finally {
      setSubiendo(false)
    }
  }

  const verArchivo = async (row: Cotizacion) => {
    if (!row.archivo_path) return Alert.alert('Sin archivo', 'No hay archivo para esta cotización')
    const { data, error } = await supabase.storage.from('cotizaciones').createSignedUrl(row.archivo_path, 3600)
    if (error || !data?.signedUrl) return Alert.alert('Error', 'No se pudo obtener el archivo')
    Linking.openURL(data.signedUrl)
  }

  const actualizarEstado = async (row: Cotizacion) => {
    Alert.alert(
      'Cambiar estado',
      `COT-${pad6(row.numero)}`,
      estados.map((es) => ({
        text: es,
        onPress: async () => {
          const prev = listado.slice()
          try {
            setListado((xs) => xs.map((r) => (r.id === row.id ? { ...r, estado: es } : r)))
            const { error } = await supabase.from('cotizaciones').update({ estado: es }).eq('id', row.id)
            if (error) throw error
          } catch (e: any) {
            setListado(prev)
            Alert.alert('Error', 'No se pudo actualizar el estado: ' + (e?.message || ''))
          }
        },
      })),
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header Back compacto */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnBack}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
          <Text style={styles.btnBackText}>Volver</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.wrap}>
        <Stack.Screen
          options={{ title: 'Cotizaciones', headerShown: false, gestureEnabled: true }}
        />

        <Text style={styles.title}>Cotizaciones (FM)</Text>

        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => setShowForm(true)}>
            <Text style={styles.btnPrimaryText}>Nueva cotización</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={() => setShowFiltros(true)}>
            <Text style={styles.btnText}>Filtros</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          {!listado.length && <Text style={styles.empty}>No hay cotizaciones</Text>}
          {listado.map((row) => (
            <View key={row.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.num}>#{pad6(row.numero)}</Text>
                <TouchableOpacity onPress={() => actualizarEstado(row)} style={styles.estadoChip}>
                  <Text style={styles.estadoText}>{row.estado}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.cliente}>{row.cliente}</Text>
              <Text style={styles.desc}>{row.descripcion ?? '-'}</Text>
              <View style={styles.grid2}>
                <Text style={styles.meta}>Monto: <Text style={styles.bold}>{row.monto ?? '-'}</Text></Text>
                <Text style={styles.meta}>Fecha: <Text style={styles.bold}>{row.fecha ?? '-'}</Text></Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.linkBtn, !row.archivo_path && { opacity: 0.5 }]}
                  onPress={() => verArchivo(row)}
                  disabled={!row.archivo_path}
                >
                  <Text style={styles.linkBtnText}>{row.archivo_path ? 'Ver/Descargar' : 'Sin archivo'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Modal: Form */}
        <Modal transparent animationType="slide" visible={showForm} onRequestClose={() => setShowForm(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nueva cotización</Text>
                <TouchableOpacity onPress={() => setShowForm(false)} style={styles.modalClose}>
                  <Text style={{ fontWeight: '800', color: '#0f172a' }}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
                <View style={styles.form}>
                  <Text style={styles.label}>Cliente *</Text>

                  <View style={{ position: 'relative' }}>
                    <TextInput
                      value={cliente}
                      onChangeText={(t) => { setCliente(t); setEmpresaSeleccionadaId('') }}
                      placeholder="Buscar y seleccionar empresa/cliente existente"
                      style={styles.input}
                      placeholderTextColor="#6b7280"
                      autoCapitalize="sentences"
                    />
                    {empresasFiltradas.length > 0 && (
                      <View style={styles.suggestBox}>
                        <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 220 }}>
                          {empresasFiltradas.map((e) => (
                            <TouchableOpacity
                              key={e.id}
                              style={styles.suggestItem}
                              onPress={() => { setCliente(e.nombre); setEmpresaSeleccionadaId(e.id); setEmpresasFiltradas([]) }}
                            >
                              <Text style={{ color: '#0f172a' }}>{e.nombre}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  <Text style={styles.label}>Descripción</Text>
                  <TextInput
                    value={descripcion}
                    onChangeText={setDescripcion}
                    placeholder="Descripción"
                    style={styles.input}
                    placeholderTextColor="#6b7280"
                    autoCapitalize="sentences"
                  />

                  <View style={styles.row3}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Monto</Text>
                      <TextInput value={monto} onChangeText={setMonto} placeholder="0" style={styles.input} placeholderTextColor="#6b7280" keyboardType="decimal-pad" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Fecha</Text>
                      <TextInput value={fecha} onChangeText={setFecha} placeholder="YYYY-MM-DD" style={styles.input} placeholderTextColor="#6b7280" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Estado</Text>
                      <TouchableOpacity
                        style={styles.input}
                        onPress={() =>
                          Alert.alert(
                            'Estado',
                            'Seleccioná un estado',
                            estados.map((es) => ({ text: es, onPress: () => setEstado(es) }))
                          )
                        }
                      >
                        <Text style={styles.inputText}>{estado}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.label}>Archivo (PDF/Excel) *</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity style={styles.btnGhost} onPress={elegirArchivo}>
                      <Text style={styles.btnGhostText}>{archivo ? archivo.name : 'Elegir archivo'}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <TouchableOpacity style={styles.btnPrimary} disabled={subiendo} onPress={subirCotizacion}>
                      <Text style={styles.btnPrimaryText}>{subiendo ? 'Subiendo…' : 'Guardar cotización'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.btn}
                      disabled={subiendo}
                      onPress={() => { limpiarForm(); setShowForm(false) }}
                    >
                      <Text style={styles.btnText}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Modal: Filtros */}
        <Modal transparent animationType="slide" visible={showFiltros} onRequestClose={() => setShowFiltros(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filtros</Text>
                <TouchableOpacity onPress={() => setShowFiltros(false)} style={styles.modalClose}>
                  <Text style={{ fontWeight: '800', color: '#0f172a' }}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
                <View style={styles.filtros}>
                  <TextInput
                    placeholder="Buscar por N° o UUID…"
                    value={qId}
                    onChangeText={setQId}
                    style={styles.input}
                    onSubmitEditing={() => { cargarListado(); setShowFiltros(false) }}
                    placeholderTextColor="#6b7280"
                  />
                  <TextInput
                    placeholder="Buscar por cliente…"
                    value={qCliente}
                    onChangeText={setQCliente}
                    style={styles.input}
                    onSubmitEditing={() => { cargarListado(); setShowFiltros(false) }}
                    placeholderTextColor="#6b7280"
                  />
                  <TextInput placeholder="Desde (YYYY-MM-DD)" value={desde} onChangeText={setDesde} style={styles.input} placeholderTextColor="#6b7280" />
                  <TextInput placeholder="Hasta (YYYY-MM-DD)" value={hasta} onChangeText={setHasta} style={styles.input} placeholderTextColor="#6b7280" />

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                    <TouchableOpacity onPress={() => { cargarListado(); setShowFiltros(false) }} disabled={cargando} style={[styles.btnPrimary, cargando && { opacity: 0.7 }]}>
                      <Text style={styles.btnPrimaryText}>{cargando ? 'Cargando…' : 'Aplicar filtros'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setQId(''); setQCliente(''); setDesde(''); setHasta(''); }} style={styles.btn}>
                      <Text style={styles.btnText}>Limpiar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f1f5f9' },
  headerRow: {
    paddingHorizontal: 16,
    paddingTop: 40,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  btnBack: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6b7280',
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 10,
  },
  btnBackText: { color: '#fff', fontWeight: '700', marginLeft: 4 },

  wrap: { flex: 1, padding: 16, backgroundColor: '#f1f5f9' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },

  toolbar: { flexDirection: 'row', gap: 8, marginBottom: 10 },

  form: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, backgroundColor: '#fff', marginBottom: 12 },
  filtros: { gap: 8, marginBottom: 12 },

  label: { color: '#475569', fontWeight: '700', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', color: '#0f172a' },
  inputText: { color: '#0f172a' },

  suggestBox: { position: 'absolute', top: 52, left: 0, right: 0, backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, zIndex: 50 },
  suggestItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0' },

  btnPrimary: { backgroundColor: '#0ea5e9', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
  btn: { backgroundColor: '#e2e8f0', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontWeight: '700', color: '#0f172a' },
  btnGhost: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  btnGhostText: { fontWeight: '700', color: '#0f172a' },

  empty: { textAlign: 'center', color: '#64748b', paddingVertical: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, marginBottom: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  num: { fontWeight: '800', color: '#0f172a' },
  estadoChip: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  estadoText: { fontWeight: '700', color: '#0f172a' },
  cliente: { fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  desc: { color: '#334155', marginBottom: 6 },
  grid2: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { color: '#475569', marginBottom: 2 },
  bold: { fontWeight: '700', color: '#0f172a' },
  actions: { marginTop: 8, flexDirection: 'row', gap: 8 },
  linkBtn: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  linkBtnText: { fontWeight: '700', color: '#0f172a' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalCard: { maxHeight: '88%', backgroundColor: '#f8fafc', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  modalClose: { padding: 6 },
  row3: { flexDirection: 'row', gap: 10 },
})
