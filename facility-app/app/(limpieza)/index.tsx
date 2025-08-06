import { useRouter } from 'expo-router'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function InicioLimpieza() {
  const router = useRouter()

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/logo.png')} // reemplazá si usás otro path
        style={styles.logo}
        resizeMode="contain"
      />

      <TouchableOpacity
        style={styles.boton}
        onPress={() => router.push('/(limpieza)/marcar-llegada')}
      >
        <Text style={styles.botonTexto}>Marcar llegada</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.boton}
        onPress={() => router.push('/(limpieza)/mis-llegadas')}
      >
        <Text style={styles.botonTexto}>Mis llegadas</Text>
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
  logo: {
    height: 120,
    width: 200,
    alignSelf: 'center',
    marginBottom: 40,
  },
  boton: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  botonTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
})
