// app/(mantenimiento-externo)/planillas.tsx
import { useEffect, useState } from 'react'
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { supabase } from '@/constants/supabase'
import { Buffer } from 'buffer'
import { SafeAreaView } from 'react-native-safe-area-context'

dayjs.locale('es')
global.Buffer = Buffer as any

type Planilla = {
  id: number
  usuario_id: string
  tipo: 'gestion' | 'gastos'
  periodo: string // 'YYYY-MM'
  bucket: string  // 'planillas_gestion' | 'planillas_gastos'
  archivo_path: string // <uid>/<YYYY-MM>/<timestamp>-<name>.<ext>
  archivo_mimetype: string
  creado_en: string
}

const TIPO_LABEL: Record<'gestion' | 'gastos', string> = {
  gestion: 'Planilla de gestión (fin de mes)',
  gastos: 'Planilla de gastos (fin de mes)',
}

const BUCKETS: Record<'gestion' | 'gastos', string> = {
  gestion: 'planillas_gestion',
  gastos: 'planillas_gastos',
}

const MAX_POR_TIPO = 2

function getProjectBaseUrl() {
  const restUrl = (supabase as any)?.restUrl as string | undefined
  if (restUrl) return restUrl.replace('/rest/v1', '')
  // @ts-ignore
  return process.env.EXPO_PUBLIC_SUPABASE_URL || ''
}

