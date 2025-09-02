import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Form = {
  nombre: string
  cuit: string
  email: string
  telefono: string
  direccion: string
  localidad: string
  provincia: string
  slug: string
}

const initial: Form = {
  nombre: '',
  cuit: '',
  email: '',
  telefono: '',
  direccion: '',
  localidad: '',
  provincia: '',
  slug: '',
}

// Helpers
const toSlug = (s: string) =>
  s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // sin tildes
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')                    // separadores
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

const onlyDigits = (s: string) => s.replace(/\D/g, '')

function validarCUIT(cuitRaw: string): boolean {
  const cuit = onlyDigits(cuitRaw)
  if (cuit.length !== 11) return false
  const nums = cuit.split('').map(Number)
  const factores = [5,4,3,2,7,6,5,4,3,2]
  const base = nums.slice(0, 10)
  const dv = nums[10]
  const suma = base.reduce((acc, n, i) => acc + n * factores[i], 0)
  const mod = suma % 11
  const calc = mod === 0 ? 0 : mod === 1 ? 9 : 11 - mod
  return calc === dv
}

export default function CrearEmpresa() {
  const navigate = useNavigate()
  const [f, setF] = useState<Form>(initial)
  const [autoSlug, setAutoSlug] = useState(true)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [slugOk, setSlugOk] = useState<boolean | null>(null)

  // Autogenerar slug a partir del nombre
  useMemo(() => {
    if (autoSlug) {
      setF(prev => ({ ...prev, slug: toSlug(prev.nombre) }))
      setSlugOk(null)
    }
  }, [f.nombre, autoSlug])

  const onChange = (k: keyof Form, v: string) => {
    setF(prev => ({ ...prev, [k]: v }))
    setErr(null)
    setMsg(null)
  }

  async function checkSlugUnique(slug: string) {
    if (!slug) { setSlugOk(null); return }
    const { data, error } = await supabase
      .from('empresas')
      .select('id', { count: 'exact', head: true })
      .eq('slug', slug)
    if (error) {
      // Si no tenés slug en GRANT, usa la view pública para checkear por nombre en vez de slug.
      setSlugOk(null)
      return
    }
    setSlugOk((data === null) || (Array.isArray(data) && data.length === 0))
  }

  async function handleBlurSlug() {
    if (!f.slug) return
    await checkSlugUnique(f.slug)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null); setMsg(null)

    if (!f.nombre.trim()) {
      setErr('Completá el nombre.')
      return
    }
    if (f.cuit && !validarCUIT(f.cuit)) {
      setErr('El CUIT no es válido (opcional, pero si lo cargás debe ser válido).')
      return
    }
    if (!f.slug) {
      setErr('Generá o escribí un slug.')
      return
    }
    if (slugOk === false) {
      setErr('Ese slug ya existe. Elegí otro.')
      return
    }

    setLoading(true)
    const payload = {
      nombre: f.nombre.trim(),
      cuit: f.cuit ? onlyDigits(f.cuit) : null,
      email: f.email || null,
      telefono: f.telefono || null,
      direccion: f.direccion || null,
      localidad: f.localidad || null,
      provincia: f.provincia || null,
      slug: f.slug || null,
      // creado_por lo completa el trigger
    }

    const { data, error } = await supabase
      .from('empresas')
      .insert(payload)
      // devolveme solo lo permitido a todos por permisos de columnas
      .select('id,nombre,slug')
      .single()

    setLoading(false)

    if (error) {
      // Mensajes más claros para errores típicos
      if (error.code === '42501') {
        setErr('No tenés permisos para crear empresas (RLS).')
      } else if (error.message?.toLowerCase().includes('unique') && error.message?.includes('slug')) {
        setErr('Ese slug ya existe. Probá con otro.')
      } else {
        setErr(error.message || 'Error al crear la empresa.')
      }
      return
    }

    setMsg(`Empresa creada: ${data?.nombre}`)
    // Redirigí a donde la listes (ajustá ruta si querés)
    setTimeout(() => navigate('/fm/empresas'), 800)
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Nueva empresa / cliente</h1>
        <p style={styles.sub}>Completá los datos. El CUIT es opcional.</p>

        {err && <div style={styles.err}>{err}</div>}
        {msg && <div style={styles.ok}>{msg}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.row}>
            <label style={styles.label}>Nombre *</label>
            <input
              style={styles.input}
              value={f.nombre}
              onChange={e => onChange('nombre', e.target.value)}
              placeholder="Cliente Demo S.A."
            />
          </div>

          <div style={styles.row}>
            <label style={styles.label}>Slug</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                style={{ ...styles.input, flex: 1 }}
                value={f.slug}
                onChange={e => { setAutoSlug(false); onChange('slug', toSlug(e.target.value)) }}
                onBlur={handleBlurSlug}
                placeholder="cliente-demo"
              />
              <button
                type="button"
                style={styles.btnGhost}
                onClick={() => { setAutoSlug(true); setF(prev => ({ ...prev, slug: toSlug(prev.nombre) })); setSlugOk(null) }}
                title="Regenerar desde el nombre"
              >
                Auto
              </button>
              {slugOk === true && <span style={{ fontSize: 12 }}>✓ disponible</span>}
              {slugOk === false && <span style={{ fontSize: 12, color: '#b91c1c' }}>slug usado</span>}
            </div>
          </div>

          <div style={styles.grid2}>
            <div>
              <label style={styles.label}>CUIT (opcional)</label>
              <input
                style={styles.input}
                value={f.cuit}
                onChange={e => onChange('cuit', e.target.value)}
                placeholder="30-12345678-9"
              />
            </div>
            <div>
              <label style={styles.label}>Email</label>
              <input
                style={styles.input}
                type="email"
                value={f.email}
                onChange={e => onChange('email', e.target.value)}
                placeholder="contacto@cliente.com"
              />
            </div>
          </div>

          <div style={styles.grid2}>
            <div>
              <label style={styles.label}>Teléfono</label>
              <input
                style={styles.input}
                value={f.telefono}
                onChange={e => onChange('telefono', e.target.value)}
                placeholder="011-1234-5678"
              />
            </div>
            <div>
              <label style={styles.label}>Dirección</label>
              <input
                style={styles.input}
                value={f.direccion}
                onChange={e => onChange('direccion', e.target.value)}
                placeholder="Av. Siempreviva 742"
              />
            </div>
          </div>

          <div style={styles.grid2}>
            <div>
              <label style={styles.label}>Localidad</label>
              <input
                style={styles.input}
                value={f.localidad}
                onChange={e => onChange('localidad', e.target.value)}
                placeholder="CABA"
              />
            </div>
            <div>
              <label style={styles.label}>Provincia</label>
              <input
                style={styles.input}
                value={f.provincia}
                onChange={e => onChange('provincia', e.target.value)}
                placeholder="Buenos Aires"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button type="submit" disabled={loading} style={styles.btnPrimary}>
              {loading ? 'Creando...' : 'Crear empresa'}
            </button>
            <button type="button" style={styles.btnGhost} onClick={() => navigate(-1)}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: 760,
    background: 'var(--card, #111827)',
    borderRadius: 14,
    padding: 20,
    boxShadow: '0 4px 20px rgba(0,0,0,.18)',
    border: '1px solid rgba(255,255,255,.06)',
  },
  title: { margin: 0, fontSize: 22, fontWeight: 700 },
  sub: { marginTop: 6, opacity: .8 },
  form: { marginTop: 16 },
  row: { marginBottom: 12 },
  label: { display: 'block', fontSize: 13, marginBottom: 6, opacity: .9 },
  input: {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: '1px solid #374151', outline: 'none', background: 'transparent', color: 'inherit'
  },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
  btnPrimary: {
    padding: '10px 14px', borderRadius: 10, border: '1px solid #3b82f6',
    background: '#2563EB', color: '#fff', cursor: 'pointer'
  },
  btnGhost: {
    padding: '10px 14px', borderRadius: 10, border: '1px solid #374151',
    background: 'transparent', color: 'inherit', cursor: 'pointer'
  },
  err: {
    background: '#1f2937', border: '1px solid #b91c1c', color: '#fecaca',
    padding: '10px 12px', borderRadius: 10, marginBottom: 10
  },
  ok: {
    background: '#1f2937', border: '1px solid #10b981', color: '#d1fae5',
    padding: '10px 12px', borderRadius: 10, marginBottom: 10
  }
}
