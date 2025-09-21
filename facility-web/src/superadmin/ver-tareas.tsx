import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

type Estado = 'Pendiente' | 'Realizado'
type UsuarioMin = { nombre: string | null; apellido: string | null }

type Tarea = {
  id: number
  descripcion: string | null
  estado: Estado
  empresa: string | null
  fecha_realizacion: string | null
  usuarios: UsuarioMin | null
  fm: UsuarioMin | null
}

type TareaRaw = Omit<Tarea, 'usuarios' | 'fm'> & {
  usuarios: UsuarioMin | UsuarioMin[] | null
  fm: UsuarioMin | UsuarioMin[] | null
}

export default function VerTareasSuperadmin() {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState<Estado>('Pendiente')
  const [fmInput, setFmInput] = useState('')
  const [empresaInput, setEmpresaInput] = useState('')
  const [fechaDesde, setFechaDesde] = useState('') // YYYY-MM-DD
  const [fechaHasta, setFechaHasta] = useState('') // YYYY-MM-DD

  useEffect(() => {
    aplicarFiltros()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const norm = (u: UsuarioMin | UsuarioMin[] | null): UsuarioMin | null =>
    Array.isArray(u) ? (u[0] ?? null) : (u ?? null)

  const toISOStart = (d: string) => (d ? `${d}T00:00:00` : undefined)
  const toISOEnd = (d: string) => (d ? `${d}T23:59:59` : undefined)

  async function aplicarFiltros(opts?: {
    filtroEstado?: Estado
    fmInput?: string
    empresaInput?: string
    fechaDesde?: string
    fechaHasta?: string
  }) {
    setLoading(true)
    setError(null)
    try {
      const estado = opts?.filtroEstado ?? filtroEstado
      const fmTerm = (opts?.fmInput ?? fmInput).trim()
      const empTerm = (opts?.empresaInput ?? empresaInput).trim()
      const desde = opts?.fechaDesde ?? fechaDesde
      const hasta = opts?.fechaHasta ?? fechaHasta

      let query = supabase
        .from('trabajos_mantenimiento')
        .select(`
          id,
          descripcion,
          estado,
          empresa,
          fecha_realizacion,
          usuarios:usuario_id ( nombre, apellido ),
          fm:fm_id ( nombre, apellido )
        `)
        .eq('estado', estado)
        .order('fecha_realizacion', { ascending: true })

      // 🔎 Filtrar por FM
      if (fmTerm) {
        const { data: fms, error: fmErr } = await supabase
          .from('usuarios')
          .select('id')
          .eq('rol', 'fm')
          .or(`nombre.ilike.%${fmTerm}%,apellido.ilike.%${fmTerm}%`)
        if (fmErr) throw fmErr
        const fmIds = (fms || []).map((u) => u.id)
        if (fmIds.length === 0) {
          setTareas([])
          setLoading(false)
          return
        }
        query = query.in('fm_id', fmIds)
      }

      // 🏢 Empresa
      if (empTerm) query = query.ilike('empresa', `%${empTerm}%`)

      // 📅 Rango fechas
      const desdeISO = toISOStart(desde)
      const hastaISO = toISOEnd(hasta)
      if (desdeISO) query = query.gte('fecha_realizacion', desdeISO)
      if (hastaISO) query = query.lte('fecha_realizacion', hastaISO)

      const { data, error } = await query
      if (error) throw error

      const rows = (data as TareaRaw[] | null) ?? []
      const normalizadas: Tarea[] = rows.map((r) => ({
        id: r.id,
        descripcion: r.descripcion,
        estado: r.estado,
        empresa: r.empresa,
        fecha_realizacion: r.fecha_realizacion,
        usuarios: norm(r.usuarios),
        fm: norm(r.fm),
      }))

      setTareas(normalizadas)
    } catch (err) {
      console.error(err)
      setError('No se pudieron cargar las tareas.')
      setTareas([])
    } finally {
      setLoading(false)
    }
  }

  function limpiarFiltros() {
    setFiltroEstado('Pendiente')
    setFmInput('')
    setEmpresaInput('')
    setFechaDesde('')
    setFechaHasta('')
    aplicarFiltros({
      filtroEstado: 'Pendiente',
      fmInput: '',
      empresaInput: '',
      fechaDesde: '',
      fechaHasta: '',
    })
  }

  const fmtFecha = (v?: string | null) => {
    if (!v) return '—'
    const d = new Date(v)
    return isNaN(+d) ? '—' : d.toLocaleString()
  }

  const irADetalle = (id: number) => {
    navigate(`/superadmin/detalle-tarea/${id}`)
  }

  // 👉 click dinámico en chips (sólo cambia estado y aplica filtros)
  const onChipClick = (estado: Estado) => {
    if (estado === filtroEstado) return
    setFiltroEstado(estado)
    aplicarFiltros({ filtroEstado: estado })
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.headerRow}>
        <button onClick={() => navigate('/superadmin')} style={styles.btnBack}>
          ← Volver
        </button>
        <h2 style={styles.title}>Tareas (Superadmin)</h2>
      </div>

      {/* Filtros */}
      <div style={styles.filtersCard}>
        <div style={styles.filtersRow}>
          {/* Estado */}
          <div style={styles.chipsRow}>
            <button
              onClick={() => onChipClick('Pendiente')}
              aria-pressed={filtroEstado === 'Pendiente'}
              style={{
                ...styles.chip,
                ...(filtroEstado === 'Pendiente' ? styles.chipActive : {}),
              }}
            >
              Pendientes
            </button>
            <button
              onClick={() => onChipClick('Realizado')}
              aria-pressed={filtroEstado === 'Realizado'}
              style={{
                ...styles.chip,
                ...(filtroEstado === 'Realizado' ? styles.chipActive : {}),
              }}
            >
              Realizadas
            </button>
          </div>

          {/* FM + Empresa */}
          <div style={styles.inputsRow}>
            <input
              type="text"
              placeholder="FM (nombre o apellido)"
              value={fmInput}
              onChange={(e) => setFmInput(e.target.value)}
              style={styles.inputSm}
            />
            <input
              type="text"
              placeholder="Empresa"
              value={empresaInput}
              onChange={(e) => setEmpresaInput(e.target.value)}
              style={styles.inputSm}
            />
          </div>

          {/* Fechas + acciones */}
          <div style={styles.actionsRow}>
            <div style={styles.dateGroup}>
              <label style={styles.inputLabel}>Desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                style={styles.inputDate}
              />
            </div>
            <div style={styles.dateGroup}>
              <label style={styles.inputLabel}>Hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                style={styles.inputDate}
              />
            </div>

            <div style={styles.applyRow}>
              <button onClick={limpiarFiltros} disabled={loading} style={styles.btnLight}>
                Limpiar
              </button>
              <button onClick={() => aplicarFiltros()} disabled={loading} style={styles.btnPrimary}>
                {loading ? 'Aplicando…' : 'Aplicar filtros'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      {loading ? (
        <p style={styles.centerText}>Cargando tareas...</p>
      ) : error ? (
        <p style={{ ...styles.centerText, color: '#b91c1c' }}>{error}</p>
      ) : tareas.length === 0 ? (
        <div style={styles.cardsWrapper}>
          <p style={styles.centerText}>No hay tareas para los filtros seleccionados.</p>
        </div>
      ) : (
        <div style={styles.cardsWrapper}>
          <div style={styles.cardsGrid}>
            {tareas.map((t) => {
              const realizada = t.estado === 'Realizado'
              return (
                <div
                  key={t.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => irADetalle(t.id)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && irADetalle(t.id)}
                  style={styles.card}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.08)' }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.06)' }}
                >
                  <div style={styles.cardHeader}>
                    <h4 style={styles.cardTitle}>{t.descripcion || 'Sin descripción'}</h4>
                    <span
                      style={{
                        ...styles.badge,
                        ...(realizada ? styles.badgeOk : styles.badgePending),
                      }}
                    >
                      {realizada ? 'REALIZADA' : 'NO REALIZADA'}
                    </span>
                  </div>
                  <p style={styles.cardLine}><strong>Técnico:</strong> {t.usuarios?.nombre} {t.usuarios?.apellido}</p>
                  <p style={styles.cardLine}><strong>FM:</strong> {t.fm?.nombre} {t.fm?.apellido}</p>
                  <p style={styles.cardLine}><strong>Empresa:</strong> {t.empresa || '—'}</p>
                  <p style={styles.cardLine}><strong>Fecha:</strong> {fmtFecha(t.fecha_realizacion)}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

const styles: { [k: string]: React.CSSProperties } = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '24px',
    display: 'grid',
    justifyItems: 'center',
    alignContent: 'start',
    gap: '16px',
  },
  headerRow: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    alignItems: 'center',
    gap: '12px',
    width: 'min(1100px, 100%)',
  },
  btnBack: {
    backgroundColor: '#6b7280',
    color: '#fff',
    border: 'none',
    padding: '10px 16px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  title: {
    margin: 0,
    textAlign: 'center',
    fontSize: '1.6rem',
    fontWeight: 700,
    color: '#1e293b',
  },

  filtersCard: {
    width: 'min(1100px, 100%)',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: '12px 14px',
    border: '1px solid e2e8f0',
  },
  filtersRow: { display: 'grid', gap: 10 },
  chipsRow: { display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  chip: {
    padding: '8px 14px',
    borderRadius: 18,
    border: '1px solid #2563EB',
    background: '#fff',
    color: '#2563EB',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all .15s ease',
  },
  chipActive: {
    background: '#2563EB',
    color: '#fff',
    transform: 'translateY(-1px)',
    boxShadow: '0 6px 12px rgba(37,99,235,0.15)',
  },
  inputsRow: { display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  inputSm: {
    minWidth: 160,
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid #E2E8F0',
    fontSize: 14,
    flex: '0 1 220px',
  },

  actionsRow: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
  dateGroup: { display: 'flex', gap: 6, alignItems: 'center' },
  inputLabel: { fontSize: 13, color: '#334155' },
  inputDate: { padding: '6px 8px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 14 },

  applyRow: { display: 'flex', gap: 8 },
  btnPrimary: {
    padding: '10px 16px',
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    color: '#fff',
    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
    boxShadow: '0 6px 14px rgba(37,99,235,0.25)',
    transition: 'transform .12s ease, box-shadow .12s ease, filter .12s ease',
  },
  btnLight: {
    padding: '10px 16px',
    borderRadius: 10,
    border: '1px solid #CBD5E1',
    cursor: 'pointer',
    fontWeight: 700,
    color: '#0f172a',
    background: '#fff',
    boxShadow: '0 2px 6px rgba(15,23,42,0.06)',
    transition: 'transform .12s ease, box-shadow .12s ease, filter .12s ease',
  },

  // Hover/active (aplican inline en eventos si quisieras, acá dejamos estilos estáticos)
  // 👉 Grilla
  cardsWrapper: { width: 'min(1100px, 100%)' },
  cardsGrid: {
    display: 'grid',
    gap: 14,
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  card: {
    border: '1px solid #E2E8F0',
    borderRadius: 12,
    padding: 14,
    background: '#fff',
    cursor: 'pointer',
    transition: 'transform .12s ease, box-shadow .12s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
    display: 'grid',
    gap: 6,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: { margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' },
  cardLine: { margin: 0, fontSize: 14, color: '#334155' },

  badge: {
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: .3,
  },
  badgeOk: {
    background: '#16a34a',
    color: '#ffffff',
    border: '1px solid #15803d',
  },
  badgePending: {
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fecaca',
  },

  centerText: { textAlign: 'center', color: '#334155' },
}
