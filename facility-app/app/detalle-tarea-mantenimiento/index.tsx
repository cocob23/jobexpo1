// detalle-tarea-mantenimiento actualizado con checklist, confirmación y pull to refresh
import { supabase } from '@/constants/supabase'
import { Ionicons } from '@expo/vector-icons'
import { Buffer } from 'buffer'
import * as FileSystem from 'expo-file-system'
import * as Print from 'expo-print'
import { useLocalSearchParams } from 'expo-router'
import { shareAsync } from 'expo-sharing'
import { useCallback, useEffect, useState } from 'react'
import {
  Alert, Image, Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import Signature from 'react-native-signature-canvas'
import uuid from 'react-native-uuid'

global.Buffer = Buffer

export default function DetalleTareaScreen() {
  const { id } = useLocalSearchParams()
  const [tarea, setTarea] = useState<any>(null)
  const [checklist, setChecklist] = useState<{ texto: string, hecho: boolean }[]>([])
  const [cargando, setCargando] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [mostrarFirma, setMostrarFirma] = useState<null | 'tecnico' | 'responsable'>(null)
  const [firmaResponsable, setFirmaResponsable] = useState<string | null>(null)
  const [firmaTecnico, setFirmaTecnico] = useState<string | null>(null)
  const [refrescando, setRefrescando] = useState(false)

  useEffect(() => {
    obtenerTarea()
    setFirmaResponsable(null)
  }, [id])

  const obtenerTarea = async () => {
    const { data, error } = await supabase
      .from('trabajos_mantenimiento')
      .select('*, asignador:fm_id(nombre, apellido), tecnico:usuario_id(nombre, apellido)')
      .eq('id', id)
      .single()

    if (error) {
      Alert.alert('Error', 'No se pudo obtener la tarea')
    } else {
      setTarea(data)
      setPdfUrl(data.parte_pdf || null)
      const lista = data.checklist || []
      setChecklist(lista)
    }
  }

  const onRefresh = useCallback(() => {
    setRefrescando(true)
    obtenerTarea().finally(() => setRefrescando(false))
  }, [])

  const toggleChecklist = async (index: number) => {
    const nuevoChecklist = [...checklist]
    nuevoChecklist[index].hecho = !nuevoChecklist[index].hecho
    setChecklist(nuevoChecklist)

    await supabase
      .from('trabajos_mantenimiento')
      .update({ checklist: nuevoChecklist })
      .eq('id', id)
  }

  const marcarComoRealizado = () => {
    if (!checklist.every(item => item.hecho)) {
      Alert.alert('Checklist incompleta', 'Debés completar todos los ítems para continuar')
      return
    }

    Alert.alert(
      'Confirmar',
      '¿Estás seguro de que esta tarea está realizada?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, confirmar',
          onPress: async () => {
            const { error } = await supabase
              .from('trabajos_mantenimiento')
              .update({ estado: 'Realizado' })
              .eq('id', id)

            if (error) Alert.alert('Error', error.message)
            else {
              Alert.alert('Tarea marcada como realizada')
              obtenerTarea()
            }
          },
        },
      ]
    )
  }

  const generarPDF = async () => {
    setCargando(true)
    try {
      const hoy = new Date()
      const fecha = `${hoy.getDate()}/${hoy.getMonth() + 1}/${hoy.getFullYear()}`

      const html = `<html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; }
            .header { display: flex; justify-content: space-between; align-items: center; border: 1px solid #000; padding: 8px; }
            .logo { width: 150px; }
            .horarios { font-size: 11px; text-align: right; }
            .section-title { background-color: #4682B4; color: white; padding: 4px; font-weight: bold; font-size: 12px; }
            .info-row { display: flex; border-bottom: 1px solid #000; }
            .info-cell { flex: 1; padding: 6px; border-right: 1px solid #000; }
            .checklist { margin-top: 8px; }
            .firma-row { display: flex; border-top: 1px solid #000; margin-top: 40px; }
            .firma-cell { flex: 1; border-right: 1px solid #000; height: 80px; text-align: center; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="header">
            <img class="logo" src="https://lknfaxkigownvjsijzhb.supabase.co/storage/v1/object/public/publicos//facilitylogo.png" />
            <div class="horarios">
              <div>Horario de ingreso a sucursal:</div>
              <div>Horario de finalización de tareas:</div>
            </div>
          </div>

          <div class="section-title">Información General</div>
          <div class="info-row">
            <div class="info-cell"><strong>EMPRESA:</strong> ${tarea.empresa}</div>
            <div class="info-cell"><strong>Sucursal:</strong> ${tarea.sucursal}</div>
          </div>
          <div class="info-row">
            <div class="info-cell"><strong>Provincia:</strong> ${tarea.provincia}</div>
            <div class="info-cell"><strong>Fecha:</strong> ${fecha}</div>
          </div>
          <div class="info-row">
            <div class="info-cell"><strong>Localidad:</strong> ${tarea.localidad}</div>
            <div class="info-cell"><strong>Técnico:</strong> ${tarea.tecnico?.nombre || ''} ${tarea.tecnico?.apellido || ''}</div>
          </div>

          <div class="section-title">Detalle del Pedido/s</div>
          <div class="info-row">
            <div class="info-cell" style="flex: 2;">${tarea.descripcion}</div>
          </div>

          <div class="section-title">Tareas Realizadas - Observaciones</div>
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

            <div class="firma-row">
            <div class="firma-cell">
              <div><strong>Firma Técnico</strong></div>
              ${firmaTecnico ? `<img src="${firmaTecnico}" style="width: 100px; margin-top: 4px;" />` : ''}
            </div>
            <div class="firma-cell">
              <div><strong>Firma Responsable</strong></div>
              ${firmaResponsable ? `<img src="${firmaResponsable}" style="width: 100px; margin-top: 4px;" />` : ''}
            </div>
          </div>
        </body>
      </html>` 

      const { uri } = await Print.printToFileAsync({ html })
      const nombreArchivo = `${id}_${uuid.v4()}.pdf`
      const bucket = 'partestecnicos'
      const path = `pdfs/${nombreArchivo}`

      const pdfBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64
      })

      const sessionRes = await supabase.auth.getSession()
      const token = sessionRes.data.session?.access_token
      if (!token) throw new Error('No se pudo obtener el token de sesión')

      const response = await fetch(`https://lknfaxkigownvjsijzhb.supabase.co/storage/v1/object/${bucket}/${path}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/pdf',
          'Authorization': `Bearer ${token}`,
          'x-upsert': 'true'
        },
        body: Buffer.from(pdfBase64, 'base64')
      })

      if (!response.ok) throw new Error('Error al subir el PDF al storage')

      const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl

      const { error: updateError } = await supabase
        .from('trabajos_mantenimiento')
        .update({ parte_pdf: url })
        .eq('id', id)

      if (updateError) throw updateError

      Alert.alert('PDF generado y subido')
      setPdfUrl(url)
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo generar PDF')
    }
    setCargando(false)
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
      contentContainerStyle={{ paddingBottom: 200 }}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} />}
    >
      <Image source={require('@/assets/images/logo.png')} style={styles.logo} />
      <Text style={styles.titulo}>Detalle de la Tarea</Text>

      {tarea && (
        <>
          <Text style={styles.label}>Empresa:</Text>
          <Text style={styles.texto}>{tarea.empresa}</Text>

          <Text style={styles.label}>Sucursal:</Text>
          <Text style={styles.texto}>{tarea.sucursal}</Text>

          <Text style={styles.label}>Provincia:</Text>
          <Text style={styles.texto}>{tarea.provincia}</Text>

          <Text style={styles.label}>Localidad:</Text>
          <Text style={styles.texto}>{tarea.localidad}</Text>

          <Text style={styles.label}>Direccion:</Text>
          <Text style={styles.texto}>{tarea.direccion}</Text>

          <Text style={styles.label}>Fecha y hora de realizacion:</Text>
          <Text style={styles.texto}>{new Date(tarea.fecha_realizacion).toLocaleString('es-AR')}</Text>

          <Text style={styles.label}>Asignado por:</Text>
          <Text style={styles.texto}>{tarea.asignador ? `${tarea.asignador.nombre} ${tarea.asignador.apellido}` : 'No especificado'}</Text>

          <Text style={styles.label}>Descripción:</Text>
          <Text style={styles.texto}>{tarea.descripcion}</Text>

          <Text style={styles.label}>Estado:</Text>
          <Text style={styles.texto}>{tarea.estado}</Text>

          <Text style={styles.label}>Comentarios:</Text>
          <Text style={styles.texto}>{tarea.comentarios || 'Sin comentarios'}</Text>

          <Text style={styles.label}>Checklist:</Text>
          {checklist.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.itemChecklist, item.hecho && styles.itemChecklistHecho]}
              onPress={() => toggleChecklist(index)}
            >
              <Text style={{ color: item.hecho ? '#fff' : '#000' }}>{item.texto}</Text>
            </TouchableOpacity>
          ))}

          {!firmaTecnico && (
            <TouchableOpacity style={styles.botonSecundario} onPress={() => setMostrarFirma('tecnico')}>
              <Text style={styles.botonTextoSecundario}>Firmar como técnico</Text>
            </TouchableOpacity>
          )}

          {!firmaResponsable && (
            <TouchableOpacity style={styles.botonSecundario} onPress={() => setMostrarFirma('responsable')}>
              <Text style={styles.botonTextoSecundario}>Firmar por responsable</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.botonSecundario} onPress={generarPDF} disabled={cargando}>
            <Text style={styles.botonTextoSecundario}>Generar parte técnico</Text>
          </TouchableOpacity>

          {pdfUrl && (
            <TouchableOpacity style={styles.botonSecundario} onPress={descargarPDF}>
              <Text style={styles.botonTextoSecundario}>Descargar parte técnico</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.botonPrincipal} onPress={marcarComoRealizado}>
            <Text style={styles.botonTexto}>Marcar como realizado</Text>
          </TouchableOpacity>
        </>
      )}

      <Modal visible={mostrarFirma !== null} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '90%', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', paddingBottom: 0 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 8 }}>
              <Pressable onPress={() => setMostrarFirma(null)}>
                <Ionicons name="close" size={28} color="#000" />
              </Pressable>
            </View>
            <View style={{ height: 360, width: '100%' }}>
              <Signature
                onOK={(img) => {
                  if (mostrarFirma === 'tecnico') setFirmaTecnico(img)
                  if (mostrarFirma === 'responsable') setFirmaResponsable(img)
                  setMostrarFirma(null)
                }}
                onEmpty={() => Alert.alert('La firma está vacía')}
                descriptionText=""
                clearText="Limpiar"
                confirmText="Guardar"
                autoClear={true}
                backgroundColor="#fff"
                webStyle={`...`}
                style={{ height: 340, width: '100%' }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  titulo: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, marginTop: 30 },
  label: { fontWeight: 'bold', marginTop: 10 },
  texto: { fontSize: 16, marginBottom: 10 },
  itemChecklist: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginVertical: 4
  },
  itemChecklistHecho: { backgroundColor: '#22c55e' },
  botonPrincipal: {
    backgroundColor: '#2563EB',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20
  },
  botonTexto: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  logo: {
    width: 270,
    height: 90,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginTop: 34,
    marginBottom: 20
  },
  botonSecundario: {
    borderColor: '#2563EB',
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12
  },
  botonTextoSecundario: {
    color: '#2563EB',
    fontWeight: 'bold',
    fontSize: 16
  }
})