import { useRouter } from 'expo-router'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function SuperadminIndex() {
  const router = useRouter()

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Panel de Superadmin</Text>

      <TouchableOpacity
        style={styles.boton}
        onPress={() => router.push('/(superadmin)/crear-usuario')}
      >
        <Text style={styles.botonTexto}>Crear Usuario</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.boton}
        onPress={() => router.push('/(superadmin)/tareas')}
      >
        <Text style={styles.botonTexto}>Ver Tareas</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.boton}
        onPress={() => router.push('/(superadmin)/tickets')}
      >
        <Text style={styles.botonTexto}>Ver Tickets</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.boton}
        onPress={() => router.push('/(superadmin)/asignar-inventario')}
      >
      <Text style={styles.botonTexto}>Asignar inventario</Text>
      </TouchableOpacity>

      {/* podés agregar más accesos acá */}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  boton: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  botonTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
})
