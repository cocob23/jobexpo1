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
  View
} from 'react-native'

dayjs.locale('es')
global.Buffer = Buffer

export default function PerfilTecnico() {
  const { id } = useLocalSearchParams()
  const [tecnico, setTecnico] = useState(null)
  const [tareas, setTareas] = useState([])
  const [documentos, setDocumentos] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (id) fetchDatos()
  }, [id])

  const fetchDatos = async () => {
    const { data: usuario, error: errorUsuario } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido')
      .eq('id', id)
      .single()

    if (errorUsuario) {
      console.error('Error obteniendo datos del técnico:', errorUsuario)
      return
    }

    let avatar_url = null
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

      if (!avatarUrlError) {
        avatar_url = avatarData.publicUrl
      }
    }

    setTecnico({ ...usuario, avatar_url })

    const { data: tareasProximas, error: errorTareas } = await supabase
      .from('trabajos_mantenimiento')
      .select('*')
      .eq('usuario_id', id)
      .gte('fecha_realizacion', new Date().toISOString())
      .order('fecha_realizacion', { ascending: true })

    if (!errorTareas) {
      setTareas(tareasProximas || [])
    }

    const { data: doc, error: errorDoc } = await supabase
      .from('documentos_tecnicos')
      .select('*')
      .eq('tecnico_id', id)
      .maybeSingle()

    if (!errorDoc) {
      setDocumentos(doc)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchDatos()
    setRefreshing(false)
  }

  const subirDocumento = async (tipo) => {
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
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      })

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
        console.error('❌ Error detallado:', errorText)

        if (errorText.includes('new row violates row-level security policy')) {
          Alert.alert('Archivo existente', `Debe eliminar la ${tipo === 'poliza' ? 'póliza' : 'acta'} actual antes de subir una nueva.`)
        } else {
          Alert.alert('Error', 'Falló la subida del archivo.')
        }
        return
      }

      const url = `https://lknfaxkigownvjsijzhb.supabase.co/storage/v1/object/public/${bucket}/${path}`
      const campo = tipo === 'poliza' ? 'poliza_url' : 'acta_compromiso_url'

      const { error } = await supabase
        .from('documentos_tecnicos')
        .upsert([{ tecnico_id: id, [campo]: url }])

      if (error) {
        console.error('❌ error en upsert:', error)
        Alert.alert('error', 'no se pudo guardar la URL.')
        return
      }

      const { data: docActualizado } = await supabase
        .from('documentos_tecnicos')
        .select('*')
        .eq('tecnico_id', id)

      setDocumentos(docActualizado)
      Alert.alert('éxito', `La ${tipo} fue subida correctamente.`)
    } catch (err) {
      console.error('❌ error inesperado:', err)
      Alert.alert('error', err.message || 'ocurrió un error inesperado.')
    }
  }

  const descargarArchivo = async (tipo) => {
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
      console.error(`❌ error al descargar ${tipo}:`, e)
      Alert.alert('Error', `Ocurrió un error al descargar la ${tipo}.`)
    }
  }

  const eliminarDocumento = async (tipo) => {
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

            setDocumentos((prev) => ({ ...prev, [campo]: null }))
            Alert.alert('Éxito', `La ${tipo} fue eliminada correctamente.`)
          },
        },
      ]
    )
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
          <Text style={styles.empresa}>Empresa asignada: {tecnico.empresa || 'Sin asignar'}</Text>

          <Text style={styles.subtitulo}>Próximas tareas:</Text>
          {tareas.length === 0 ? (
            <Text style={{ color: '#666' }}>Sin tareas próximas</Text>
          ) : (
            tareas.map((t, i) => (
              <View key={i} style={styles.cardTarea}>
                <Text style={styles.tareaTitulo}>{t.descripcion}</Text>
                <Text style={styles.tareaFecha}>{dayjs(t.fecha_realizacion).format('DD/MM HH:mm')}hs</Text>
              </View>
            ))
          )}

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
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 70,
    padding: 24,
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
  nombre: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  empresa: {
    fontSize: 16,
    marginBottom: 20,
    color: '#475569',
  },
  subtitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  cardTarea: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    width: '100%',
    marginBottom: 10,
  },
  tareaTitulo: {
    fontWeight: 'bold',
  },
  tareaFecha: {
    color: '#2563EB',
    marginTop: 4,
  },
  boton: {
    backgroundColor: '#1e40af',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
  },
  botonTexto: {
    color: '#fff',
    fontWeight: 'bold',
  },
})
