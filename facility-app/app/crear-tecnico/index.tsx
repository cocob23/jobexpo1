import { useState } from 'react'
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabaseAdmin } from '../../constants/supabaseAdmin'

export default function CrearTecnicoFM() {
  const router = useRouter()

  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const crearTecnico = async () => {
    if (!email || !password || !nombre || !apellido) {
      Alert.alert('Error', 'Completá todos los campos')
      return
    }

    const emailLimpio = email.trim().toLowerCase()

    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: emailLimpio,
        password,
        email_confirm: true,
      })

    if (authError) {
      Alert.alert('Error al crear usuario', authError.message)
      return
    }

    const userId = authUser.user?.id

    const { error: insertError } = await supabaseAdmin.from('usuarios').insert({
      id: userId,
      email: emailLimpio,
      nombre,
      apellido,
      rol: 'mantenimiento',
    })

    if (insertError) {
      Alert.alert('Error al guardar en tabla usuarios', insertError.message)
    } else {
      Alert.alert('Técnico creado con éxito')
      setNombre('')
      setApellido('')
      setEmail('')
      setPassword('')
    }
  }

  return (
    <View style={styles.container}>
      {/* Header con botón Volver */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnBack}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
          <Text style={styles.btnBackText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>Crear nuevo técnico</Text>
      </View>

      <TextInput
        placeholder="Nombre"
        value={nombre}
        placeholderTextColor="#999"
        onChangeText={setNombre}
        style={styles.input}
      />

      <TextInput
        placeholder="Apellido"
        value={apellido}
        placeholderTextColor="#999"
        onChangeText={setApellido}
        style={styles.input}
      />

      <TextInput
        placeholder="Email"
        value={email}
        placeholderTextColor="#999"
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />

      <TextInput
        placeholder="Contraseña"
        value={password}
        placeholderTextColor="#999"
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        textContentType="password"
      />

      <TouchableOpacity style={styles.boton} onPress={crearTecnico}>
        <Text style={styles.botonTexto}>Crear técnico</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 170, // 👈 margen superior para que no lo tape el notch
    backgroundColor: '#fff',
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    marginBottom: 12,
  },
  btnBack: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6b7280',
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 10,
  },
  btnBackText: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 4,
  },

  titulo: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
  },

  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    backgroundColor: '#fff',
  },

  boton: {
    backgroundColor: '#2563EB',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  botonTexto: {
    color: '#fff',
    fontWeight: 'bold',
  },
})
