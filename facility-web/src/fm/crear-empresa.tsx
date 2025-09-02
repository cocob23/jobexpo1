import { useRef, useState } from 'react'
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

// Helpers
const toSlug = (s: string) =>
  s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
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
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const nombreRef = useRef<HTMLInputElement>(null)

  const onChange = (k: keyof Form, v: string) => {
    setF(prev => ({ ...prev, [k]: v }))
    setErr(null)
    setMsg(null)
  }

  // Chequea si un slug existe (para resolver colisiones silenciosamente)
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

    setLoading(true)

    // Generar slug automáticamente (oculto para el usuario)
    const slugFinal = await generarSlugUnico(f.nombre.trim())

    const payload = {
      nombre: f.nombre.trim(),
      cuit: f.cuit ? onlyDigits(f.cuit) : null,
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

    setLoading(false)

    if (error) {
      if (error.code === '42501') setErr('No tenés permisos para crear empresas (RLS).')
      else setErr(error.message || 'Error al crear la empresa.')
      return
    }

    // Éxito: mostrar mensaje, limpiar formulario y dejar foco en "Nombre".
    setMsg(`Empresa creada: ${data?.nombre}`)
    setF(initial)
    setTimeout(() => nombreRef.current?.focus(), 0)
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.headerRow}>
          <button onClick={() => navigate(-1)} style={styles.btnBack}>← Volver</button>
          <h1 style={styles.title}>Nueva empresa / cliente</h1>
        </div>
        <p style={styles.sub}>Completá los datos. El CUIT es opcional.</p>

        {err && <div style={styles.alertError}>{err}</div>}
        {msg && <div style={styles.alertOk}>{msg}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.row}>
            <label style={styles.label}>Nombre *</label>
            <input
              ref={nombreRef}
              style={styles.input}
              value={f.nombre}
              onChange={e => onChange('nombre', e.target.value)}
              placeholder="Cliente Demo S.A."
              onFocus={focusOn}
              onBlur={blurOn}
              autoFocus
            />
          </div>

          <div style={styles.grid2}>
            <div>
              <label style={styles.label}>CUIT (opcional)</label>
              <input
                style={styles.input}
                value={f.cuit}
                onChange={e => onChange('cuit', e.target.value)}
                placeholder="30-12345678-9"
                onFocus={focusOn}
                onBlur={blurOn}
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
                onFocus={focusOn}
                onBlur={blurOn}
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
                onFocus={focusOn}
                onBlur={blurOn}
              />
            </div>
            <div>
              <label style={styles.label}>Dirección</label>
              <input
                style={styles.input}
                value={f.direccion}
                onChange={e => onChange('direccion', e.target.value)}
                placeholder="Av. Siempreviva 742"
                onFocus={focusOn}
                onBlur={blurOn}
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
                onFocus={focusOn}
                onBlur={blurOn}
              />
            </div>
            <div>
              <label style={styles.label}>Provincia</label>
              <input
                style={styles.input}
                value={f.provincia}
                onChange={e => onChange('provincia', e.target.value)}
                placeholder="Buenos Aires"
                onFocus={focusOn}
                onBlur={blurOn}
              />
            </div>
          </div>

          <div style={styles.actions}>
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

/** Focus helpers */
function focusOn(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = '#1e40af'
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30, 64, 175, 0.10)'
}
function blurOn(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = '#e2e8f0'
  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
}

/** Styles */
const CONTROL_HEIGHT = 44

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '40px 16px',
    boxSizing: 'border-box',
  },
  card: {
    maxWidth: 900,
    margin: '0 auto',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 24,
    boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb',
    fontFamily: `'Segoe UI', system-ui, -apple-system, sans-serif`,
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  btnBack: {
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  title: { margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' },
  sub: { marginTop: 6, color: '#475569' },
  form: { marginTop: 16 },
  row: { marginBottom: 12 },
  label: { display: 'block', fontSize: 13, marginBottom: 6, color: '#334155', fontWeight: 600 },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 12,
    border: '2px solid #e2e8f0',
    outline: 'none',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    fontSize: 15,
    transition: 'all .15s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    height: CONTROL_HEIGHT,
    lineHeight: `${CONTROL_HEIGHT - 18}px`,
    boxSizing: 'border-box',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginBottom: 12,
  },
  actions: {
    display: 'flex',
    gap: 12,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  btnPrimary: {
    padding: '0 16px',
    height: CONTROL_HEIGHT,
    borderRadius: 12,
    border: '1px solid #1e40af',
    background: '#1e40af',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all .15s ease',
    boxShadow: '0 2px 6px rgba(0,0,0,0.10)',
  },
  btnGhost: {
    padding: '0 16px',
    height: CONTROL_HEIGHT,
    borderRadius: 12,
    border: '2px solid #e2e8f0',
    background: '#ffffff',
    color: '#0f172a',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all .15s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  alertError: {
    background: '#fee2e2',
    border: '2px solid #ef4444',
    color: '#b91c1c',
    padding: '12px 14px',
    borderRadius: 12,
    marginBottom: 10,
    fontWeight: 600,
  },
  alertOk: {
    background: '#d1fae5',
    border: '2px solid #10b981',
    color: '#065f46',
    padding: '12px 14px',
    borderRadius: 12,
    marginBottom: 10,
    fontWeight: 600,
  },
}

// Responsive
;(function applyResponsive() {
  if (typeof window === 'undefined') return
  const mql = window.matchMedia('(max-width: 768px)')
  const set = () => {
    styles.grid2.gridTemplateColumns = mql.matches ? '1fr' : '1fr 1fr'
  }
  set()
  mql.addEventListener('change', set)
})()
