// app/(alguna-ruta)/PerfilTecnico.tsx
import { supabase } from '@/constants/supabase'
import { Buffer } from 'buffer'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import { useLocalSearchParams } from 'expo-router'
import { shareAsync } from 'expo-sharing'
import { useEffect, useState } from 'react'
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
} from 'react-native'

dayjs.locale('es')
global.Buffer = Buffer as any

type Planilla = {
  id: number
  usuario_id: string
  tipo: 'gestion' | 'gastos'
  periodo: string
  bucket: string
  archivo_path: string
  archivo_mimetype: string
  creado_en: string
}

const TIPO_LABEL: Record<'gestion' | 'gastos', string> = {
  gestion: 'Planilla de gestión (fin de mes)',
  gastos: 'Planilla de gastos (fin de mes)',
}

export default function PerfilTecnico() {
  const { id } = useLocalSearchParams()
  const [tecnico, setTecnico] = useState<any>(null)
  const [tareas, setTareas] = useState<any[]>([])
  const [documentos, setDocumentos] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Selector de período
  const [periodo, setPeriodo] = useState<string>(() => dayjs().format('YYYY-MM'))

  // Arrays por tipo
  const [planillasMes, setPlanillasMes] = useState<Record<'gestion' | 'gastos', Planilla[]>>({
    gestion: [],
    gastos: [],
  })

  useEffect(() => {
    if (id) fetchDatos()
  }, [id])

  useEffect(() => {
    if (id) cargarPlanillasMes(String(id), periodo)
  }, [id, periodo])

  const fetchDatos = async () => {
    try {
      const { data: usuario, error: errorUsuario } = await supabase
        .from('usuarios')
        .select('id, nombre, apellido, empresa')
        .eq('id', id)
        .single()

      if (errorUsuario) {
        console.log('Error usuarios:', errorUsuario)
        Alert.alert('Error', 'No se pudo obtener el técnico.')
        return
      }

      // Avatar
      let avatar_url: string | null = null
      const { data: files, error: listError } = await supabase.storage
        .from('avatars')
        .list(`${usuario.id}`, {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' },
        })

      if (!listError && files && files.length > 0) {
        const latestFile = files[0].name
        const avatarPath = `${usuario.id}/${latestFile}`
        const { data: avatarData, error: avatarUrlError } = await supabase.storage
          .from('avatars')
          .getPublicUrl(avatarPath)
        if (!avatarUrlError) avatar_url = avatarData.publicUrl
      }

      setTecnico({ ...usuario, avatar_url })

      // Próximas tareas
      const { data: tareasProximas, error: errorTareas } = await supabase
        .from('trabajos_mantenimiento')
        .select('*')
        .eq('usuario_id', id)
        .gte('fecha_realizacion', new Date().toISOString())
        .order('fecha_realizacion', { ascending: true })

      if (!errorTareas) setTareas(tareasProximas || [])

      // Documentos (póliza / acta)
      const { data: doc, error: errorDoc } = await supabase
        .from('documentos_tecnicos')
        .select('*')
        .eq('tecnico_id', id)
        .maybeSingle()
      if (!errorDoc) setDocumentos(doc || null)
      // Planillas se recargan por useEffect(periodo)
    } catch (e) {
      console.log('fetchDatos exception:', e)
      Alert.alert('Error', 'Ocurrió un problema cargando el perfil.')
    }
  }

  const cargarPlanillasMes = async (tecnicoId: string, per: string) => {
    const { data, error } = await supabase
      .from('planillas_ext')
      .select('*')
      .eq('usuario_id', tecnicoId)
      .eq('periodo', per)
      .order('creado_en', { ascending: false })

    if (error) {
      console.log('Error cargarPlanillasMes:', error)
      return
    }

    const base: Record<'gestion' | 'gastos', Planilla[]> = { gestion: [], gastos: [] }
    ;(data || []).forEach((p: Planilla) => { base[p.tipo].push(p) })
    setPlanillasMes(base)
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchDatos()
    if (id) await cargarPlanillasMes(String(id), periodo)
    setRefreshing(false)
  }

  // ======= PÓLIZA / ACTA (sin cambios de lógica) =======
  const subirDocumento = async (tipo: 'poliza' | 'acta') => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    })
    if (result.canceled) return

    const file = result.assets[0]
    const fileUri = file.uri
    const bucket = tipo === 'poliza' ? 'polizas' : 'actacompromiso'
    const path = `${id}/${tipo}.pdf`

    try {
      const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 })
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('no se pudo obtener el token')

      const uploadRes = await fetch(
        `https://lknfaxkigownvjsijzhb.supabase.co/storage/v1/object/${bucket}/${path}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/pdf',
            Authorization: `Bearer ${token}`,
            'x-upsert': 'true',
          },
          body: Buffer.from(base64, 'base64'),
        }
      )

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text()
        console.error('Upload error:', uploadRes.status, errorText)
        Alert.alert('Error', 'Falló la subida del archivo.')
        return
      }

      const url = `https://lknfaxkigownvjsijzhb.supabase.co/storage/v1/object/public/${bucket}/${path}`
      const campo = tipo === 'poliza' ? 'poliza_url' : 'acta_compromiso_url'

      const { error } = await supabase
        .from('documentos_tecnicos')
        .upsert([{ tecnico_id: id, [campo]: url }])

      if (error) {
        console.error('Upsert documentos_tecnicos error:', error)
        Alert.alert('Error', 'No se pudo guardar la URL.')
        return
      }

      const { data: docActualizado } = await supabase
        .from('documentos_tecnicos')
        .select('*')
        .eq('tecnico_id', id)

      setDocumentos(docActualizado)
      Alert.alert('Éxito', `La ${tipo} fue subida correctamente.`)
    } catch (err: any) {
      console.error('subirDocumento exception:', err)
      Alert.alert('Error', err.message || 'Ocurrió un error inesperado.')
    }
  }

  const descargarArchivo = async (tipo: 'poliza' | 'acta') => {
    const bucket = tipo === 'poliza' ? 'polizas' : 'actacompromiso'
    const path = `${id}/${tipo}.pdf`
    const url = `https://lknfaxkigownvjsijzhb.supabase.co/storage/v1/object/public/${bucket}/${path}`

    try {
      const headRes = await fetch(url, { method: 'HEAD' })
      if (!headRes.ok) {
        Alert.alert('Aviso', `NO HAY ${tipo.toUpperCase()}`)
        return
      }

      const localPath = FileSystem.documentDirectory + `${tipo}.pdf`
      const downloadResumable = FileSystem.createDownloadResumable(url, localPath)
      const { uri } = await downloadResumable.downloadAsync()

      if (uri) {
        await shareAsync(uri)
      } else {
        Alert.alert('Error', `No se pudo descargar la ${tipo}.`)
      }
    } catch (e) {
      console.error(`descargarArchivo ${tipo} error:`, e)
      Alert.alert('Error', `Ocurrió un error al descargar la ${tipo}.`)
    }
  }

  const eliminarDocumento = async (tipo: 'poliza' | 'acta') => {
    Alert.alert(
      `Eliminar ${tipo}`,
      `¿Está seguro que desea eliminar la ${tipo === 'poliza' ? 'póliza' : 'acta'} actual?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const bucket = tipo === 'poliza' ? 'polizas' : 'actacompromiso'
            const path = `${id}/${tipo}.pdf`

            const { error } = await supabase.storage.from(bucket).remove([path])
            if (error) {
              Alert.alert('Error', `No se pudo eliminar la ${tipo}.`)
              return
            }

            const campo = tipo === 'poliza' ? 'poliza_url' : 'acta_compromiso_url'
            const { error: updateError } = await supabase
              .from('documentos_tecnicos')
              .update({ [campo]: null })
              .eq('tecnico_id', id)

            if (updateError) {
              Alert.alert('Error', 'No se pudo actualizar la base.')
              return
            }

            setDocumentos((prev: any) => ({ ...prev, [campo]: null }))
            Alert.alert('Éxito', `La ${tipo} fue eliminada correctamente.`)
          },
        },
      ]
    )
  }
  // ======= FIN PÓLIZA / ACTA =======

  const verPlanilla = async (p: Planilla) => {
    const { data, error } = await supabase
      .storage
      .from(p.bucket)
      .createSignedUrl(p.archivo_path, 60 * 5)

    if (error || !data?.signedUrl) {
      console.log('SignedUrl error:', error)
      Alert.alert('Error', 'No se pudo generar el enlace.')
      return
    }

    Linking.openURL(data.signedUrl)
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {tecnico && (
        <>
          <Image
            source={{
              uri: tecnico.avatar_url || 'https://ui-avatars.com/api/?name=User&background=ccc&color=000&size=128',
            }}
            style={styles.avatar}
          />
          <Text style={styles.nombre}>{tecnico.nombre} {tecnico.apellido}</Text>
          <Text style={styles.empresa}>Empresa asignada: {tecnico.empresa ?? 'Sin asignar'}</Text>

          <Text style={styles.subtitulo}>Próximas tareas:</Text>
          {tareas.length === 0 ? (
            <Text style={{ color: '#666', alignSelf: 'flex-start' }}>Sin tareas próximas</Text>
          ) : (
            tareas.map((t: any, i: number) => (
              <View key={i} style={styles.cardTarea}>
                <Text style={styles.tareaTitulo}>{t.descripcion}</Text>
                <Text style={styles.tareaFecha}>{dayjs(t.fecha_realizacion).format('DD/MM HH:mm')}hs</Text>
              </View>
            ))
          )}

          {/* Póliza / Acta */}
          <TouchableOpacity style={styles.boton} onPress={() => subirDocumento('poliza')}>
            <Text style={styles.botonTexto}>Subir póliza de seguro</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.boton} onPress={() => subirDocumento('acta')}>
            <Text style={styles.botonTexto}>Subir acta de compromiso</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.boton, { backgroundColor: '#22c55e' }]} onPress={() => descargarArchivo('poliza')}>
            <Text style={styles.botonTexto}>Descargar póliza de seguro</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.boton, { backgroundColor: '#22c55e' }]} onPress={() => descargarArchivo('acta')}>
            <Text style={styles.botonTexto}>Descargar acta de compromiso</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.boton, { backgroundColor: '#ef4444' }]} onPress={() => eliminarDocumento('poliza')}>
            <Text style={styles.botonTexto}>Eliminar póliza de seguro</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.boton, { backgroundColor: '#ef4444' }]} onPress={() => eliminarDocumento('acta')}>
            <Text style={styles.botonTexto}>Eliminar acta de compromiso</Text>
          </TouchableOpacity>

          {/* ---------- Planillas (período) ---------- */}
          <Text style={[styles.subtitulo, { marginTop: 24 }]}>
            Planillas (Período {periodo})
          </Text>

          {/* Controles de período */}
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

          {(['gestion', 'gastos'] as const).map((tipo) => {
            const lista = planillasMes[tipo]
            return (
              <View key={tipo} style={styles.cardTarea}>
                <Text style={styles.tareaTitulo}>{TIPO_LABEL[tipo]} <Text style={{ color: '#64748b' }}>({lista.length}/2)</Text></Text>

                {lista.length === 0 ? (
                  <Text style={{ color: '#64748b', marginTop: 4 }}>Sin archivo subido este mes</Text>
                ) : (
                  <View style={{ gap: 8, marginTop: 6 }}>
                    {lista.map((p) => (
                      <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                          <Text style={{ fontWeight: '600' }}>{nombreArchivo(p.archivo_path)}</Text>
                          <Text style={{ color: '#64748b', fontSize: 12 }}>
                            {p.archivo_mimetype} • subido {dayjs(p.creado_en).format('DD/MM/YYYY HH:mm')}
                          </Text>
                        </View>
                        <TouchableOpacity style={styles.botonMini} onPress={() => verPlanilla(p)}>
                          <Text style={styles.botonMiniTexto}>Ver / Descargar</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )
          })}
        </>
      )}
    </ScrollView>
  )
}

function nombreArchivo(path: string) {
  const parts = path.split('/')
  return parts[parts.length - 1] || path
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 70,
    padding: 24,
    paddingBottom: 56,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: '#1e40af',
    marginBottom: 16,
  },
  nombre: { fontSize: 22, fontWeight: 'bold' },
  empresa: { fontSize: 16, marginBottom: 20, color: '#475569' },
  subtitulo: { fontSize: 18, fontWeight: 'bold', alignSelf: 'flex-start', marginBottom: 8 },

  cardTarea: { backgroundColor: '#f3f4f6', padding: 12, borderRadius: 8, width: '100%', marginBottom: 10 },
  tareaTitulo: { fontWeight: 'bold' },
  tareaFecha: { color: '#2563EB', marginTop: 4 },

  boton: {
    backgroundColor: '#1e40af',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
  },
  botonTexto: { color: '#fff', fontWeight: 'bold' },

  botonMini: { backgroundColor: '#111827', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  botonMiniTexto: { color: '#fff', fontWeight: '600' },
  botonMiniDisabled: { opacity: 0.5 },

  /* Período */
  periodRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  periodBtn: { backgroundColor: '#111827', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  periodBtnText: { color: '#fff', fontWeight: '600' },
  periodBadge: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#e5e7eb' },
  periodBadgeText: { color: '#111827', fontWeight: '700', textTransform: 'capitalize' },
})
