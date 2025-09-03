import { supabase } from '@/constants/supabase'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import uuid from 'react-native-uuid'

export default function PerfilLimpieza() {
  const [usuario, setUsuario] = useState<any>(null)
  const [perfilUsuario, setPerfilUsuario] = useState<any>(null)

  useEffect(() => {
    fetchUsuario()
  }, [])

  const fetchUsuario = async () => {
    const { data } = await supabase.auth.getUser()
    setUsuario(data?.user)

    if (data?.user?.id) {
      const { data: usuarioTabla } = await supabase
        .from('usuarios')
        .select('nombre, apellido, avatar_path')
        .eq('id', data.user.id)
        .single()

      setPerfilUsuario(usuarioTabla)
    }
  }

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const cambiarFotoPerfil = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permiso.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos')
      return
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if (resultado.canceled) return

    const imagen = resultado.assets[0]
    const archivo = {
      uri: imagen.uri,
      name: `${uuid.v4()}.jpg`,
      type: 'image/jpeg',
    }

    const userId = usuario?.id
    const ruta = `${userId}/${archivo.name}`

    // Subir imagen al bucket
    const { error: errorSubida } = await supabase.storage
      .from('avatars')
      .upload(ruta, archivo as any)

    if (errorSubida) {
      Alert.alert('Error al subir la imagen', errorSubida.message)
      return
    }

    // URL pública
    const urlPublica = supabase.storage.from('avatars').getPublicUrl(ruta).data.publicUrl

    // (opcional) metadata del auth
    const { error: errorUpdateUser } = await supabase.auth.updateUser({
      data: { avatar_url: urlPublica },
    })
    if (errorUpdateUser) {
      Alert.alert('Error al actualizar perfil (auth)', errorUpdateUser.message)
      return
    }

    // Guardar ruta en tabla usuarios
    const { error: errorUpdateUsuarios } = await supabase
      .from('usuarios')
      .update({ avatar_path: ruta })
      .eq('id', userId)

    if (errorUpdateUsuarios) {
      Alert.alert('Error al actualizar perfil (usuarios)', errorUpdateUsuarios.message)
      return
    }

    Alert.alert('Foto actualizada', 'Tu nueva foto de perfil fue cargada con éxito')
    fetchUsuario()
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={require('@/assets/images/logo.png')} style={styles.logo} />

      <Pressable onPress={cambiarFotoPerfil} style={styles.avatarContainer}>
        <Image
          source={{
            uri: perfilUsuario?.avatar_path
              ? supabase.storage.from('avatars').getPublicUrl(perfilUsuario.avatar_path).data.publicUrl
              : 'https://ui-avatars.com/api/?name=User&background=ccc&color=000&size=128',
          }}
          style={styles.avatar}
        />
        <Text style={styles.linkCambiarFoto}>Cambiar foto</Text>
      </Pressable>

      <View style={styles.card}>
        {perfilUsuario && (
          <>
            <Text style={styles.label}>Nombre:</Text>
            <Text style={styles.valor}>{perfilUsuario.nombre}</Text>

            <Text style={styles.label}>Apellido:</Text>
            <Text style={styles.valor}>{perfilUsuario.apellido}</Text>
          </>
        )}

        {usuario && (
          <>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.valor}>{usuario.email}</Text>
          </>
        )}
      </View>

      <Pressable style={styles.botonCerrar} onPress={cerrarSesion}>
        <Text style={styles.textoCerrar}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    flexGrow: 1,
  },
  logo: {
    width: 270,
    height: 90,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: '#1e40af',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  linkCambiarFoto: {
    marginTop: 10,
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#f8fafc',
    width: '100%',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#475569',
    marginTop: 10,
  },
  valor: {
    fontSize: 16,
    color: '#111827',
  },
  botonCerrar: {
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  textoCerrar: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
})
