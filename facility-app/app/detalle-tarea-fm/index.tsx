import { supabase } from '@/constants/supabase'
import { Buffer } from 'buffer'
import * as FileSystem from 'expo-file-system'
import * as Print from 'expo-print'
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

global.Buffer = Buffer

export default function DetalleTareaScreen() {
  const { id } = useLocalSearchParams()
  const [tarea, setTarea] = useState<any>(null)
  const [checklist, setChecklist] = useState<{ texto: string, hecho: boolean }[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  useEffect(() => {
    obtenerTarea()
  }, [])

  const obtenerTarea = async () => {
    const { data, error } = await supabase
      .from('trabajos_mantenimiento')
      .select(`
        *,
        usuarios:usuario_id (
          nombre,
          apellido
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      Alert.alert('Error', 'No se pudo obtener la tarea')
    } else {
      setTarea(data)
      setChecklist(data.checklist || [])
      setPdfUrl(data.parte_pdf || null)
    }
    setRefreshing(false)
  }

  const onRefresh = () => {
    setRefreshing(true)
    obtenerTarea()
  }

  const generarPDF = async () => {
    try {
      const hoy = new Date()
      const fecha = `${hoy.getDate()}/${hoy.getMonth() + 1}/${hoy.getFullYear()}`

      const html = `<html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; }
            .header { display: flex; justify-content: space-between; align-items: center; border: 1px solid #000; padding: 8px; }
            .logo { width: 150px; }
            .section-title { background-color: #4682B4; color: white; padding: 4px; font-weight: bold; font-size: 12px; }
            .info-row { display: flex; border-bottom: 1px solid #000; }
            .info-cell { flex: 1; padding: 6px; border-right: 1px solid #000; }
            .checklist { margin-top: 8px; }
          </style>
        </head>
        <body>
          <div class="header">
            <img class="logo" src="https://lknfaxkigownvjsijzhb.supabase.co/storage/v1/object/public/publicos//facilitylogo.png" />
            <div style="font-size: 10px; text-align: right;">
              <div><strong>Fecha:</strong> ${fecha}</div>
            </div>
          </div>

          <div class="section-title">Información General</div>
          <div class="info-row">
            <div class="info-cell"><strong>Empresa:</strong> ${tarea.empresa}</div>
            <div class="info-cell"><strong>Sucursal:</strong> ${tarea.sucursal}</div>
          </div>
          <div class="info-row">
            <div class="info-cell"><strong>Provincia:</strong> ${tarea.provincia}</div>
            <div class="info-cell"><strong>Localidad:</strong> ${tarea.localidad}</div>
          </div>
          <div class="info-row">
            <div class="info-cell"><strong>Dirección:</strong> ${tarea.direccion}</div>
            <div class="info-cell"><strong>Técnico:</strong> ${tarea.usuarios?.nombre || '-'} ${tarea.usuarios?.apellido || ''}</div>
          </div>

          <div class="section-title">Descripción</div>
          <div class="info-row">
            <div class="info-cell" style="flex: 2;">${tarea.descripcion}</div>
          </div>

          <div class="section-title">Comentarios</div>
          <div class="info-row">
            <div class="info-cell" style="flex: 2;">${tarea.comentarios || 'Sin comentarios'}</div>
          </div>

          <div class="section-title">Checklist</div>
          <div class="info-row">
            <div class="info-cell" style="flex: 2;">
              <ul class="checklist">
                ${checklist.map(i => `<li>[${i.hecho ? 'x' : ' '}] ${i.texto}</li>`).join('')}
              </ul>
            </div>
          </div>
        </body>
      </html>`

      const { uri } = await Print.printToFileAsync({ html })
      const nombreArchivo = `${id}_parte_fm.pdf`
      const bucket = 'partestecnicos'
      const path = `pdfs/${nombreArchivo}`

      const pdfBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64
      })

      const sessionRes = await supabase.auth.getSession()
      const token = sessionRes.data.session?.access_token
      if (!token) throw new Error('No se pudo obtener el token de sesión')

      const response = await fetch(
        `https://lknfaxkigownvjsijzhb.supabase.co/storage/v1/object/${bucket}/${path}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/pdf',
            'Authorization': `Bearer ${token}`,
            'x-upsert': 'true',
          },
          body: Buffer.from(pdfBase64, 'base64'),
        }
      )

      if (!response.ok) throw new Error('Error al subir el PDF al storage')

      const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl

      await supabase
        .from('trabajos_mantenimiento')
        .update({ parte_pdf: url })
        .eq('id', id)

      setPdfUrl(url)
      Alert.alert('Éxito', 'PDF generado y subido')
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo generar PDF')
    }
  }

  const descargarPDF = async () => {
    if (!pdfUrl) return

    try {
      const localPath = FileSystem.documentDirectory + 'parte_tecnico.pdf'
      const downloadResumable = FileSystem.createDownloadResumable(pdfUrl, localPath)
      const downloadResult = await downloadResumable.downloadAsync()
      const uri = downloadResult?.uri

      if (uri) {
        await shareAsync(uri)
      } else {
        Alert.alert('Error', 'No se pudo descargar el PDF')
      }
    } catch (error) {
      Alert.alert('Error', 'Hubo un problema al descargar el PDF')
    }
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Image
        source={require('@/assets/images/logo.png')}
        style={styles.logo}
      />

      <Text style={styles.titulo}>Detalle de la Tarea</Text>

      {tarea && (
        <>
          <Text style={styles.label}>Empresa:</Text>
          <Text style={styles.texto}>{tarea.empresa}</Text>

          <Text style={styles.label}>Asignado a:</Text>
          <Text style={styles.texto}>
            {tarea.usuarios?.nombre} {tarea.usuarios?.apellido}
          </Text>

          <Text style={styles.label}>Sucursal:</Text>
          <Text style={styles.texto}>{tarea.sucursal}</Text>

          <Text style={styles.label}>Provincia:</Text>
          <Text style={styles.texto}>{tarea.provincia}</Text>

          <Text style={styles.label}>Localidad:</Text>
          <Text style={styles.texto}>{tarea.localidad}</Text>

          <Text style={styles.label}>Dirección:</Text>
          <Text style={styles.texto}>{tarea.direccion}</Text>

          <Text style={styles.label}>Fecha y hora de realización:</Text>
          <Text style={styles.texto}>
            {new Date(tarea.fecha_realizacion).toLocaleString('es-AR')}
          </Text>

          <Text style={styles.label}>Descripción:</Text>
          <Text style={styles.texto}>{tarea.descripcion}</Text>

          <Text style={styles.label}>Estado:</Text>
          <Text style={styles.texto}>{tarea.estado}</Text>

          <Text style={styles.label}>Comentarios:</Text>
          <Text style={styles.texto}>{tarea.comentarios || 'Sin comentarios'}</Text>

          <Text style={styles.label}>Checklist:</Text>
          {checklist.length > 0 ? (
            checklist.map((item, index) => (
              <View
                key={index}
                style={[
                  styles.itemChecklist,
                  item.hecho ? styles.itemChecklistHecho : styles.itemChecklistPendiente,
                ]}
              >
                <Text style={styles.textoChecklist}>{item.texto}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.texto}>Sin checklist definido</Text>
          )}

          <TouchableOpacity style={styles.boton} onPress={generarPDF}>
            <Text style={styles.botonTexto}>Generar parte técnico</Text>
          </TouchableOpacity>

          {pdfUrl && (
            <TouchableOpacity style={styles.botonSecundario} onPress={descargarPDF}>
              <Text style={styles.botonTextoSecundario}>Descargar parte técnico</Text>
            </TouchableOpacity>
          )}
        </>
      )}
      <View style={{ height: 180 }} />

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff'
  },
  logo: {
    width: 270,
    height: 90,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginTop: 34,
    marginBottom: 20,
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 30,
    alignSelf: 'center',
  },
  label: {
    fontWeight: 'bold',
    marginTop: 10
  },
  texto: {
    fontSize: 16,
    marginBottom: 10
  },
  itemChecklist: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginVertical: 4
  },
  itemChecklistHecho: {
    borderColor: '#22c55e',
    backgroundColor: '#dcfce7'
  },
  itemChecklistPendiente: {
    borderColor: '#ef4444',
    backgroundColor: '#fee2e2'
  },
  textoChecklist: {
    fontSize: 15,
    color: '#111'
  },
  boton: {
    backgroundColor: '#2563EB',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  botonTexto: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  botonSecundario: {
    borderColor: '#2563EB',
    borderWidth: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  botonTextoSecundario: {
    color: '#2563EB',
    fontWeight: 'bold',
    fontSize: 16,
  }
})
