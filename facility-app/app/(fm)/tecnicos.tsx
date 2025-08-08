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
} from 'react-native'

export default function ListaTecnicos() {
  const [tecnicos, setTecnicos] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [filtrados, setFiltrados] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    obtenerTecnicos()
  }, [])

  const obtenerTecnicos = async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido')
      .eq('rol', 'mantenimiento')

    if (!error) {
      setTecnicos(data || [])
      setFiltrados(data || [])
    }

    setCargando(false)
  }

  useEffect(() => {
    const filtro = tecnicos.filter((t) =>
      `${t.nombre} ${t.apellido}`.toLowerCase().includes(busqueda.toLowerCase())
    )
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
})
