import { supabase } from '@/constants/supabase'
import * as FileSystem from 'expo-file-system'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { shareAsync } from 'expo-sharing'
import { useEffect, useState } from 'react'
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

export default function DetalleTareaScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams()
  const [tarea, setTarea] = useState<any>(null)
  const [checklist, setChecklist] = useState<{ texto: string; hecho: boolean }[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  useEffect(() => {
    obtenerTarea()
  }, [])

  const obtenerTarea = async () => {
    const { data, error } = await supabase
      .from('trabajos_mantenimiento')
      .select(`
        *,
        usuarios:usuario_id (
          nombre,
          apellido
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      Alert.alert('Error', 'No se pudo obtener la tarea')
    } else {
      setTarea(data)
      setChecklist(data.checklist || [])
      setPdfUrl(data.parte_pdf || null)
    }
    setRefreshing(false)
  }

  const onRefresh = () => {
    setRefreshing(true)
    obtenerTarea()
  }

  const descargarPDF = async () => {
    if (!pdfUrl) return
    try {
      const localPath = FileSystem.documentDirectory + 'parte_tecnico.pdf'
      const downloadResumable = FileSystem.createDownloadResumable(pdfUrl, localPath)
      const downloadResult = await downloadResumable.downloadAsync()
      const uri = downloadResult?.uri
      if (uri) {
        await shareAsync(uri)
      } else {
        Alert.alert('Error', 'No se pudo descargar el PDF')
      }
    } catch (error) {
      Alert.alert('Error', 'Hubo un problema al descargar el PDF')
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 180 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Botón Volver visible siempre (inline) */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backInline} activeOpacity={0.85}>
          <Ionicons name="chevron-back" size={20} color="#0f172a" />
          <Text style={styles.backInlineText}>Volver</Text>
        </TouchableOpacity>

        <Image source={require('@/assets/images/logo.png')} style={styles.logo} />
        <Text style={styles.titulo}>Detalle de la Tarea</Text>

        {tarea && (
          <>
            <Text style={styles.label}>Empresa:</Text>
            <Text style={styles.texto}>{tarea.empresa}</Text>

            <Text style={styles.label}>Asignado a:</Text>
            <Text style={styles.texto}>
              {tarea.usuarios?.nombre} {tarea.usuarios?.apellido}
            </Text>

            <Text style={styles.label}>Sucursal:</Text>
            <Text style={styles.texto}>{tarea.sucursal}</Text>

            <Text style={styles.label}>Provincia:</Text>
            <Text style={styles.texto}>{tarea.provincia}</Text>

            <Text style={styles.label}>Localidad:</Text>
            <Text style={styles.texto}>{tarea.localidad}</Text>

            <Text style={styles.label}>Dirección:</Text>
            <Text style={styles.texto}>{tarea.direccion}</Text>

            <Text style={styles.label}>Fecha y hora de realización:</Text>
            <Text style={styles.texto}>
              {new Date(tarea.fecha_realizacion).toLocaleString('es-AR')}
            </Text>

            <Text style={styles.label}>Descripción:</Text>
            <Text style={styles.texto}>{tarea.descripcion}</Text>

            <Text style={styles.label}>Estado:</Text>
            <Text style={styles.texto}>{tarea.estado}</Text>

            <Text style={styles.label}>Comentarios:</Text>
            <Text style={styles.texto}>{tarea.comentarios || 'Sin comentarios'}</Text>

            <Text style={styles.label}>Checklist:</Text>
            {checklist.length > 0 ? (
              checklist.map((item, index) => (
                <View
                  key={index}
                  style={[
                    styles.itemChecklist,
                    item.hecho ? styles.itemChecklistHecho : styles.itemChecklistPendiente,
                  ]}
                >
                  <Text style={styles.textoChecklist}>{item.texto}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.texto}>Sin checklist definido</Text>
            )}

            {pdfUrl ? (
              <TouchableOpacity style={styles.botonSecundario} onPress={descargarPDF}>
                <Text style={styles.botonTextoSecundario}>Descargar parte técnico</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.aviso}>
                Todavía el técnico no generó el parte técnico.
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  // Safe area para que no lo tape el notch
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

  // Botón volver inline
  backInline: {
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  backInlineText: { color: '#0f172a', fontWeight: '600' },

  logo: {
    width: 270,
    height: 90,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    alignSelf: 'center',
  },
  label: { fontWeight: 'bold', marginTop: 10 },
  texto: { fontSize: 16, marginBottom: 10 },

  itemChecklist: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginVertical: 4,
  },
  itemChecklistHecho: {
    borderColor: '#22c55e',
    backgroundColor: '#dcfce7',
  },
  itemChecklistPendiente: {
    borderColor: '#ef4444',
    backgroundColor: '#fee2e2',
  },
  textoChecklist: { fontSize: 15, color: '#111' },

  botonSecundario: {
    borderColor: '#2563EB',
    borderWidth: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  botonTextoSecundario: {
    color: '#2563EB',
    fontWeight: 'bold',
    fontSize: 16,
  },
  aviso: {
    marginTop: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
})
