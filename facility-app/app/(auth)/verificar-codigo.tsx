import { supabase } from '@/constants/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function VerificarCodigo() {
  const { email } = useLocalSearchParams();
  const [codigo, setCodigo] = useState('');
  const [verificando, setVerificando] = useState(false);

  const verificar = async () => {
    setVerificando(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email: email as string,
      token: codigo,
      type: 'email',
    });
    setVerificando(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      router.push('/nueva-password');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Ingresá el código</Text>
      <TextInput
        placeholder="Código que recibiste"
        value={codigo}
        onChangeText={setCodigo}
        style={styles.input}
        keyboardType="numeric"
      />
      <TouchableOpacity style={styles.boton} onPress={verificar} disabled={verificando}>
        <Text style={styles.botonTexto}>{verificando ? 'Verificando...' : 'Verificar código'}</Text>
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