export default function PlanillasExternasScreen() {
  const [userId, setUserId] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [subiendo, setSubiendo] = useState<'gestion' | 'gastos' | null>(null)

  // ⬇️ Período seleccionable (por defecto mes actual)
  const [periodo, setPeriodo] = useState<string>(() => dayjs().format('YYYY-MM'))

  // Arrays por tipo (múltiples, tope 2)
  const [planillasMes, setPlanillasMes] = useState<Record<'gestion' | 'gastos', Planilla[]>>({
    gestion: [],
    gastos: [],
  })

  useEffect(() => {
    init()
  }, [])

  // re-cargar cuando cambie el período
  useEffect(() => {
    if (userId) cargarPlanillasMes(userId, periodo)
  }, [userId, periodo])

  const init = async () => {
    setCargando(true)
    const { data } = await supabase.auth.getUser()
    const uid = data.user?.id ?? null
    setUserId(uid)
    if (uid) await cargarPlanillasMes(uid, periodo)
    setCargando(false)
  }

  async function cargarPlanillasMes(uid: string, per: string) {
    const { data, error } = await supabase
      .from('planillas_ext')
      .select('*')
      .eq('usuario_id', uid)
      .eq('periodo', per)
      .order('creado_en', { ascending: false })

    if (error) {
      console.log('Error cargarPlanillasMes:', error)
      Alert.alert('Error', 'No se pudieron cargar las planillas.')
      return
    }

    const base: Record<'gestion'|'gastos', Planilla[]> = { gestion: [], gastos: [] }
    ;(data || []).forEach((p: Planilla) => { base[p.tipo].push(p) })
    setPlanillasMes(base)
  }

  const pickAndUpload = async (tipo: 'gestion' | 'gastos') => {
    if (!userId) {
      Alert.alert('Sesión', 'No hay usuario autenticado.')
      return
    }

    const existentes = planillasMes[tipo].length
    if (existentes >= MAX_POR_TIPO) {
      Alert.alert('Límite alcanzado', `Ya subiste ${MAX_POR_TIPO} archivos de ${tipo} para ${dayjs(`${periodo}-01`).format('MMMM YYYY')}.`)
      return
    }

    const pick = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ],
      multiple: false,
      copyToCacheDirectory: true
    })
    if (pick.canceled || !pick.assets?.length) return

    const file = pick.assets[0]
    const uri = file.uri
    const name = file.name || `archivo-${tipo}`
    const mime = file.mimeType || guessMimeFromName(name)

    try {
      setSubiendo(tipo)

      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 })
      const bytes = Buffer.from(base64, 'base64')

      const ext = getExtension(name, mime)
      const bucket = BUCKETS[tipo]
      const safeName = sanitizeFilename(name.replace(/\.[^/.]+$/, ''))
      // ruta única por mes seleccionado
      const path = `${userId}/${periodo}/${Date.now()}-${safeName}.${ext}`

      const baseUrl = getProjectBaseUrl()
      if (!baseUrl) {
        Alert.alert('Config', 'No se pudo resolver la URL del proyecto de Supabase.')
        setSubiendo(null)
        return
      }
      const uploadUrl = `${baseUrl}/storage/v1/object/${bucket}/${path}`

      const { data: keyData } = await supabase.auth.getSession()
      const accessToken = keyData.session?.access_token
      if (!accessToken) {
        Alert.alert('Error', 'No se pudo obtener token de acceso.')
        setSubiendo(null)
        return
      }

      const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': mime,
          'x-upsert': 'true',
        } as any,
        body: bytes as any,
      })

      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        console.log('Upload error:', res.status, txt)
        Alert.alert('Error', `No se pudo subir el archivo (HTTP ${res.status}).`)
        setSubiendo(null)
        return
      }

      // Insert (NO upsert) para permitir múltiples
      const { error: insertError } = await supabase
        .from('planillas_ext')
        .insert({
          usuario_id: userId,
          tipo,
          periodo, // <== periodo seleccionado
          bucket,
          archivo_path: path,
          archivo_mimetype: mime,
        })

      if (insertError) {
        console.log('Insert error planillas_ext:', insertError)
        Alert.alert('Aviso', `El archivo se subió pero no se pudo registrar: ${insertError.message}`)
      } else {
        await cargarPlanillasMes(userId, periodo)
        Alert.alert('Listo', 'Archivo subido correctamente.')
      }
    } catch (e: any) {
      console.log('Exception upload:', e)
      Alert.alert('Error', 'Ocurrió un problema subiendo el archivo.')
    } finally {
      setSubiendo(null)
    }
  }

  const verPlanilla = async (p: Planilla) => {
    // 1) Intento con Signed URL
    const { data, error } = await supabase
      .storage
      .from(p.bucket)
      .createSignedUrl(p.archivo_path, 60 * 5)

    if (data?.signedUrl) {
      Linking.openURL(encodeURI(data.signedUrl))
      return
    }

    // 2) Fallback a URL pública (si el bucket es público)
    const pub = supabase.storage.from(p.bucket).getPublicUrl(p.archivo_path)
    const url = pub?.data?.publicUrl
    if (url) {
      Linking.openURL(encodeURI(url))
      return
    }

    console.log('SignedUrl error:', error)
    Alert.alert('Error', 'No se pudo generar el enlace para abrir la planilla.')
  }

  if (cargando) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Cargando…</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.titulo}>
          Planillas (Período {dayjs(`${periodo}-01`).format('MMMM YYYY')})
        </Text>
        <Text style={styles.parrafo}>
          Máximo {MAX_POR_TIPO} archivos por tipo y por mes. Elegí el mes con los botones de abajo.
        </Text>

        {/* Selector de período */}
        <View style={styles.periodRow}>
          <TouchableOpacity
            style={styles.periodBtn}
            onPress={() => setPeriodo(dayjs(`${periodo}-01`).subtract(1, 'month').format('YYYY-MM'))}
          >
            <Text style={styles.periodBtnText}>◀ Mes anterior</Text>
          </TouchableOpacity>

          <View style={styles.periodBadge}>
            <Text style={styles.periodBadgeText}>
              {dayjs(`${periodo}-01`).format('MMMM YYYY')}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.periodBtn}
            onPress={() => setPeriodo(dayjs(`${periodo}-01`).add(1, 'month').format('YYYY-MM'))}
          >
            <Text style={styles.periodBtnText}>Mes siguiente ▶</Text>
          </TouchableOpacity>
        </View>

        {/* Gestión / Gastos */}
        {(['gestion','gastos'] as const).map((tipo) => {
          const lista = planillasMes[tipo]
          const existentes = lista.length
          const lleno = existentes >= MAX_POR_TIPO

          return (
            <View key={tipo} style={styles.card}>
              <Text style={styles.cardTitle}>
                {TIPO_LABEL[tipo]}{' '}
                <Text style={{ color: '#64748b' }}>({existentes}/{MAX_POR_TIPO})</Text>
              </Text>

              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.btn, (subiendo === tipo || lleno) && styles.btnDisabled]}
                  onPress={() => pickAndUpload(tipo)}
                  disabled={!!subiendo || lleno}
                >
                  <Text style={styles.btnText}>
                    {subiendo === tipo ? 'Subiendo…' : (lleno ? 'Máximo alcanzado' : 'Subir archivo')}
                  </Text>
                </TouchableOpacity>
              </View>

              {lista.length === 0 ? (
                <Text style={styles.meta}>Sin archivos este mes</Text>
              ) : (
                <View style={{ marginTop: 8, gap: 8 }}>
                  {lista.map((p) => (
                    <View key={p.id} style={styles.rowItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '700' }}>{fileNameFromPath(p.archivo_path)}</Text>
                        <Text style={{ fontSize: 12, color: '#475569' }}>
                          {p.archivo_mimetype} • subido {dayjs(p.creado_en).format('DD/MM/YYYY HH:mm')}
                        </Text>
                      </View>
                      <TouchableOpacity style={styles.btnSecondary} onPress={() => verPlanilla(p)}>
                        <Text style={styles.btnSecondaryText}>Ver / Descargar</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}

/* Helpers */
function guessMimeFromName(name: string) {
  const lower = name.toLowerCase()
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  if (lower.endsWith('.xls')) return 'application/vnd.ms-excel'
  return 'application/octet-stream'
}
function getExtension(name: string, mime: string) {
  const lower = name.toLowerCase()
  if (lower.endsWith('.pdf')) return 'pdf'
  if (lower.endsWith('.xlsx')) return 'xlsx'
  if (lower.endsWith('.xls')) return 'xls'
  if (mime === 'application/pdf') return 'pdf'
  if (mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'xlsx'
  if (mime === 'application/vnd.ms-excel') return 'xls'
  return 'bin'
}
function sanitizeFilename(name: string) {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}
function fileNameFromPath(p: string) {
  const parts = p.split('/')
  return parts[parts.length - 1] || p
}

/* UI */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff', paddingTop: 8 },
  container: { padding: 16, paddingBottom: 48, gap: 16 },
  center: { alignItems: 'center', justifyContent: 'center' },

  titulo: { fontSize: 20, fontWeight: '700', marginTop: 8 },
  parrafo: { fontSize: 14, color: '#555' },

  card: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 12, gap: 8, backgroundColor: '#fff' },
  cardTitle: { fontSize: 16, fontWeight: '600' },

  row: { flexDirection: 'row', gap: 10 },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
  },

  btn: { backgroundColor: '#111', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '600' },

  btnSecondary: { borderWidth: 1, borderColor: '#111', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  btnSecondaryText: { color: '#111', fontWeight: '600' },

  btnDisabled: { opacity: 0.5 },
  meta: { fontSize: 12, color: '#666' },

  /* Período */
  periodRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  periodBtn: { backgroundColor: '#111827', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  periodBtnText: { color: '#fff', fontWeight: '600' },
  periodBadge: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#e5e7eb' },
  periodBadgeText: { color: '#111827', fontWeight: '700', textTransform: 'capitalize' },
})
