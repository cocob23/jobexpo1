import { useState } from 'react'
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import { supabase } from '@/constants/supabase'
import uuid from 'react-native-uuid'
import { Buffer } from 'buffer'

global.Buffer = Buffer

export default function SubirNotisScreen() {
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [archivo, setArchivo] = useState<any>(null)
  const [subiendo, setSubiendo] = useState(false)

  const seleccionarPDF = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    })

    if (result.canceled) return

    setArchivo(result.assets[0])
  }

  const subirNoti = async () => {
    if (!titulo || !descripcion || !archivo) {
      Alert.alert('Faltan datos', 'Completá todos los campos y seleccioná un PDF')
      return
    }

    setSubiendo(true)

    try {
      const fileUri = archivo.uri
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('No se pudo obtener el token')

      const nombreArchivo = `${uuid.v4()}.pdf`
      const bucket = 'notis'
      const path = nombreArchivo

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
        console.error('❌ Error al subir PDF:', errorText)
        Alert.alert('Error', 'No se pudo subir el PDF')
        return
      }

      const publicUrl = `https://lknfaxkigownvjsijzhb.supabase.co/storage/v1/object/public/${bucket}/${path}`

      const { error: insertError } = await supabase.from('notis').insert({
        titulo,
        descripcion,
        archivo_url: publicUrl,
        estado: 'pendiente',
      })

      if (insertError) {
        console.error('❌ Error insertando noti:', insertError)
        Alert.alert('Error', 'No se pudo guardar la noti')
        return
      }

      Alert.alert('Éxito', 'Noti subida correctamente')
      setTitulo('')
      setDescripcion('')
      setArchivo(null)
    } catch (error) {
      console.error('❌ Error inesperado:', error)
      Alert.alert('Error', error.message || 'Ocurrió un error inesperado')
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Subir Noti (PDF)</Text>

      <TextInput
        placeholder="Título"
        style={styles.input}
        value={titulo}
        onChangeText={setTitulo}
      />

      <TextInput
        placeholder="Descripción"
        multiline
        style={[styles.input, { height: 100 }]}
        value={descripcion}
        onChangeText={setDescripcion}
      />

      <TouchableOpacity style={styles.botonArchivo} onPress={seleccionarPDF}>
        <Text style={styles.botonTexto}>
          {archivo ? 'Cambiar PDF' : 'Seleccionar PDF'}
        </Text>
      </TouchableOpacity>

      {archivo && (
        <Text style={styles.nombreArchivo}>📄 {archivo.name}</Text>
      )}

      <TouchableOpacity
        style={[styles.boton, subiendo && { opacity: 0.6 }]}
        onPress={subirNoti}
        disabled={subiendo}
      >
        <Text style={styles.botonTexto}>
          {subiendo ? 'Subiendo...' : 'Subir Noti'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  boton: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  botonArchivo: {
    backgroundColor: '#ddd',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  botonTexto: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  nombreArchivo: {
    fontSize: 14,
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
})
