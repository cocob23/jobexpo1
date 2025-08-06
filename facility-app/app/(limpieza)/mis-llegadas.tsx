import { useEffect, useState } from 'react'
import { FlatList, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { supabase } from '../../constants/supabase'

export default function MisLlegadas() {
  const [llegadas, setLlegadas] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const obtenerLlegadas = async () => {
      const { data: usuarioData } = await supabase.auth.getUser()
      const usuarioId = usuarioData?.user?.id

      if (!usuarioId) {
        setLlegadas([])
        setCargando(false)
        return
      }

      const { data, error } = await supabase
        .from('llegadas')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('fecha', { ascending: false })

      if (error) {
        console.error('Error al traer llegadas:', error)
        setLlegadas([])
      } else {
        setLlegadas(data || [])
      }

      setCargando(false)
    }

    obtenerLlegadas()
  }, [])

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Mis llegadas</Text>

      {cargando ? (
        <Text>Cargando...</Text>
      ) : llegadas.length === 0 ? (
        <Text>No tenés llegadas registradas.</Text>
      ) : (
        <FlatList
          data={llegadas}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text style={styles.texto}>📍 {item.lugar}</Text>
              <Text style={styles.texto}>🕒 {item.hora}</Text>
              <Text style={styles.texto}>📅 {item.fecha.split('T')[0]}</Text>
              <TouchableOpacity
                onPress={() =>
                Linking.openURL(`https://www.google.com/maps?q=${item.latitud},${item.longitud}`)
                }
              >
            <Text style={{ color: 'blue' }}>Ver mapa</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
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
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  item: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  texto: {
    fontSize: 14,
    marginBottom: 4,
  },
})
