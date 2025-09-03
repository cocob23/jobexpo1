import { useRouter } from 'expo-router'
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function InicioLimpieza() {
  const router = useRouter()

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Image source={require('@/assets/images/logo.png')} style={styles.logo} />
        <Text style={styles.titulo}>Panel de Limpieza</Text>

        <TouchableOpacity
          style={styles.botonGrande}
          onPress={() => router.push('/(limpieza)/marcar-llegada')}
          activeOpacity={0.85}
        >
          <Text style={styles.textoBoton}>🕒 Marcar llegada</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.botonGrande}
          onPress={() => router.push('/(limpieza)/mis-llegadas')}
          activeOpacity={0.85}
        >
          <Text style={styles.textoBoton}>📍 Mis llegadas</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { padding: 24, alignItems: 'center', gap: 14 },
  logo: { width: 200, height: 70, resizeMode: 'contain', marginTop: 100, marginBottom: 70},
  titulo: { fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 50 },
  botonGrande: {
    width: '100%',
    backgroundColor: '#2563EB',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
    marginTop: 4,
  },
  textoBoton: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center', letterSpacing: 0.3 },
})
