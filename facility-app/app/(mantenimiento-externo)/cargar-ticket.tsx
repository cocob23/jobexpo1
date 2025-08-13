import { supabase } from '@/constants/supabase'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Image } from 'react-native'


import {
  ActivityIndicator,
  Alert,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native'
import uuid from 'react-native-uuid'

export default function Tickets() {
  const [descripcion, setDescripcion] = useState('')
  const [importe, setImporte] = useState('')
  const [imagen, setImagen] = useState<any>(null)
  const [cargando, setCargando] = useState(false)
  const router = useRouter()

  const elegirImagen = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permiso.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos')
      return
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    })

    if (resultado.canceled) return

    setImagen(resultado.assets[0])
  }

  const subirTicket = async () => {
    if (!descripcion || !imagen || !importe) {
      Alert.alert('Faltan datos', 'Completá todos los campos.')
      return
    }

    const importeNum = parseInt(importe)
    if (isNaN(importeNum) || importeNum < 0) {
      Alert.alert('Importe inválido', 'Ingresá un número válido.')
      return
    }

    setCargando(true)

    const { data: userData, error: errorUsuario } = await supabase.auth.getUser()
    if (errorUsuario || !userData?.user) {
      Alert.alert('Error', 'No se pudo obtener el usuario.')
      setCargando(false)
      return
    }

    const userId = userData.user.id
    const nombreArchivo = `${userId}/${uuid.v4()}.jpg`

    const archivo = {
      uri: imagen.uri,
      name: nombreArchivo,
      type: 'image/jpeg',
    }

    const { error: errorSubida } = await supabase.storage
      .from('tickets')
      .upload(nombreArchivo, archivo as any)

    if (errorSubida) {
      Alert.alert('Error al subir la imagen', errorSubida.message)
      setCargando(false)
      return
    }

    const { data: url } = supabase.storage.from('tickets').getPublicUrl(nombreArchivo)
    const urlImagen = url?.publicUrl

    const { error: errorInsert } = await supabase.from('tickets').insert([
      {
        usuario_id: userId,
        descripcion,
        foto: urlImagen,
        fecha_reporte: new Date().toISOString(),
        estado: 'Pendiente',
        importe: importeNum,
      },
    ])

    setCargando(false)

    if (errorInsert) {
      console.log('❌ Error al insertar ticket:', errorInsert)
      Alert.alert('Error', 'No se pudo cargar el ticket.')
    } else {
      Alert.alert('Éxito', 'Ticket cargado correctamente.')
      setDescripcion('')
      setImagen(null)
      setImporte('')
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Image
           source={require('@/assets/images/logo.png')}
          style={styles.logo}
        />
        <View style={styles.header}>
        <TouchableOpacity style={styles.volver}onPress={() => router.push('/(mantenimiento)/tickets')}>
        <Text style={styles.botonTexto}>Volver</Text>
        </TouchableOpacity>
        </View>
        <Text style={styles.titulo}>Cargar Ticket</Text>

        <TouchableOpacity style={styles.imagenSelector} onPress={elegirImagen}>
          {imagen ? (
            <Image source={{ uri: imagen.uri }} style={styles.imagenPreview} />
          ) : (
            <Text style={styles.imagenTexto}>Seleccionar foto del ticket</Text>
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Descripción del ticket"
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
        />

        <TextInput
          style={styles.input}
          placeholder="Importe del ticket (ej: 5000)"
          value={importe}
          onChangeText={setImporte}
          keyboardType="numeric"
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />

        <TouchableOpacity style={styles.boton} onPress={subirTicket} disabled={cargando}>
          {cargando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.botonTexto}>Enviar Ticket</Text>
          )}
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 30
  },
    logo: {
  width: 270,
  height: 90,
  resizeMode: 'contain',
  alignSelf: 'center',
  marginTop: 30,
  marginBottom: 20,
},
header: {
  flexDirection: 'row',
  justifyContent: 'flex-start',
  marginBottom: 10,
},
volver: {
    backgroundColor: '#1e40af',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    color: "ffffff"
},
  botonTexto: {
    color: '#fff',
    fontWeight: 'bold',
  },

  imagenSelector: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  imagenTexto: {
    color: '#666',
  },
  imagenPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  boton: {
    backgroundColor: '#1e40af',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },

})
