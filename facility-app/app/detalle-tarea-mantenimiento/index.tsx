// detalle-tarea-mantenimiento con checklist, confirmación, pull-to-refresh y botón Volver visible dentro del contenido
import { supabase } from '@/constants/supabase'
import { Ionicons } from '@expo/vector-icons'
import { Buffer } from 'buffer'
import * as FileSystem from 'expo-file-system'
// Usa la API legacy para readAsStringAsync según recomendación del SDK 54
import * as FileSystemLegacy from 'expo-file-system/legacy'
import * as Print from 'expo-print'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { shareAsync } from 'expo-sharing'
import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native'
import Signature from 'react-native-signature-canvas'
import uuid from 'react-native-uuid'

global.Buffer = Buffer

function base64ToBytes(b64: string): Uint8Array {
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(b64, 'base64') as unknown as Uint8Array
    }
  } catch {}
  const binaryStr = typeof atob === 'function' ? atob(b64) : (globalThis as any).atob?.(b64)
  if (!binaryStr) throw new Error('No hay soporte para atob/base64 en este entorno')
  const bytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
  return bytes
}

export default function DetalleTareaScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams()
  const [tarea, setTarea] = useState<any>(null)
  const [checklist, setChecklist] = useState<{ texto: string; hecho: boolean }[]>([])
  const [cargando, setCargando] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [mostrarFirma, setMostrarFirma] = useState<null | 'tecnico' | 'responsable'>(null)
  const [firmaResponsable, setFirmaResponsable] = useState<string | null>(null)
  const [firmaTecnico, setFirmaTecnico] = useState<string | null>(null)
  const [refrescando, setRefrescando] = useState(false)
  // Mantener referencia al último PDF local generado para compartir offline
  const [lastLocalPdfUri, setLastLocalPdfUri] = useState<string | null>(null)

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
      return
    }

    setTarea(data)
    setPdfUrl(data?.parte_pdf || null)
    setChecklist(data?.checklist || [])
  }

  const onRefresh = useCallback(() => {
    setRefrescando(true)
    obtenerTarea().finally(() => setRefrescando(false))
  }, [])

  const toggleChecklist = async (index: number) => {
    const nuevoChecklist = [...checklist]
    nuevoChecklist[index].hecho = !nuevoChecklist[index].hecho
    setChecklist(nuevoChecklist)
    await supabase.from('trabajos_mantenimiento').update({ checklist: nuevoChecklist }).eq('id', id)
  }

  const marcarComoRealizado = () => {
    if (!checklist.every((i) => i.hecho)) {
      Alert.alert('Checklist incompleta', 'Debés completar todos los ítems para continuar')
      return
    }
    Alert.alert('Confirmar', '¿Estás seguro de que esta tarea está realizada?', [
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
    ])
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
                ${checklist.map((i) => `<li>[${i.hecho ? 'x' : ' '}] ${i.texto}</li>`).join('')}
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

      if (!uri) throw new Error('No se generó URI del PDF')
      const pdfBase64 = await FileSystemLegacy.readAsStringAsync(uri, {
        // SDK 54+: use string literal 'base64' to avoid type mismatch
        encoding: 'base64' as any,
      })
      if (!pdfBase64) throw new Error('PDF vacío (base64 no disponible)')

      const sessionRes = await supabase.auth.getSession()
      const token = sessionRes.data.session?.access_token
      if (!token) throw new Error('No se pudo obtener el token de sesión')

      const uploadUrl = `https://lknfaxkigownvjsijzhb.supabase.co/storage/v1/object/${bucket}/${path}`
      const uploadRes = await FileSystemLegacy.uploadAsync(uploadUrl, uri, {
        headers: {
          'Content-Type': 'application/pdf',
          Authorization: `Bearer ${token}`,
          'x-upsert': 'true',
        },
        httpMethod: 'PUT',
        uploadType: FileSystemLegacy.FileSystemUploadType.BINARY_CONTENT,
      })

      if (uploadRes.status !== 200) throw new Error(`Error al subir el PDF al storage: ${uploadRes.status}`)

      const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl

      const { error: updateError } = await supabase
        .from('trabajos_mantenimiento')
        .update({ parte_pdf: url })
        .eq('id', id)

      if (updateError) throw updateError

      Alert.alert('PDF generado y subido')
      // Guardamos el PDF local para permitir compartir/descargar offline
      setLastLocalPdfUri(uri)
      // Abrir hoja de compartir inmediatamente con el PDF recién generado
      try {
        await shareAsync(uri, { dialogTitle: 'Compartir parte técnico', UTI: 'com.adobe.pdf', mimeType: 'application/pdf' })
      } catch {}
      setPdfUrl(url)
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo generar PDF')
    }
    setCargando(false)
  }

  const descargarPDF = async () => {
    try {
      // Si tenemos el último PDF local generado, compartirlo directamente (offline-first)
      if (lastLocalPdfUri) {
        await shareAsync(lastLocalPdfUri, { dialogTitle: 'Compartir parte técnico', UTI: 'com.adobe.pdf', mimeType: 'application/pdf' })
        return
      }

      // Caso remoto: validar que haya URL
      if (!pdfUrl || typeof pdfUrl !== 'string') {
        Alert.alert('PDF', 'No hay PDF disponible. Generá el parte técnico primero.')
        return
      }

      // Elegimos un directorio escribible: documentDirectory (sandbox) o cacheDirectory.
      const docDir = (FileSystem as any).documentDirectory
      const cacheDir = (FileSystem as any).cacheDirectory
      const baseDir = (docDir || cacheDir)
      if (!baseDir) {
        Alert.alert('Error', 'No se encontró un directorio escribible para guardar el PDF')
        return
      }
      const safeBaseDir = String(baseDir).endsWith('/') ? String(baseDir) : String(baseDir) + '/'
      const ts = Date.now()
      const localPath = `${safeBaseDir}parte_tecnico_${id || 'tarea'}_${ts}.pdf`
      const res = await FileSystemLegacy.downloadAsync(pdfUrl, localPath)
      const uri = res?.uri || localPath
      if (uri) {
        await shareAsync(uri, { dialogTitle: 'Compartir parte técnico', UTI: 'com.adobe.pdf', mimeType: 'application/pdf' })
        return
      }
      Alert.alert('Error', 'No se pudo descargar el PDF')
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Hubo un problema al descargar el PDF')
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 200 }}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
      >
        {/* Botón Volver visible dentro del contenido */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backInline}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={20} color="#0f172a" />
          <Text style={styles.backInlineText}>Volver</Text>
        </TouchableOpacity>

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
            <Text style={styles.texto}>
              {new Date(tarea.fecha_realizacion).toLocaleString('es-AR')}
            </Text>

            <Text style={styles.label}>Asignado por:</Text>
            <Text style={styles.texto}>
              {tarea.asignador
                ? `${tarea.asignador.nombre} ${tarea.asignador.apellido}`
                : 'No especificado'}
            </Text>

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
              <TouchableOpacity
                style={styles.botonSecundario}
                onPress={() => setMostrarFirma('tecnico')}
              >
                <Text style={styles.botonTextoSecundario}>Firmar como técnico</Text>
              </TouchableOpacity>
            )}

            {!firmaResponsable && (
              <TouchableOpacity
                style={styles.botonSecundario}
                onPress={() => setMostrarFirma('responsable')}
              >
                <Text style={styles.botonTextoSecundario}>Firmar por responsable</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.botonSecundario}
              onPress={generarPDF}
              disabled={cargando}
            >
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
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: '90%',
                backgroundColor: '#fff',
                borderRadius: 12,
                overflow: 'hidden',
                paddingBottom: 0,
              }}
            >
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
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  // Safe area para notch
  safe: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 8,
  },
  container: { flex: 1, paddingHorizontal: 20, backgroundColor: '#fff' },

  // Botón volver inline, visible siempre
  backInline: {
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  backInlineText: { color: '#0f172a', fontWeight: '600' },

  titulo: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, marginTop: 8 },
  label: { fontWeight: 'bold', marginTop: 10 },
  texto: { fontSize: 16, marginBottom: 10 },

  itemChecklist: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginVertical: 4,
  },
  itemChecklistHecho: { backgroundColor: '#22c55e' },

  botonPrincipal: {
    backgroundColor: '#2563EB',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  botonTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  logo: {
    width: 270,
    height: 90,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  botonSecundario: {
    borderColor: '#2563EB',
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  botonTextoSecundario: { color: '#2563EB', fontWeight: 'bold', fontSize: 16 },
})
