import { supabase } from '@/constants/supabase'
import { useEffect, useState } from 'react'
import DateTimePickerModal from 'react-native-modal-datetime-picker'

import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

export default function AsignarTareaScreen() {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<string>('')
  const [busquedaEmpleado, setBusquedaEmpleado] = useState('')
  const [empleadosFiltrados, setEmpleadosFiltrados] = useState<any[]>([])
  const [descripcion, setDescripcion] = useState('')
  const [sucursal, setSucursal] = useState('')
  const [direccion, setDireccion] = useState('')
  const [provincia, setProvincia] = useState('')
  const [localidad, setLocalidad] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [checklistItems, setChecklistItems] = useState<string[]>([])
  const [nuevoItem, setNuevoItem] = useState('')
  const [cargando, setCargando] = useState(false)
  const [fechaRealizacion, setFechaRealizacion] = useState(new Date())
  const [mostrarPicker, setMostrarPicker] = useState(false)

  useEffect(() => {
    obtenerUsuarios()
  }, [])

  const obtenerUsuarios = async () => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido')
      .eq('rol', 'mantenimiento')

    if (error) {
      Alert.alert('Error', 'No se pudieron obtener los usuarios')
    } else {
      setUsuarios(data || [])
    }
  }

  useEffect(() => {
    if (busquedaEmpleado.trim() === '') {
      setEmpleadosFiltrados([])
      return
    }
    const resultado = usuarios.filter((u) => {
      const nombreCompleto = `${u.nombre} ${u.apellido}`.toLowerCase()
      return nombreCompleto.includes(busquedaEmpleado.toLowerCase())
    })
    setEmpleadosFiltrados(resultado)
  }, [busquedaEmpleado, usuarios])

  const agregarItemChecklist = () => {
    if (nuevoItem.trim() !== '') {
      setChecklistItems([...checklistItems, nuevoItem.trim()])
      setNuevoItem('')
    }
  }

  const eliminarItemChecklist = (index: number) => {
    const actualizada = [...checklistItems]
    actualizada.splice(index, 1)
    setChecklistItems(actualizada)
  }

  const asignarTarea = async () => {
    if (
      !empresa ||
      !usuarioSeleccionado ||
      !descripcion ||
      !sucursal ||
      !direccion ||
      !provincia ||
      !localidad ||
      checklistItems.length === 0
    ) {
      Alert.alert('Faltan datos', 'Completá todos los campos.')
      return
    }

    setCargando(true)
    const {
      data: { user },
      error: errorUser,
    } = await supabase.auth.getUser()

    if (errorUser || !user) {
      Alert.alert('Error', 'No se pudo obtener el usuario actual')
      setCargando(false)
      return
    }

    const { error: errorInsert } = await supabase.from('trabajos_mantenimiento').insert([
      {
        usuario_id: usuarioSeleccionado,
        descripcion,
        estado: 'Pendiente',
        fecha: new Date().toISOString(),
        fecha_realizacion: fechaRealizacion.toISOString(),
        fm_id: user.id,
        foto: null,
        comentarios: null,
        checklist: checklistItems.map((item) => ({ texto: item, hecho: false })),
        tipo: 'checklist',
        sucursal,
        direccion,
        provincia,
        localidad,
        empresa,
      },
    ])

    setCargando(false)

    if (errorInsert) {
      Alert.alert('Error', errorInsert.message || 'No se pudo asignar la tarea.')
    } else {
      Alert.alert('Éxito', 'Tarea asignada correctamente.')
      setUsuarioSeleccionado('')
      setBusquedaEmpleado('')
      setDescripcion('')
      setSucursal('')
      setDireccion('')
      setProvincia('')
      setLocalidad('')
      setChecklistItems([])
      setFechaRealizacion(new Date())
      setEmpresa('')
    }
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
          contentContainerStyle={{ paddingBottom: 140 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.titulo}>Asignar Tarea</Text>

          <Text style={styles.label}>Empleado de mantenimiento:</Text>
          <TextInput
            placeholder="Buscar por nombre o apellido"
            value={busquedaEmpleado}
            onChangeText={setBusquedaEmpleado}
            style={styles.input}
            placeholderTextColor="#94a3b8"
          />
          {empleadosFiltrados.map((u) => (
            <TouchableOpacity
              key={u.id}
              style={[
                styles.usuarioItem,
                usuarioSeleccionado === u.id && styles.usuarioSeleccionado,
              ]}
              onPress={() => {
                if (usuarioSeleccionado === u.id) {
                  setUsuarioSeleccionado('')
                  setBusquedaEmpleado('')
                  setEmpleadosFiltrados([])
                } else {
                  setUsuarioSeleccionado(u.id)
                  setBusquedaEmpleado(`${u.nombre} ${u.apellido}`)
                  setEmpleadosFiltrados([])
                }
              }}
            >
              <Text
                style={[
                  styles.usuarioTexto,
                  usuarioSeleccionado === u.id && styles.usuarioTextoSeleccionado,
                ]}
              >
                {u.nombre} {u.apellido}
              </Text>
            </TouchableOpacity>
          ))}

          <Text style={styles.label}>Empresa:</Text>
          <TextInput value={empresa} onChangeText={setEmpresa} style={styles.input} placeholderTextColor="#94a3b8" />

          <Text style={styles.label}>Sucursal:</Text>
          <TextInput value={sucursal} onChangeText={setSucursal} style={styles.input} placeholderTextColor="#94a3b8" />

          <Text style={styles.label}>Provincia:</Text>
          <TextInput value={provincia} onChangeText={setProvincia} style={styles.input} placeholderTextColor="#94a3b8" />

          <Text style={styles.label}>Localidad:</Text>
          <TextInput value={localidad} onChangeText={setLocalidad} style={styles.input} placeholderTextColor="#94a3b8" />

          <Text style={styles.label}>Dirección:</Text>
          <TextInput value={direccion} onChangeText={setDireccion} style={styles.input} placeholderTextColor="#94a3b8" />

          <Text style={styles.label}>Descripción de la tarea:</Text>
          <TextInput
            value={descripcion}
            onChangeText={setDescripcion}
            style={styles.input}
            multiline
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.label}>Checklist de actividades:</Text>
          {checklistItems.map((item, index) => (
            <View key={index} style={styles.checkItem}>
              <Text style={{ flex: 1 }}>{item}</Text>
              <TouchableOpacity onPress={() => eliminarItemChecklist(index)}>
                <Text style={{ color: 'red', fontWeight: 'bold' }}>X</Text>
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.nuevoItemContainer}>
            <TextInput
              placeholder="Agregar ítem"
              value={nuevoItem}
              onChangeText={setNuevoItem}
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholderTextColor="#94a3b8"
            />
            <TouchableOpacity style={styles.botonAgregar} onPress={agregarItemChecklist}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Fecha y hora de realización:</Text>
          <TouchableOpacity
            onPress={() => setMostrarPicker(true)}
            style={[styles.input, { justifyContent: 'center' }]}
          >
            <Text>{fechaRealizacion.toLocaleString()}</Text>
          </TouchableOpacity>

          <DateTimePickerModal
            isVisible={mostrarPicker}
            mode="datetime"
            date={fechaRealizacion}
            locale="es-AR"
            onConfirm={(date) => {
              setFechaRealizacion(date)
              setMostrarPicker(false)
            }}
            onCancel={() => setMostrarPicker(false)}
          />

          <TouchableOpacity style={styles.boton} onPress={asignarTarea} disabled={cargando}>
            <Text style={styles.botonTexto}>
              {cargando ? 'Asignando...' : 'Asignar tarea'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  // Baja el contenido para que no lo tape el notch
  safe: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 8,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#0f172a',
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    fontWeight: 'bold',
    color: '#475569',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  usuarioItem: {
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  usuarioSeleccionado: { backgroundColor: '#2563EB' },
  usuarioTexto: { fontSize: 16 },
  usuarioTextoSeleccionado: { color: '#fff', fontWeight: 'bold' },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  nuevoItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  boton: {
    backgroundColor: '#1e40af',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  botonTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  botonAgregar: {
    backgroundColor: '#1e40af',
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
