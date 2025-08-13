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
  bucket: string  // NUEVO: 'planillas_gestion' | 'planillas_gastos'
  archivo_path: string // ej: <uid>/YYYY-MM.xlsx (ruta relativa dentro del bucket)
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

// Obtiene https://<project>.supabase.co a partir de restUrl
function getProjectBaseUrl() {
  const restUrl = (supabase as any)?.restUrl as string | undefined
  if (restUrl) return restUrl.replace('/rest/v1', '')
  // Fallback a variable pública si la usás:
  // @ts-ignore
  return process.env.EXPO_PUBLIC_SUPABASE_URL || ''
}

export default function PlanillasExternasScreen() {
  const [userId, setUserId] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [subiendo, setSubiendo] = useState<'gestion' | 'gastos' | null>(null)
  const [planillasMes, setPlanillasMes] = useState<Record<'gestion' | 'gastos', Planilla | null>>({
    gestion: null,
    gastos: null
  })

  const periodoActual = dayjs().format('YYYY-MM')

  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    setCargando(true)
    const { data } = await supabase.auth.getUser()
    const uid = data.user?.id ?? null
    setUserId(uid)
    if (uid) await cargarPlanillasMes(uid)
    setCargando(false)
  }

  const cargarPlanillasMes = async (uid: string) => {
    const { data, error } = await supabase
      .from('planillas_ext')
      .select('*')
      .eq('usuario_id', uid)
      .eq('periodo', periodoActual)

    if (error) {
      console.log('Error cargarPlanillasMes:', error)
      Alert.alert('Error', 'No se pudieron cargar las planillas.')
      return
    }

    const base = { gestion: null, gastos: null } as Record<'gestion'|'gastos', Planilla | null>
    ;(data || []).forEach((p: Planilla) => {
      base[p.tipo] = p
    })
    setPlanillasMes(base)
  }

  const pickAndUpload = async (tipo: 'gestion' | 'gastos') => {
    if (!userId) {
      Alert.alert('Sesión', 'No hay usuario autenticado.')
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
      // Guardamos por usuario y mes: <uid>/<YYYY-MM>.<ext>
      const path = `${userId}/${periodoActual}.${ext}`

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
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': mime,
          'x-upsert': 'true'
        } as any,
        body: bytes as any
      })

      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        console.log('Upload error:', res.status, txt)
        Alert.alert('Error', `No se pudo subir el archivo (HTTP ${res.status}).`)
        setSubiendo(null)
        return
      }

      // Registramos/actualizamos en la tabla
      const { error: upsertError } = await supabase
        .from('planillas_ext')
        .upsert({
          usuario_id: userId,
          tipo,
          periodo: periodoActual,
          bucket,             // guardamos bucket
          archivo_path: path, // ruta relativa dentro del bucket
          archivo_mimetype: mime
        }, { onConflict: 'usuario_id,tipo,periodo' })

      if (upsertError) {
        console.log('Upsert error planillas_ext:', upsertError)
        Alert.alert('Aviso', 'El archivo se subió pero no se pudo registrar en la base.')
      } else {
        await cargarPlanillasMes(userId)
        Alert.alert('Listo', 'Archivo subido correctamente.')
      }
    } catch (e: any) {
      console.log('Exception upload:', e)
      Alert.alert('Error', 'Ocurrió un problema subiendo el archivo.')
    } finally {
      setSubiendo(null)
    }
  }

  const verPlanilla = async (p: Planilla | null) => {
    if (!p) {
      Alert.alert('Sin archivo', 'Todavía no hay archivo para este mes.')
      return
    }

    const { data, error } = await supabase
      .storage
      .from(p.bucket) // usa el bucket guardado
      .createSignedUrl(p.archivo_path, 60 * 5)

    if (error || !data?.signedUrl) {
      console.log('SignedUrl error:', error)
      Alert.alert('Error', 'No se pudo generar el enlace.')
      return
    }

    Linking.openURL(data.signedUrl)
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
        <Text style={styles.titulo}>Planillas (Periodo {periodoActual})</Text>
        <Text style={styles.parrafo}>
          Subí a fin de mes tus planillas en PDF o Excel. Podés reemplazar el archivo del mes actual.
        </Text>

        {(['gestion','gastos'] as const).map((tipo) => {
          const current = planillasMes[tipo]
          return (
            <View key={tipo} style={styles.card}>
              <Text style={styles.cardTitle}>{TIPO_LABEL[tipo]}</Text>

              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.btn, subiendo === tipo && styles.btnDisabled]}
                  onPress={() => pickAndUpload(tipo)}
                  disabled={!!subiendo}
                >
                  <Text style={styles.btnText}>{subiendo === tipo ? 'Subiendo…' : 'Subir / Reemplazar'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnSecondary, !current && styles.btnDisabled]}
                  onPress={() => verPlanilla(current)}
                  disabled={!current}
                >
                  <Text style={styles.btnSecondaryText}>{current ? 'Ver / Descargar' : 'Sin archivo'}</Text>
                </TouchableOpacity>
              </View>

              {current && (
                <Text style={styles.meta}>
                  Archivo: {fileNameFromPath(current.archivo_path)} • {current.archivo_mimetype}
                </Text>
              )}
            </View>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}

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

function fileNameFromPath(p: string) {
  const parts = p.split('/')
  return parts[parts.length - 1] || p
}

const styles = StyleSheet.create({
  // margen superior + fondo blanco para evitar notch y dar aire
  safe: { flex: 1, backgroundColor: '#fff', paddingTop: 8 },
  // más padding abajo para que no quede todo pegado
  container: { padding: 16, paddingBottom: 48, gap: 16 },
  center: { alignItems: 'center', justifyContent: 'center' },

  titulo: { fontSize: 20, fontWeight: '700', marginTop: 8 },
  parrafo: { fontSize: 14, color: '#555' },

  card: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 12, gap: 8, backgroundColor: '#fff' },
  cardTitle: { fontSize: 16, fontWeight: '600' },

  row: { flexDirection: 'row', gap: 10 },
  btn: { backgroundColor: '#111', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '600' },

  btnSecondary: { borderWidth: 1, borderColor: '#111', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  btnSecondaryText: { color: '#111', fontWeight: '600' },

  btnDisabled: { opacity: 0.5 },
  meta: { fontSize: 12, color: '#666' },
})
