import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { supabase } from '../constants/supabase'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()

  const iniciarSesion = async () => {
    const emailLimpio = email.trim().toLowerCase()
    const pass = password

    if (!emailLimpio || !pass) {
      Alert.alert('Faltan datos', 'Ingresá email y contraseña')
      return
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailLimpio,
      password: pass
    })

    if (error) {
      Alert.alert('Error', 'Credenciales inválidas')
      return
    }

    // data.user puede venir null en algunos flujos; mejor pedir el user actual
    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData.user) {
      Alert.alert('Error', 'No se pudo obtener el usuario autenticado')
      return
    }

    // Leer rol (requiere RLS SELECT en tabla usuarios)
    const { data: perfil, error: perfilErr } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', userData.user.id)
      .single()

    if (perfilErr) {
      console.log('Error leyendo usuarios.rol:', perfilErr)
      Alert.alert(
        'Permisos/Perfil',
        'No se pudo leer tu rol. Verificá que exista tu fila en "usuarios" y la política RLS permita SELECT.'
      )
      return
    }

    const rol = perfil?.rol as string | undefined

    if (rol === 'limpieza') router.replace('/(limpieza)')
    else if (rol === 'mantenimiento') router.replace('/(mantenimiento)')
    else if (rol === 'mantenimiento-externo') router.replace('/(mantenimiento-externo)')
    else if (rol === 'fm') router.replace('/(fm)')
    else if (rol === 'superadmin') router.replace('/(superadmin)')
    else if (rol === 'comercial') router.replace('/(ejecutivo-comercial)')
    else {
      Alert.alert('Rol no reconocido', `No puedo redirigirte. Rol: ${rol ?? 'desconocido'}`)
    }
  }

  return (
    <View style={styles.container}>
      <Image source={require('../assets/images/logo.png')} style={styles.logo} />
      <Text style={styles.titulo}>Iniciar sesión</Text>
      <Text style={styles.subtitulo}>Accedé con tu cuenta de Facility</Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor="#999"
        style={styles.input}
        onChangeText={setEmail}
        value={email}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        placeholder="Contraseña"
        placeholderTextColor="#999"
        secureTextEntry
        style={styles.input}
        onChangeText={setPassword}
        value={password}
      />

      <TouchableOpacity style={styles.boton} onPress={iniciarSesion}>
        <Text style={styles.botonTexto}>Entrar</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/recuperar')}>
        <Text style={styles.linkOlvide}>¿Olvidaste tu contraseña?</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  logo: {
    width: 160,
    height: 140,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginBottom: 100,
    marginTop: -190,
  },
  titulo: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  subtitulo: { fontSize: 14, color: '#777', textAlign: 'center', marginBottom: 24 },
  input: { borderWidth: 1, borderColor: '#444', borderRadius: 16, padding: 12, marginBottom: 12, fontSize: 16 },
  boton: { backgroundColor: '#2563EB', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  botonTexto: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkOlvide: { marginTop: 16, color: '#2563EB', textAlign: 'center', fontWeight: 'bold' },
})
