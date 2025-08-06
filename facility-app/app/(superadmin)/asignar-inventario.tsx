import { supabase } from '@/constants/supabase'
import { useEffect, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'

export default function AsignarInventario() {
  const [tipo, setTipo] = useState<'herramienta' | 'vestimenta'>('herramienta')
  const [descripcion, setDescripcion] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<any>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const cargarUsuarios = async () => {
      const { data, error } = await supabase.from('usuarios').select('id, nombre, email')
      if (error) {
        Alert.alert('Error al cargar usuarios')
      } else {
        setUsuarios(data || [])
      }
      setCargando(false)
    }

    cargarUsuarios()
  }, [])

  const asignar = async () => {
    if (!usuarioSeleccionado || !descripcion || !cantidad) {
      Alert.alert('Faltan datos')
      return
    }

    const cantidadNum = parseInt(cantidad)
    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      Alert.alert('La cantidad debe ser un número válido mayor a 0')
      return
    }

    const { error } = await supabase.from('inventario').insert([
      {
        usuario_id: usuarioSeleccionado.id,
        tipo,
        descripcion,
        cantidad: cantidadNum,
      },
    ])

    if (error) {
      Alert.alert('Error al asignar inventario')
    } else {
      Alert.alert('Inventario asignado con éxito')
      setDescripcion('')
      setCantidad('')
      setUsuarioSeleccionado(null)
    }
  }

  if (cargando) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Asignar inventario</Text>

      <Text style={styles.label}>Tipo</Text>
      <View style={styles.tipoContainer}>
        <TouchableOpacity
          style={[styles.tipoBoton, tipo === 'herramienta' && styles.tipoActivo]}
          onPress={() => setTipo('herramienta')}
        >
          <Text style={styles.tipoTexto}>Herramienta</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tipoBoton, tipo === 'vestimenta' && styles.tipoActivo]}
          onPress={() => setTipo('vestimenta')}
        >
          <Text style={styles.tipoTexto}>Vestimenta</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Descripción</Text>
      <TextInput
        style={styles.input}
        value={descripcion}
        onChangeText={setDescripcion}
        placeholder="Ej: Destornillador Phillips"
      />

      <Text style={styles.label}>Cantidad</Text>
      <TextInput
        style={styles.input}
        value={cantidad}
        onChangeText={setCantidad}
        placeholder="Ej: 2"
        keyboardType="numeric"
      />

      <Text style={styles.label}>Seleccionar usuario</Text>
      <FlatList
        data={usuarios}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setUsuarioSeleccionado(item)}
            style={[
              styles.usuarioItem,
              usuarioSeleccionado?.id === item.id && styles.usuarioActivo,
            ]}
          >
            <Text>{item.nombre || item.email}</Text>
          </TouchableOpacity>
        )}
        style={{ maxHeight: 150 }}
      />

      <TouchableOpacity style={styles.boton} onPress={asignar}>
        <Text style={styles.botonTexto}>Asignar</Text>
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
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginTop: 16,
    marginBottom: 4,
    color: '#444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
  },
  tipoContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  tipoBoton: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1e3a8a',
    borderRadius: 8,
    alignItems: 'center',
  },
  tipoActivo: {
    backgroundColor: '#1e3a8a',
  },
  tipoTexto: {
    color: '#fff',
    fontWeight: '600',
  },
  usuarioItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  usuarioActivo: {
    backgroundColor: '#dbeafe',
  },
  boton: {
    backgroundColor: '#16a34a',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  botonTexto: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
})
