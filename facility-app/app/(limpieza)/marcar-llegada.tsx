import * as Location from 'expo-location'
import { useEffect, useState } from 'react'
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native'
import { supabase } from '../../constants/supabase'

export default function MarcarLlegadaScreen() {
  const [lugar, setLugar] = useState('')
  const [hora, setHora] = useState('')
  const [fecha, setFecha] = useState('')
  const [fechaISO, setFechaISO] = useState('')
  const [latitud, setLatitud] = useState<number | null>(null)
  const [longitud, setLongitud] = useState<number | null>(null)

  useEffect(() => {
    const ahora = new Date()

    // hora tipo 18:34
    setHora(`${ahora.getHours()}:${ahora.getMinutes().toString().padStart(2, '0')}`)

    // fecha para mostrar tipo 20/06/2025
    const dia = String(ahora.getDate()).padStart(2, '0')
    const mes = String(ahora.getMonth() + 1).padStart(2, '0')
    const anio = ahora.getFullYear()
    setFecha(`${dia}/${mes}/${anio}`)

    // fecha para guardar en la base (YYYY-MM-DD)
    const iso = ahora.toISOString().split('T')[0]
    setFechaISO(iso)

    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permiso denegado para acceder a la ubicación')
        return
      }
      const location = await Location.getCurrentPositionAsync({})
      setLatitud(location.coords.latitude)
      setLongitud(location.coords.longitude)
    })()
  }, [])

  const marcarLlegada = async () => {
  if (!lugar || latitud === null || longitud === null) {
    Alert.alert('Faltan datos', 'Completá todos los campos')
    return
  }

  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id

  if (!userId) {
    Alert.alert('Error', 'No se pudo obtener el usuario actual')
    return
  }

  const ahora = new Date()
  const fechaISO = ahora.toISOString().split('T')[0] // "2025-06-20"

  const { error } = await supabase.from('llegadas').insert({
    usuario_id: userId, // 👈 ESTA LÍNEA ES CLAVE
    lugar,
    fecha: fechaISO,
    hora,
    latitud,
    longitud,
  })

  if (error) {
    Alert.alert('Error al guardar llegada', error.message)
  } else {
    Alert.alert('¡Llegada registrada!')
    setLugar('')
  }
}


  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>¿Dónde estás prestando servicio?</Text>
      <TextInput
        placeholder="Lugar de servicio"
        value={lugar}
        onChangeText={setLugar}
        style={styles.input}
      />

      <Text style={styles.texto}>🕒 Hora actual: {hora}</Text>
      <Text style={styles.texto}>📅 Fecha: {fecha}</Text>
      <Text style={styles.texto}>
        📍 Ubicación:{' '}
        {latitud && longitud
          ? `${latitud.toFixed(5)}, ${longitud.toFixed(5)}`
          : 'Cargando...'}
      </Text>

      <TouchableOpacity style={styles.boton} onPress={marcarLlegada}>
        <Text style={styles.botonTexto}>Marcar llegada</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    justifyContent: 'center'
  },
  titulo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14
  },
  texto: {
    marginBottom: 8
  },
  boton: {
    backgroundColor: 'green',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20
  },
  botonTexto: {
    color: '#fff',
    fontWeight: 'bold'
  }
})
