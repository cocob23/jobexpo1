import { supabase } from '@/constants/supabase';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function NuevaPassword() {
  const [password, setPassword] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    if (password.length < 6) return Alert.alert('La contraseña debe tener al menos 6 caracteres');

    setGuardando(true);
    const { error } = await supabase.auth.updateUser({ password });
    setGuardando(false);

    if (error) {
      Alert.alert('Error al cambiar contraseña', error.message);
    } else {
      Alert.alert('Listo', 'Contraseña actualizada');
      router.replace('/');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Nueva contraseña</Text>
      <TextInput
        placeholder="Nueva contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
      <TouchableOpacity style={styles.boton} onPress={guardar} disabled={guardando}>
        <Text style={styles.botonTexto}>{guardando ? 'Guardando...' : 'Cambiar contraseña'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  titulo: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  input: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 12, marginBottom: 20
  },
  boton: {
    backgroundColor: '#2563EB', padding: 14, borderRadius: 10, alignItems: 'center'
  },
  botonTexto: { color: '#fff', fontWeight: 'bold' },
});