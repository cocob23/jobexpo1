import { supabase } from '@/constants/supabase'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

export default function TicketsSuperadmin() {
  const [tickets, setTickets] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [imagenSeleccionada, setImagenSeleccionada] = useState<string | null>(null)

  useEffect(() => {
    cargarTickets()
  }, [])

  const cargarTickets = async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from('tickets')
      .select(
        'id, descripcion, foto, fecha_reporte, estado, importe, usuario_id, usuarios(nombre, apellido, email)'
      )
      .order('fecha_reporte', { ascending: false })

    if (error) {
      Alert.alert('Error', 'No se pudieron cargar los tickets')
    } else {
      setTickets(data || [])
    }

    setCargando(false)
  }

  const cambiarEstado = async (
    id: string,
    nuevoEstado: 'Aprobado' | 'Desaprobado'
  ) => {
    const { error } = await supabase
      .from('tickets')
      .update({ estado: nuevoEstado })
      .eq('id', id)

    if (error) {
      Alert.alert('Error', 'No se pudo actualizar el estado')
    } else {
      cargarTickets()
    }
  }

  const renderItem = ({ item }: any) => {
    const nombreUsuario =
      item.usuarios?.nombre || item.usuarios?.email || 'Usuario'

    return (
      <View style={styles.card}>
        {item.foto && (
          <TouchableOpacity onPress={() => setImagenSeleccionada(item.foto)}>
            <Image source={{ uri: item.foto }} style={styles.imagen} />
          </TouchableOpacity>
        )}

        <Text style={styles.label}>Usuario:</Text>
        <Text style={styles.valor}>{nombreUsuario}</Text>

        <Text style={styles.label}>Descripción:</Text>
        <Text style={styles.valor}>{item.descripcion}</Text>

        <Text style={styles.label}>Importe:</Text>
        <Text style={styles.valor}>${item.importe}</Text>

        <Text style={styles.label}>Fecha:</Text>
        <Text style={styles.valor}>
          {new Date(item.fecha_reporte).toLocaleDateString()}
        </Text>

        <Text style={styles.label}>Estado:</Text>
        <Text
          style={[
            styles.estadoTexto,
            item.estado === 'Aprobado'
              ? styles.estadoAprobado
              : item.estado === 'Desaprobado'
              ? styles.estadoDesaprobado
              : styles.estadoPendiente,
          ]}
        >
          {item.estado}
        </Text>

        <View style={styles.botones}>
          <TouchableOpacity
            style={[styles.boton, styles.aprobar]}
            onPress={() => cambiarEstado(item.id, 'Aprobado')}
          >
            <Text style={styles.botonTexto}>Aprobar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.boton, styles.desaprobar]}
            onPress={() => cambiarEstado(item.id, 'Desaprobado')}
          >
            <Text style={styles.botonTexto}>Desaprobar</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
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
      <View style={styles.container}>
        <Text style={styles.titulo}>Tickets cargados</Text>

        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }}
        />

        <Modal visible={!!imagenSeleccionada} transparent>
          <View style={styles.modalContainer}>
            <Pressable
              style={styles.modalBackground}
              onPress={() => setImagenSeleccionada(null)}
            >
              {imagenSeleccionada && (
                <Image
                  source={{ uri: imagenSeleccionada }}
                  style={styles.imagenExpandida}
                  resizeMode="contain"
                />
              )}
            </Pressable>
          </View>
        </Modal>
      </View>
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
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  card: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  imagen: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  imagenExpandida: {
    width: '100%',
    height: '100%',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackground: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontWeight: 'bold',
    marginTop: 8,
  },
  valor: {
    fontSize: 15,
  },
  botones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  boton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  aprobar: {
    backgroundColor: '#16a34a',
  },
  desaprobar: {
    backgroundColor: '#dc2626',
  },
  botonTexto: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  estadoTexto: {
    fontSize: 15,
    fontWeight: 'bold',
    textTransform: 'capitalize',
    marginTop: 4,
  },
  estadoAprobado: { color: 'green' },
  estadoDesaprobado: { color: 'red' },
  estadoPendiente: { color: '#ca8a04' },
})
