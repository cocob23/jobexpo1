import { useState } from 'react'
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { supabaseAdmin } from '../../constants/supabaseAdmin'

type RolValue =
  | 'limpieza'
  | 'mantenimiento'
  | 'mantenimiento-externo'
  | 'fm'
  | 'superadmin'

type Rol = {
  value: RolValue
  label: string
}

const rolesDisponibles: Rol[] = [
  { value: 'limpieza',              label: 'Limpieza' },
  { value: 'mantenimiento',         label: 'Mantenimiento' },
  { value: 'mantenimiento-externo', label: 'Mantenimiento externo' },
  { value: 'fm',                    label: 'Facility Manager' },
  { value: 'superadmin',            label: 'Superadmin' },
]

export default function CrearUsuarioScreen() {
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState<RolValue>('limpieza')

  const crearUsuario = async () => {
    if (!email || !password || !nombre || !apellido || !rol) {
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
      rol, // ahora solo acepta RolValue válidos
    })

    if (insertError) {
      Alert.alert('Error al guardar en tabla usuarios', insertError.message)
    } else {
      Alert.alert('Usuario creado con éxito')
      setNombre('')
      setApellido('')
      setEmail('')
      setPassword('')
      setRol('limpieza')
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Crear nuevo usuario</Text>

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

      <Text style={styles.label}>Seleccioná un rol:</Text>
      <View style={styles.rolesContainer}>
        {rolesDisponibles.map((r) => (
          <TouchableOpacity
            key={r.value}
            onPress={() => setRol(r.value)}
            style={[styles.rolBoton, rol === r.value && styles.rolSeleccionado]}
          >
            <Text
              style={[styles.rolTexto, rol === r.value && styles.rolTextoSeleccionado]}
            >
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.boton} onPress={crearUsuario}>
        <Text style={styles.botonTexto}>Crear usuario</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  rolesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  rolBoton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563EB',
    backgroundColor: '#fff',
    marginRight: 10,
    marginBottom: 10,
  },
  rolSeleccionado: {
    backgroundColor: '#2563EB',
  },
  rolTexto: {
    color: '#2563EB',
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  rolTextoSeleccionado: {
    color: '#fff',
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
