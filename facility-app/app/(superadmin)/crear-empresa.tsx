// app/(superadmin)/empresas/crear.tsx
import React, { useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/constants/supabase'

type Form = {
  nombre: string
  cuit: string
  email: string
  telefono: string
  direccion: string
  localidad: string
  provincia: string
}

const initial: Form = {
  nombre: '',
  cuit: '',
  email: '',
  telefono: '',
  direccion: '',
  localidad: '',
  provincia: '',
}

// Helpers (mismos que web)
const toSlug = (s: string) =>
  s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

export default function CrearEmpresaMovil() {
  const router = useRouter()
  const [f, setF] = useState<Form>(initial)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [focusKey, setFocusKey] = useState<keyof Form | null>(null)

  const nombreRef = useRef<TextInput>(null)

  const onChange = (k: keyof Form, v: string) => {
    setF(prev => ({ ...prev, [k]: v }))
    if (err) setErr(null)
    if (ok) setOk(null)
  }

  async function slugExiste(slug: string) {
    const { error, count } = await supabase
      .from('empresas')
      .select('id', { head: true, count: 'exact' })
      .eq('slug', slug)
    if (error) return false
    return (count ?? 0) > 0
  }

  async function generarSlugUnico(nombre: string) {
    const baseSlug = toSlug(nombre) || 'empresa'
    let candidate = baseSlug
    for (let i = 2; i < 100; i++) {
      if (!(await slugExiste(candidate))) return candidate
      candidate = `${baseSlug}-${i}`
    }
    return `${baseSlug}-${Date.now()}`
  }

  const disabled = useMemo(() => {
    return loading || !f.nombre.trim()
  }, [loading, f.nombre])

  const submit = async () => {
    setErr(null); setOk(null)

    if (!f.nombre.trim()) {
      setErr('Completá el nombre.')
      return
    }
    // ✅ Sin validación de CUIT (opcional, cualquier formato)

    setLoading(true)
    try {
      const slugFinal = await generarSlugUnico(f.nombre.trim())

      const payload = {
        nombre: f.nombre.trim(),
        cuit: f.cuit ? f.cuit.trim() : null, // ✅ se guarda tal cual
        email: f.email || null,
        telefono: f.telefono || null,
        direccion: f.direccion || null,
        localidad: f.localidad || null,
        provincia: f.provincia || null,
        slug: slugFinal,
      }

      const { data, error } = await supabase
        .from('empresas')
        .insert(payload)
        .select('id,nombre,slug')
        .single()

      if (error) {
        if ((error as any).code === '42501') {
          setErr('No tenés permisos para crear empresas (RLS).')
        } else {
          setErr(error.message || 'Error al crear la empresa.')
        }
        return
      }

      setOk(`Empresa creada: ${data?.nombre}`)
      setF(initial)
      setTimeout(() => nombreRef.current?.focus(), 100)
    } catch (e: any) {
      setErr(e?.message ?? 'Error inesperado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.btnBack}>
              <Ionicons name="chevron-back" size={20} color="#fff" />
              <Text style={styles.btnBackText}>Volver</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Nueva empresa / cliente</Text>
          </View>
          <Text style={styles.sub}>Completá los datos. El CUIT es opcional.</Text>

          {/* Alerts */}
          {err ? (
            <View style={[styles.alert, styles.alertError]}>
              <Text style={styles.alertTextError}>{err}</Text>
            </View>
          ) : null}
          {ok ? (
            <View style={[styles.alert, styles.alertOk]}>
              <Text style={styles.alertTextOk}>{ok}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.card}>
            <Field
              label="Nombre *"
              value={f.nombre}
              placeholder="Cliente Demo S.A."
              onChangeText={v => onChange('nombre', v)}
              onFocus={() => setFocusKey('nombre')}
              onBlur={() => setFocusKey(null)}
              focused={focusKey === 'nombre'}
              inputRef={nombreRef}
              autoFocus
              returnKeyType="next"
            />

            <View style={styles.row2}>
              <Field
                label="CUIT (opcional)"
                value={f.cuit}
                placeholder="30-12345678-9"
                onChangeText={v => onChange('cuit', v)}
                onFocus={() => setFocusKey('cuit')}
                onBlur={() => setFocusKey(null)}
                focused={focusKey === 'cuit'}
                keyboardType="default"    // ✅ permite guiones/espacios
                autoCapitalize="none"
              />
              <Field
                label="Email"
                value={f.email}
                placeholder="contacto@cliente.com"
                onChangeText={v => onChange('email', v)}
                onFocus={() => setFocusKey('email')}
                onBlur={() => setFocusKey(null)}
                focused={focusKey === 'email'}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.row2}>
              <Field
                label="Teléfono"
                value={f.telefono}
                placeholder="011-1234-5678"
                onChangeText={v => onChange('telefono', v)}
                onFocus={() => setFocusKey('telefono')}
                onBlur={() => setFocusKey(null)}
                focused={focusKey === 'telefono'}
                keyboardType="phone-pad"
              />
              <Field
                label="Dirección"
                value={f.direccion}
                placeholder="Av. Siempreviva 742"
                onChangeText={v => onChange('direccion', v)}
                onFocus={() => setFocusKey('direccion')}
                onBlur={() => setFocusKey(null)}
                focused={focusKey === 'direccion'}
              />
            </View>

            <View style={styles.row2}>
              <Field
                label="Localidad"
                value={f.localidad}
                placeholder="CABA"
                onChangeText={v => onChange('localidad', v)}
                onFocus={() => setFocusKey('localidad')}
                onBlur={() => setFocusKey(null)}
                focused={focusKey === 'localidad'}
              />
              <Field
                label="Provincia"
                value={f.provincia}
                placeholder="Buenos Aires"
                onChangeText={v => onChange('provincia', v)}
                onFocus={() => setFocusKey('provincia')}
                onBlur={() => setFocusKey(null)}
                focused={focusKey === 'provincia'}
              />
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btnPrimary, disabled && styles.btnDisabled]}
                onPress={submit}
                disabled={disabled}
              >
                {loading ? (
                  <ActivityIndicator />
                ) : (
                  <Text style={styles.btnPrimaryText}>Crear empresa</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnGhost}
                onPress={() => router.back()}
              >
                <Text style={styles.btnGhostText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

/** Input compuesto reutilizable */
function Field(props: {
  label: string
  value: string
  onChangeText: (v: string) => void
  placeholder?: string
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'phone-pad'
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  onFocus?: () => void
  onBlur?: () => void
  focused?: boolean
  inputRef?: React.RefObject<TextInput>
  autoFocus?: boolean
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send'
}) {
  const {
    label, value, onChangeText, placeholder,
    keyboardType = 'default', autoCapitalize = 'sentences',
    onFocus, onBlur, focused, inputRef, autoFocus, returnKeyType,
  } = props

  return (
    <View style={{ marginBottom: 12, flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={inputRef}
        style={[styles.input, focused && styles.inputFocused]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        onFocus={onFocus}
        onBlur={onBlur}
        autoCorrect={false}
        autoFocus={autoFocus}
        returnKeyType={returnKeyType}
      />
    </View>
  )
}

/** Styles */
const CONTROL_HEIGHT = 48

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 40, // 👈 margen de 40 arriba del contenido
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    marginBottom: 6,
  },
  btnBack: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6b7280',
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 10,
  },
  btnBackText: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 4,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  sub: { marginTop: 4, color: '#475569', marginBottom: 10 },

  alert: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  alertError: { backgroundColor: '#fee2e2', borderWidth: 2, borderColor: '#ef4444' },
  alertOk: { backgroundColor: '#d1fae5', borderWidth: 2, borderColor: '#10b981' },
  alertTextError: { color: '#b91c1c', fontWeight: '700' },
  alertTextOk: { color: '#065f46', fontWeight: '700' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  label: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    height: CONTROL_HEIGHT,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    color: '#0f172a',
  },
  inputFocused: {
    borderColor: '#1e40af',
    shadowColor: '#1e40af',
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  row2: {
    flexDirection: 'row',
    columnGap: 12,
  },
  actions: {
    flexDirection: 'row',
    columnGap: 12,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  btnPrimary: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: CONTROL_HEIGHT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e40af',
    backgroundColor: '#1e40af',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '800',
  },
  btnGhost: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    height: CONTROL_HEIGHT,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  btnGhostText: {
    color: '#0f172a',
    fontWeight: '700',
  },
})
