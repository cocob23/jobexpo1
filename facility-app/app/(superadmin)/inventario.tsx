import { supabase } from '@/constants/supabase'
import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  ScrollView,
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
  const [busqueda, setBusqueda] = useState('')
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

  // Filtrado por nombre/apellido/email
  const usuariosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return usuarios
    return usuarios.filter((u) => {
      const nombre = (u.nombre ?? '').toLowerCase()
      const apellido = (u.apellido ?? '').toLowerCase()
      const email = (u.email ?? '').toLowerCase()
      const full = `${apellido} ${nombre}`.trim()
      return (
        nombre.includes(q) ||
        apellido.includes(q) ||
        email.includes(q) ||
        full.includes(q)
      )
    })
  }, [usuarios, busqueda])

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
      setBusqueda('')
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

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
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
          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            style={[styles.input, { marginBottom: 10 }]}
            placeholder="Buscar por nombre, apellido o email"
            placeholderTextColor="#94a3b8"
          />

          {/* Caja reducida y scrolleable para usuarios */}
          <View style={styles.userBox}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingVertical: 6 }}
            >
              {usuariosFiltrados.length ? (
                usuariosFiltrados.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setUsuarioSeleccionado(item)}
                    style={[
                      styles.usuarioItem,
                      usuarioSeleccionado?.id === item.id && styles.usuarioActivo,
                    ]}
                  >
                    <Text style={styles.usuarioNombre}>
                      {`${item.apellido ?? ''} ${item.nombre ?? ''}`.trim() || item.email}
                    </Text>
                    {item.email ? <Text style={styles.usuarioEmail}>{item.email}</Text> : null}
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={{ color: '#64748b', paddingHorizontal: 8 }}>
                  {busqueda ? 'Sin resultados para tu búsqueda.' : 'No hay usuarios para mostrar.'}
                </Text>
              )}
            </ScrollView>
          </View>

          {usuarioSeleccionado && (
            <View style={styles.selBadge}>
              <Text style={styles.selBadgeText}>
                Seleccionado:{' '}
                {`${usuarioSeleccionado.apellido ?? ''} ${usuarioSeleccionado.nombre ?? ''}`.trim() ||
                  usuarioSeleccionado.email}
              </Text>
              <TouchableOpacity onPress={() => setUsuarioSeleccionado(null)}>
                <Text style={styles.selBadgeClear}>Quitar</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.boton} onPress={asignar}>
            <Text style={styles.botonTexto}>Asignar</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  // baja el contenido para que no lo tape el notch
  safe: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 8,
  },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  container: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },
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

  // Caja de usuarios: cuadrado reducido, con scroll interno
  userBox: {
    maxHeight: 220,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  usuarioItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  usuarioNombre: { color: '#0f172a', fontWeight: '600' },
  usuarioEmail: { color: '#64748b', fontSize: 12 },
  usuarioActivo: { backgroundColor: '#dbeafe' },

  selBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 6,
  },
  selBadgeText: { color: '#0f172a', fontWeight: '600' },
  selBadgeClear: { color: '#dc2626', fontWeight: '700' },

  boton: {
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  botonTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
})
