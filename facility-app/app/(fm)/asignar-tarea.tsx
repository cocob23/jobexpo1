// app/(fm)/asignar-tarea.tsx
import { supabase } from '@/constants/supabase'
import { useEffect, useState } from 'react'
import DateTimePickerModal from 'react-native-modal-datetime-picker'
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

export default function AsignarTareaScreen() {
  const router = useRouter()

  const [usuarios, setUsuarios] = useState<any[]>([])
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<string>('')
  const [busquedaEmpleado, setBusquedaEmpleado] = useState('')
  const [empleadosFiltrados, setEmpleadosFiltrados] = useState<any[]>([])

  // --- Empresas / Clientes (nuevo como usuarios) ---
  const [empresas, setEmpresas] = useState<any[]>([])
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<string>('') // id
  const [busquedaEmpresa, setBusquedaEmpresa] = useState('')
  const [empresasFiltradas, setEmpresasFiltradas] = useState<any[]>([])
  const [empresa, setEmpresa] = useState('') // nombre (se sigue usando en el insert)

  const [descripcion, setDescripcion] = useState('')
  const [sucursal, setSucursal] = useState('')
  const [direccion, setDireccion] = useState('')
  const [provincia, setProvincia] = useState('')
  const [localidad, setLocalidad] = useState('')
  const [checklistItems, setChecklistItems] = useState<string[]>([])
  const [nuevoItem, setNuevoItem] = useState('')
  const [cargando, setCargando] = useState(false)
  const [fechaRealizacion, setFechaRealizacion] = useState(new Date())
  const [mostrarPicker, setMostrarPicker] = useState(false)

  useEffect(() => {
    obtenerUsuarios()
    obtenerEmpresas()
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

  const obtenerEmpresas = async () => {
    const { data, error } = await supabase
      .from('empresas')
      .select('id, nombre')
      .order('nombre', { ascending: true })

    if (error) {
      Alert.alert('Error', 'No se pudieron obtener las empresas/clientes')
      setEmpresas([])
    } else {
      setEmpresas(data || [])
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

  useEffect(() => {
    if (busquedaEmpresa.trim() === '') {
      setEmpresasFiltradas([])
      return
    }
    const res = empresas.filter((e) =>
      e.nombre.toLowerCase().includes(busquedaEmpresa.toLowerCase())
    )
    setEmpresasFiltradas(res)
  }, [busquedaEmpresa, empresas])

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
    if (!empresaSeleccionada) {
      Alert.alert(
        'Faltan datos',
        'Seleccioná una empresa/cliente existente. Si no existe, agregala primero desde "Agregar Empresa/Cliente".'
      )
      return
    }

    if (
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
        checklist: checklistItems.map((item) => ({
          texto: item,
          hecho: false,
        })),
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
      setEmpleadosFiltrados([])
      setDescripcion('')
      setSucursal('')
      setDireccion('')
      setProvincia('')
      setLocalidad('')
      setChecklistItems([])
      setFechaRealizacion(new Date())
      setEmpresa('')
      setEmpresaSeleccionada('')
      setBusquedaEmpresa('')
      setEmpresasFiltradas([])
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      {/* Header Back compacto */}
      <View style={{ paddingHorizontal: 24, paddingTop: 40, marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnBack}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
          <Text style={styles.btnBackText}>Volver</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 200 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.titulo}>Asignar Tarea</Text>

        {/* Empleado */}
        <Text style={styles.label}>Empleado de mantenimiento:</Text>
        <TextInput
          placeholder="Buscar por nombre o apellido"
          value={busquedaEmpleado}
          onChangeText={setBusquedaEmpleado}
          style={styles.input}
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

        {/* Empresa / Cliente */}
        <Text style={styles.label}>Empresa / Cliente:</Text>
        <TextInput
          placeholder="Buscar empresa o cliente"
          value={busquedaEmpresa}
          onChangeText={(txt) => {
            setBusquedaEmpresa(txt)
            setEmpresaSeleccionada('')
            setEmpresa('')
          }}
          style={styles.input}
        />
        {empresasFiltradas.map((e) => (
          <TouchableOpacity
            key={e.id}
            style={[
              styles.usuarioItem,
              empresaSeleccionada === e.id && styles.usuarioSeleccionado,
            ]}
            onPress={() => {
              if (empresaSeleccionada === e.id) {
                setEmpresaSeleccionada('')
                setBusquedaEmpresa('')
                setEmpresasFiltradas([])
                setEmpresa('')
              } else {
                setEmpresaSeleccionada(e.id)
                setBusquedaEmpresa(e.nombre)
                setEmpresasFiltradas([])
                setEmpresa(e.nombre)
              }
            }}
          >
            <Text
              style={[
                styles.usuarioTexto,
                empresaSeleccionada === e.id && styles.usuarioTextoSeleccionado,
              ]}
            >
              {e.nombre}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Ubicación */}
        <Text style={styles.label}>Sucursal:</Text>
        <TextInput value={sucursal} onChangeText={setSucursal} style={styles.input} />

        <Text style={styles.label}>Provincia:</Text>
        <TextInput value={provincia} onChangeText={setProvincia} style={styles.input} />

        <Text style={styles.label}>Localidad:</Text>
        <TextInput value={localidad} onChangeText={setLocalidad} style={styles.input} />

        <Text style={styles.label}>Dirección:</Text>
        <TextInput value={direccion} onChangeText={setDireccion} style={styles.input} />

        {/* Descripción */}
        <Text style={styles.label}>Descripción de la tarea:</Text>
        <TextInput
          value={descripcion}
          onChangeText={setDescripcion}
          style={styles.input}
          multiline
        />

        {/* Checklist */}
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
          />
          <TouchableOpacity style={styles.botonAgregar} onPress={agregarItemChecklist}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Fecha y hora */}
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

        {/* Asignar */}
        <TouchableOpacity style={styles.boton} onPress={asignarTarea} disabled={cargando}>
          <Text style={styles.botonTexto}>
            {cargando ? 'Asignando...' : 'Asignar tarea'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  btnBack: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6b7280',
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 10,
  },
  btnBackText: { color: '#fff', fontWeight: '700', marginLeft: 4 },

  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  usuarioItem: {
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
  },
  usuarioSeleccionado: {
    backgroundColor: '#2563EB',
  },
  usuarioTexto: {
    fontSize: 16,
  },
  usuarioTextoSeleccionado: {
    color: '#fff',
    fontWeight: 'bold',
  },
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
  },
  botonTexto: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  botonAgregar: {
    backgroundColor: '#1e40af',
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
