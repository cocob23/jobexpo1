import React, { useEffect, useState, useCallback } from 'react'
import { SafeAreaView, ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/constants/supabase'

type Empresa = {
  id: string
  nombre: string
  cuit: string | null
  email: string | null
  telefono: string | null
  direccion: string | null
  localidad: string | null
  provincia: string | null
  slug: string
}

const fmtCUIT = (c: string | null) => {
  if (!c) return '—'
  const d = c.replace(/\D/g, '')
  if (d.length !== 11) return c
  return `${d.slice(0,2)}-${d.slice(2,10)}-${d.slice(10)}`
}

export default function EmpresasClientesFM() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [list, setList] = useState<Empresa[]>([])

  const fetchEmpresas = async () => {
    setError(null)
    const { data, error } = await supabase
      .from('empresas')
      .select('id,nombre,cuit,email,telefono,direccion,localidad,provincia,slug')
      .order('nombre', { ascending: true })
    if (error) {
      setError(error.message || 'No se pudo cargar el listado.')
    } else {
      setList(data || [])
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchEmpresas().finally(() => setLoading(false))
  }, [])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchEmpresas().finally(() => setRefreshing(false))
  }, [])

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>Empresas / Clientes</Text>

        {error && (
          <View style={[styles.alert, styles.alertError]}>
            <Text style={styles.alertErrorText}>{error}</Text>
          </View>
        )}

        {!loading && !error && list.length === 0 && (
          <View style={[styles.alert, styles.alertInfo]}>
            <Text style={styles.alertInfoText}>No hay empresas cargadas.</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.skelWrap}>
            {[...Array(4)].map((_, i) => (
              <View key={i} style={styles.skelCard} />
            ))}
          </View>
        ) : (
          <View style={styles.list}>
            {list.map((e) => (
              <View key={e.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="business-outline" size={20} color="#0F172A" />
                  <Text style={styles.cardTitle}>{e.nombre}</Text>
                </View>

                <View style={styles.row}>
                  <Ionicons name="pricetag-outline" size={18} color="#475569" />
                  <Text style={styles.rowText}>CUIT: {fmtCUIT(e.cuit)}</Text>
                </View>

                {!!e.email && (
                  <View style={styles.row}>
                    <Ionicons name="mail-outline" size={18} color="#475569" />
                    <Text style={styles.rowText}>{e.email}</Text>
                  </View>
                )}

                {!!e.telefono && (
                  <View style={styles.row}>
                    <Ionicons name="call-outline" size={18} color="#475569" />
                    <Text style={styles.rowText}>{e.telefono}</Text>
                  </View>
                )}

                {(e.direccion || e.localidad || e.provincia) && (
                  <View style={styles.row}>
                    <Ionicons name="location-outline" size={18} color="#475569" />
                    <Text style={styles.rowText}>
                      {[e.direccion, e.localidad, e.provincia].filter(Boolean).join(', ')}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#0F172A', marginBottom: 12 },

  alert: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  alertError: { backgroundColor: '#fee2e2', borderWidth: 2, borderColor: '#ef4444' },
  alertErrorText: { color: '#b91c1c', fontWeight: '700' },
  alertInfo: { backgroundColor: '#EFF6FF', borderWidth: 2, borderColor: '#93C5FD' },
  alertInfoText: { color: '#1e3a8a', fontWeight: '700' },

  skelWrap: { gap: 10 },
  skelCard: {
    height: 110,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    opacity: 0.5,
  },

  list: { gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', columnGap: 8, marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', columnGap: 8, marginTop: 2 },
  rowText: { color: '#0F172A' },
})
