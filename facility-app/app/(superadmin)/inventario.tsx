import { supabase } from '@/constants/supabase'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
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
      setCargando(true)
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, apellido, email')
        .order('apellido', { ascending: true })
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
    const cantidadNum = parseInt(cantidad, 10)
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
      <SafeAreaView style={styles.safe}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#1e40af" />
        </View>
      </SafeAreaView>
    )
  }

  const renderUsuario = ({ item }: any) => (
    <TouchableOpacity
      onPress={() => setUsuarioSeleccionado(item)}
      style={[
        styles.usuarioItem,
        usuarioSeleccionado?.id === item.id && styles.usuarioActivo,
      ]}
    >
      <Text>
        {`${item.apellido ?? ''} ${item.nombre ?? ''}`.trim() || item.email}
      </Text>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <FlatList
          data={usuarios}
          keyExtractor={(item) => item.id}
          renderItem={renderUsuario}
          keyboardShouldPersistTaps="handled"
          // spacing/padding general
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
          ListHeaderComponent={
            <View style={{ paddingTop: 8 }}>
              <Text style={styles.titulo}>Asignar inventario</Text>

              <Text style={styles.label}>Tipo</Text>
              <View style={styles.tipoContainer}>
                <TouchableOpacity
                  style={[styles.tipoBoton, tipo === 'herramienta' && styles.tipoActivo]}
                  onPress={() => setTipo('herramienta')}
                >
                  <Text style={[styles.tipoTexto, tipo !== 'herramienta' && styles.tipoTextoInactivo]}>
                    Herramienta
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tipoBoton, tipo === 'vestimenta' && styles.tipoActivo]}
                  onPress={() => setTipo('vestimenta')}
                >
                  <Text style={[styles.tipoTexto, tipo !== 'vestimenta' && styles.tipoTextoInactivo]}>
                    Vestimenta
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Descripción</Text>
              <TextInput
                style={styles.input}
                value={descripcion}
                onChangeText={setDescripcion}
                placeholder="Ej: Destornillador Phillips"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.label}>Cantidad</Text>
              <TextInput
                style={styles.input}
                value={cantidad}
                onChangeText={setCantidad}
                placeholder="Ej: 2"
                keyboardType="numeric"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.label}>Seleccionar usuario</Text>
            </View>
          }
          ListEmptyComponent={
            <Text style={{ color: '#64748b', paddingVertical: 8 }}>
              No hay usuarios para mostrar.
            </Text>
          }
          ListFooterComponent={
            <TouchableOpacity style={styles.boton} onPress={asignar}>
              <Text style={styles.botonTexto}>Asignar</Text>
            </TouchableOpacity>
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  // Safe area + separación para notch
  safe: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 8,
  },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  titulo: {
    fontSize: 22, fontWeight: 'bold', marginBottom: 16, color: '#0f172a',
  },
  label: {
    fontSize: 14, marginTop: 16, marginBottom: 6, color: '#475569', fontWeight: '600',
  },
  input: {
    borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff',
  },

  tipoContainer: { flexDirection: 'row', gap: 10 },
  tipoBoton: {
    flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#1e3a8a',
    borderRadius: 12, alignItems: 'center', backgroundColor: '#fff',
  },
  tipoActivo: { backgroundColor: '#1e3a8a', borderColor: '#1e3a8a' },
  tipoTexto: { fontWeight: '700', color: '#fff' },
  tipoTextoInactivo: { color: '#1e3a8a' },

  usuarioItem: {
    paddingVertical: 12, paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  usuarioActivo: { backgroundColor: '#dbeafe' },

  boton: {
    backgroundColor: '#16a34a', paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', marginTop: 24, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 2,
  },
  botonTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
})
