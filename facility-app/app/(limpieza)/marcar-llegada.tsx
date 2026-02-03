import * as Location from 'expo-location'
import { useEffect, useState } from 'react'
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native'
import { supabase } from '../../constants/supabase'

export default function MarcarLlegadaScreen() {
  const [lugar, setLugar] = useState('')
  const [hora, setHora] = useState('')
  const [fecha, setFecha] = useState('')
  const [fechaISO, setFechaISO] = useState('')
  const [latitud, setLatitud] = useState<number | null>(null)
  const [longitud, setLongitud] = useState<number | null>(null)

  // Empresas (autocompletar)
  const [empresas, setEmpresas] = useState<{ id: string; nombre: string; alias?: string | null }[]>([])
  const [filtradas, setFiltradas] = useState<{ id: string; nombre: string; alias?: string | null }[]>([])
  const [empresaSeleccionadaId, setEmpresaSeleccionadaId] = useState<string>('')

  useEffect(() => {
    const ahora = new Date()

    // hora tipo 18:34
    setHora(`${ahora.getHours()}:${ahora.getMinutes().toString().padStart(2, '0')}`)

    // fecha para mostrar tipo 20/06/2025
    const dia = String(ahora.getDate()).padStart(2, '0')
    const mes = String(ahora.getMonth() + 1).toString().padStart(2, '0')
    const anio = ahora.getFullYear()
    setFecha(`${dia}/${mes}/${anio}`)

    // fecha para guardar en la base (YYYY-MM-DD)
    const iso = ahora.toISOString().split('T')[0]
    setFechaISO(iso)

    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permiso denegado para acceder a la ubicación')
        return
      }
      const location = await Location.getCurrentPositionAsync({})
      setLatitud(location.coords.latitude)
      setLongitud(location.coords.longitude)
    })()

    // Cargar empresas para autocompletar
    ;(async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nombre, alias')
        .order('nombre', { ascending: true })
      if (error) {
        // Si no tiene permisos, lo avisamos (RLS)
        Alert.alert(
          'Permisos',
          'No se pueden leer las empresas. Avisá al admin para habilitar SELECT a rol "limpieza".'
        )
      } else {
        setEmpresas(data || [])
      }
    })()
  }, [])

  // Búsqueda en servidor (case-insensitive) con debounce
  useEffect(() => {
    const q = lugar.trim()
    const handler = setTimeout(async () => {
      if (!q) {
        setFiltradas([])
        return
      }
      try {
        // Consulta ilike por nombre o alias (case-insensitive)
        const { data, error } = await supabase
          .from('empresas')
          .select('id, nombre, alias')
          .or(`nombre.ilike.%${q}%,alias.ilike.%${q}%`)
          .order('nombre', { ascending: true })
          .limit(12)

        if (error) {
          // Fallback local si hay empresas cargadas y falla el SELECT (RLS)
          const ql = q.toLowerCase()
          const local = empresas
            .filter(e => {
              const nombreOk = e.nombre?.toLowerCase().includes(ql)
              const aliasOk = e.alias ? e.alias.toLowerCase().includes(ql) : false
              return nombreOk || aliasOk
            })
            .slice(0, 12)
          setFiltradas(local)
        } else {
          setFiltradas(data || [])
        }
      } catch (e) {
        // Fallback por excepción
        const ql = q.toLowerCase()
        const local = empresas
          .filter(e => {
            const nombreOk = e.nombre?.toLowerCase().includes(ql)
            const aliasOk = e.alias ? e.alias.toLowerCase().includes(ql) : false
            return nombreOk || aliasOk
          })
          .slice(0, 12)
        setFiltradas(local)
      }
    }, 200)
    return () => clearTimeout(handler)
  }, [lugar])

  const marcarLlegada = async () => {
    if (!empresaSeleccionadaId) {
      return Alert.alert(
        'Empresa requerida',
        'Seleccioná una Empresa/Cliente existente de la lista.'
      )
    }
    if (!lugar || latitud === null || longitud === null) {
      Alert.alert('Faltan datos', 'Completá todos los campos')
      return
    }

    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id
    if (!userId) {
      Alert.alert('Error', 'No se pudo obtener el usuario actual')
      return
    }

    // Guardamos el NOMBRE de la empresa en "lugar" (tu esquema actual no tiene empresa_id)
    const { error } = await supabase.from('llegadas').insert({
      usuario_id: userId,   // 👈 clave para RLS en "llegadas"
      lugar,                // nombre exacto de la empresa seleccionada
      fecha: fechaISO,      // "YYYY-MM-DD"
      hora,                 // "HH:mm"
      latitud,
      longitud,
    })

    if (error) {
      Alert.alert('Error al guardar llegada', error.message)
    } else {
      Alert.alert('¡Llegada registrada!')
      // Limpiamos solo el campo de "lugar"/selección
      setLugar('')
      setEmpresaSeleccionadaId('')
      setFiltradas([])
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>¿Dónde estás prestando servicio?</Text>

      <View style={{ position: 'relative' }}>
        <TextInput
          placeholder="Buscar y seleccionar Empresa/Cliente existente"
          value={lugar}
          onChangeText={(t) => {
            setLugar(t)
            setEmpresaSeleccionadaId('') // al tipear, invalida selección previa
          }}
          style={styles.input}
        />
        {lugar.trim().length > 0 && (
          <View style={styles.suggestBox}>
            {filtradas.length > 0 ? (
              <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 240 }}>
                {filtradas.map(e => (
                  <TouchableOpacity
                    key={e.id}
                    style={styles.suggestItem}
                    onPress={() => {
                      setLugar(e.nombre)
                      setEmpresaSeleccionadaId(e.id)
                      setFiltradas([])
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={{ color: '#0f172a' }}>
                      {e.nombre}{e.alias ? `  ·  (${e.alias})` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={[styles.suggestItem, { borderBottomWidth: 0 }]}> 
                <Text style={{ color: '#64748b' }}>No hay coincidencias</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <Text style={styles.texto}>🕒 Hora actual: {hora}</Text>
      <Text style={styles.texto}>📅 Fecha: {fecha}</Text>
      <Text style={styles.texto}>
        📍 Ubicación:{' '}
        {latitud != null && longitud != null
          ? `${latitud.toFixed(5)}, ${longitud.toFixed(5)}`
          : 'Cargando...'}
      </Text>

      <TouchableOpacity style={styles.boton} onPress={marcarLlegada}>
        <Text style={styles.botonTexto}>Marcar llegada</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    justifyContent: 'center'
  },
  titulo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    backgroundColor: '#fff'
  },
  // Caja de sugerencias
  suggestBox: {
    position: 'absolute',
    top: 58, // debajo del input
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    zIndex: 50,
    elevation: 6, // Android
  },
  suggestItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  texto: {
    marginBottom: 8
  },
  boton: {
    backgroundColor: 'green',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20
  },
  botonTexto: {
    color: '#fff',
    fontWeight: 'bold'
  }
})
