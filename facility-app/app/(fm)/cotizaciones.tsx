// app/(fm)/cotizaciones.tsx
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
} from 'react-native'
import { supabase } from '@/constants/supabase'

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
  const [meId, setMeId] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const [listado, setListado] = useState<Cotizacion[]>([])

  // Filtros
  const [qId, setQId] = useState('')          // N° o UUID
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

  const estados: Estado[] = useMemo(
    () => ['cotizado', 'aprobado', 'cerrado', 'facturado', 'desestimado'],
    []
  )

  // Helpers filtro ID/N°
  const isUUID = (s: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s.trim())
  const parseNumero = (s: string) => {
    const raw = s.trim().replace(/^#/, '')
    const n = parseInt(raw, 10)
    return Number.isFinite(n) ? n : null
  }

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      const uid = data?.user?.id ?? null
      setMeId(uid)
      await cargarListado()
    })()
  }, [])

  const cargarListado = async () => {
    setCargando(true)
    let q = supabase.from('cotizaciones').select('*').order('numero', { ascending: false })

    // Filtro por N°/UUID
    if (qId.trim()) {
      if (isUUID(qId)) {
        q = q.eq('id', qId.trim())
      } else {
        const n = parseNumero(qId)
        if (n !== null) q = q.eq('numero', n)
      }
    }

    // Resto de filtros
    if (qCliente) q = q.ilike('cliente', `%${qCliente}%`)
    if (desde) q = q.gte('fecha', desde)
    if (hasta) q = q.lte('fecha', hasta)

    const { data, error } = await q
    if (error) {
      console.error(error)
    } else if (data) {
      setListado(data as Cotizacion[])
    }
    setCargando(false)
  }

  const limpiarForm = () => {
    setCliente('')
    setDescripcion('')
    setMonto('')
    setFecha('')
    setEstado('cotizado')
    setArchivo(null)
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

  // Subir a Supabase Storage vía PUT (base64)
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
      if (!cliente.trim()) return Alert.alert('Validación', 'Ingresá el cliente')
      if (!archivo) return Alert.alert('Validación', 'Adjuntá el archivo (PDF/Excel)')

      setSubiendo(true)

      // 1) Insert preliminar para obtener numero
      const { data: inserted, error: insertErr } = await supabase
        .from('cotizaciones')
        .insert({
          cliente: cliente.trim(),
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

      // 2) Subir a storage usando el numero
      const safeCliente = cliente.toLowerCase().replace(/[^a-z0-9-_]+/g, '-')
      const ext = (archivo.name.split('.').pop() || (archivo.mimeType?.includes('pdf') ? 'pdf' : 'dat')).toLowerCase()
      const fileName = `${pad6(inserted.numero)}_${safeCliente}.${ext}`
      const path = `${meId}/${fileName}`

      await uploadToStorage('cotizaciones', path, archivo.uri, archivo.mimeType)

      // 3) Update con archivo_path (RLS update_owner)
      const { error: updErr } = await supabase.from('cotizaciones').update({ archivo_path: path }).eq('id', inserted.id)
      if (updErr) throw new Error('Subido, pero no se guardó el path: ' + updErr.message)

      Alert.alert('OK', `Cotización COT-${pad6(inserted.numero)} creada`)
      limpiarForm()
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
    <View style={styles.wrap}>
      <Text style={styles.title}>Cotizaciones (FM)</Text>

      {/* Form alta */}
      <View style={styles.form}>
        <Text style={styles.label}>Cliente *</Text>
        <TextInput
          value={cliente}
          onChangeText={setCliente}
          placeholder="Cliente"
          style={styles.input}
          placeholderTextColor="#6b7280"
          autoCapitalize="sentences"
        />

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
            <TextInput
              value={monto}
              onChangeText={setMonto}
              placeholder="0"
              style={styles.input}
              placeholderTextColor="#6b7280"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Fecha</Text>
            <TextInput
              value={fecha}
              onChangeText={setFecha}
              placeholder="YYYY-MM-DD"
              style={styles.input}
              placeholderTextColor="#6b7280"
            />
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
          <TouchableOpacity style={styles.btn} disabled={subiendo} onPress={limpiarForm}>
            <Text style={styles.btnText}>Limpiar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filtros */}
      <View style={styles.filtros}>
        <TextInput
          placeholder="Buscar por N° o UUID…"
          value={qId}
          onChangeText={setQId}
          style={styles.input}
          onSubmitEditing={cargarListado}
          placeholderTextColor="#6b7280"
        />
        <TextInput
          placeholder="Buscar por cliente…"
          value={qCliente}
          onChangeText={setQCliente}
          style={styles.input}
          onSubmitEditing={cargarListado}
          placeholderTextColor="#6b7280"
        />
        <TextInput
          placeholder="Desde (YYYY-MM-DD)"
          value={desde}
          onChangeText={setDesde}
          style={styles.input}
          placeholderTextColor="#6b7280"
        />
        <TextInput
          placeholder="Hasta (YYYY-MM-DD)"
          value={hasta}
          onChangeText={setHasta}
          style={styles.input}
          placeholderTextColor="#6b7280"
        />
        <TouchableOpacity onPress={cargarListado} disabled={cargando} style={styles.btn}>
          <Text style={styles.btnText}>{cargando ? 'Cargando…' : 'Aplicar filtros'}</Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      <ScrollView style={{ flex: 1 }}>
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
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, backgroundColor: '#f1f5f9' },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  form: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, backgroundColor: '#fff', marginBottom: 12 },
  filtros: { gap: 8, marginBottom: 12 },
  label: { color: '#475569', fontWeight: '700', marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#fff', color: '#0f172a',
  },
  // color del texto "dentro" de los contenedores tipo select simulados
  inputText: { color: '#0f172a' },

  row3: { flexDirection: 'row', gap: 12 },
  btnPrimary: { backgroundColor: '#0ea5e9', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
  btn: { backgroundColor: '#e2e8f0', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' },
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
})
