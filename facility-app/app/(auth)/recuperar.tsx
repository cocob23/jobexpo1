// app/recuperar.tsx  (1)
import { supabase } from '@/constants/supabase';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Recuperar() {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviarCodigo = async () => {
    if (!email) return Alert.alert('Poné tu email');

    setEnviando(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setEnviando(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Listo', 'Te mandamos un código a tu email');
      router.push({ pathname: '/verificar-codigo', params: { email } });
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

      <Text style={styles.titulo}>Recuperar contraseña</Text>
      <TextInput
        placeholder="Tu email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TouchableOpacity style={styles.boton} onPress={enviarCodigo} disabled={enviando}>
        <Text style={styles.botonTexto}>{enviando ? 'Enviando...' : 'Enviar código'}</Text>
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
