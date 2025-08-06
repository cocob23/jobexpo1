// app/(fm)/index.tsx

import { useRouter } from 'expo-router'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function IndexFM() {
  const router = useRouter()

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Panel Facility Manager</Text>

      <TouchableOpacity
        style={styles.boton}
        onPress={() => router.push('/(fm)/asignar-tarea')}
      >
        <Text style={styles.textoBoton}>Asignar tarea</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.boton}
        onPress={() => router.push('/(fm)/ver-tareas')}
      >
        <Text style={styles.textoBoton}>Ver tareas asignadas</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.boton}
        onPress={() => router.push('/(fm)/aprobar-trabajos')}
      >
        <Text style={styles.textoBoton}>Aprobar trabajos</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.boton}
        onPress={() => router.push('/crear-tecnico')}
      >
        <Text style={styles.textoBoton}>Agregar técnico</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.boton}
        onPress={() => router.push('/(fm)/cotizaciones')}
      >
        <Text style={styles.textoBoton}>Cotizaciones</Text>
      </TouchableOpacity>

      {/* para FM Admin */}
      <TouchableOpacity
        style={styles.botonSecundario}
        onPress={() => router.push('/(fm)/asignar-a-fm')}
      >
        <Text style={styles.textoBotonSecundario}>Asignar tareas a FM</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  boton: {
    backgroundColor: '#1e40af',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  textoBoton: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  botonSecundario: {
    backgroundColor: '#64748b',
    padding: 14,
    borderRadius: 12,
    marginTop: 30,
  },
  textoBotonSecundario: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
})
