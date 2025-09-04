// app/verificar-codigo.tsx
import { supabase } from '@/constants/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
      {/* Botón Volver */}
      <View style={styles.backWrap}>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnBack}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
          <Text style={styles.btnBackText}>Volver</Text>
        </TouchableOpacity>
      </View>

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
  backWrap: { position: 'absolute', top: 50, left: 16, zIndex: 10 },
  btnBack: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#6b7280',
    paddingHorizontal: 14, height: 40, borderRadius: 10,
  },
  btnBackText: { color: '#fff', fontWeight: '700', marginLeft: 4 },
  titulo: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  input: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 12, marginBottom: 20
  },
  boton: {
    backgroundColor: '#2563EB', padding: 14, borderRadius: 10, alignItems: 'center'
  },
  botonTexto: { color: '#fff', fontWeight: 'bold' },
});
