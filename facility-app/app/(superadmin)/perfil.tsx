import { supabase } from '@/constants/supabase';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import uuid from 'react-native-uuid';

export default function PerfilSuperadmin() {
  const [usuario, setUsuario] = useState<any>(null);
  const [perfilUsuario, setPerfilUsuario] = useState<any>(null);

  useEffect(() => {
    fetchUsuario();
  }, []);

  const fetchUsuario = async () => {
    const { data } = await supabase.auth.getUser();
    setUsuario(data?.user);

    if (data?.user?.id) {
      const { data: usuarioTabla } = await supabase
        .from('usuarios')
        .select('nombre, apellido')
        .eq('id', data.user.id)
        .single();

      setPerfilUsuario(usuarioTabla);
    }
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const cambiarFotoPerfil = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos');
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (resultado.canceled) return;

    const imagen = resultado.assets[0];

    const archivo = {
      uri: imagen.uri,
      name: `${uuid.v4()}.jpg`,
      type: 'image/jpeg',
    };

    const userId = usuario?.id;
    const ruta = `${userId}/${archivo.name}`;

    const { error: errorSubida } = await supabase.storage
      .from('avatars')
      .upload(ruta, {
        uri: archivo.uri,
        name: archivo.name,
        type: archivo.type,
      } as any);

    if (errorSubida) {
      Alert.alert('Error al subir la imagen', errorSubida.message);
      return;
    }

    const urlPublica = supabase.storage.from('avatars').getPublicUrl(ruta).data.publicUrl;

    const { error: errorUpdate } = await supabase.auth.updateUser({
      data: { avatar_url: urlPublica },
    });

    if (errorUpdate) {
      Alert.alert('Error al actualizar el perfil', errorUpdate.message);
      return;
    }

    Alert.alert('Foto actualizada', 'Tu nueva foto de perfil fue cargada con éxito');
    fetchUsuario();
  };

  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>Mi perfil</Text>

      <Pressable onPress={cambiarFotoPerfil} style={styles.avatarContainer}>
        <Image
          source={{
            uri:
              usuario?.user_metadata?.avatar_url ||
              'https://ui-avatars.com/api/?name=User&background=ccc&color=000&size=128',
          }}
          style={styles.avatar}
        />
        <Text style={styles.linkCambiarFoto}>Cambiar foto de perfil</Text>
      </Pressable>

    {perfilUsuario && (
        <>
            <Text style={styles.texto}>Nombre: {perfilUsuario.nombre}</Text>
            <Text style={styles.texto}>Apellido: {perfilUsuario.apellido}</Text>
        </>
    )}
        

      {usuario && <Text style={styles.texto}>Email: {usuario.email}</Text>}

      <Pressable style={styles.botonCerrar} onPress={cerrarSesion}>
        <Text style={styles.textoBoton}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  titulo: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  texto: {
    fontSize: 16,
    marginTop: 8,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#ccc',
  },
  linkCambiarFoto: {
    marginTop: 10,
    color: '#007bff',
    fontSize: 14,
  },
  botonCerrar: {
    backgroundColor: '#d9534f',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 30,
    marginTop: 40,
  },
  textoBoton: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
