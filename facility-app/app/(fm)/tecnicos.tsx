import { supabase } from '@/constants/supabase'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

export default function ListaTecnicos() {
  const [tecnicos, setTecnicos] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [filtrados, setFiltrados] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    obtenerTecnicos()
  }, [])

  const obtenerTecnicos = async () => {
    setCargando(true)
    setErrorMsg(null)

    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, rol')
      .in('rol', ['mantenimiento', 'mantenimiento-externo']) // 👈 clave

    if (error) {
      setErrorMsg('No se pudieron cargar los técnicos.')
      setTecnicos([])
      setFiltrados([])
    } else {
      setTecnicos(data || [])
      setFiltrados(data || [])
    }

    setCargando(false)
  }

  useEffect(() => {
    const q = busqueda.trim().toLowerCase()
    const filtro = tecnicos.filter((t) => {
      const nombre = (t?.nombre || '').toString().toLowerCase()
      const apellido = (t?.apellido || '').toString().toLowerCase()
      return `${nombre} ${apellido}`.includes(q)
    })
    setFiltrados(filtro)
  }, [busqueda, tecnicos])

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.titulo}>Técnicos de mantenimiento</Text>

      <TextInput
        style={styles.input}
        placeholder="Buscar técnico por nombre o apellido"
        value={busqueda}
        onChangeText={setBusqueda}
      />

      {cargando ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 20 }} />
      ) : errorMsg ? (
        <Text style={{ color: '#ef4444', marginTop: 12 }}>{errorMsg}</Text>
      ) : filtrados.length === 0 ? (
        <View style={{ marginTop: 12 }}>
          <Text style={{ color: '#64748b' }}>No se encontraron técnicos.</Text>
        </View>
      ) : (
        filtrados.map((tecnico) => (
          <TouchableOpacity
            key={tecnico.id}
            style={styles.card}
            onPress={() => router.push(`/perfil-tecnico?id=${tecnico.id}`)}
          >
            <Text style={styles.cardNombre}>
              {tecnico.nombre} {tecnico.apellido}
            </Text>
            <Text style={styles.cardRol}>
              {tecnico.rol === 'mantenimiento-externo' ? 'Mantenimiento externo' : 'Mantenimiento'}
            </Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#fff',
    flex: 1,
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  cardNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  cardRol: {
    marginTop: 4,
    color: '#475569',
  },
})
