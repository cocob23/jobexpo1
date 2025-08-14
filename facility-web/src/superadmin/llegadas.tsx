// src/superadmin/llegadas.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type UsuarioMin = { nombre: string; apellido: string }

type Llegada = {
  id: string
  lugar: string
  fecha: string
  hora: string
  latitud: number
  longitud: number
  usuarios: UsuarioMin | null
}

type LlegadaRaw = Omit<Llegada, 'usuarios'> & {
  usuarios: UsuarioMin | UsuarioMin[] | null
}

export default function Llegadas() {
  const navigate = useNavigate()
  const [llegadas, setLlegadas] = useState<Llegada[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // filtros
  const [nombreInput, setNombreInput] = useState('')  // empleado (nombre o apellido)
  const [lugarInput, setLugarInput] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')    // YYYY-MM-DD
  const [fechaHasta, setFechaHasta] = useState('')    // YYYY-MM-DD

  useEffect(() => {
    aplicarFiltros()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const norm = (u: UsuarioMin | UsuarioMin[] | null): UsuarioMin | null =>
    Array.isArray(u) ? (u[0] ?? null) : (u ?? null)

  const toISOStart = (d: string) => (d ? `${d}T00:00:00` : undefined)
  const toISOEnd = (d: string) => (d ? `${d}T23:59:59` : undefined)

  async function aplicarFiltros(opts?: {
    nombre?: string
    lugar?: string
    desde?: string
    hasta?: string
  }) {
    setLoading(true)
    setError(null)
    try {
      const nombre = (opts?.nombre ?? nombreInput).trim()
      const lugar = (opts?.lugar ?? lugarInput).trim()
      const desde = opts?.desde ?? fechaDesde
      const hasta = opts?.hasta ?? fechaHasta

      let query = supabase
        .from('llegadas')
        .select(`
          *,
          usuarios:usuario_id ( nombre, apellido )
        `)
        .order('fecha', { ascending: false })

      // Buscar por empleado (nombre o apellido) -> resolvemos IDs primero
      if (nombre) {
        const { data: us, error: uerr } = await supabase
          .from('usuarios')
          .select('id')
          .or(`nombre.ilike.%${nombre}%,apellido.ilike.%${nombre}%`)

        if (uerr) throw uerr
        const ids = (us || []).map((u) => u.id)
        if (ids.length === 0) {
          setLlegadas([])
          setLoading(false)
          return
        }
        query = query.in('usuario_id', ids)
      }

      // Buscar por lugar
      if (lugar) {
        query = query.ilike('lugar', `%${lugar}%`)
      }

      // Rango de fechas (columna fecha)
      const desdeISO = toISOStart(desde)
      const hastaISO = toISOEnd(hasta)
      if (desdeISO) query = query.gte('fecha', desdeISO)
      if (hastaISO) query = query.lte('fecha', hastaISO)

      const { data, error } = await query
      if (error) throw error

      const rows = (data as LlegadaRaw[] | null) ?? []
      const normalizadas: Llegada[] = rows.map((r) => ({
        id: r.id,
        lugar: r.lugar,
        fecha: r.fecha,
        hora: r.hora,
        latitud: r.latitud,
        longitud: r.longitud,
        usuarios: norm(r.usuarios),
      }))

      setLlegadas(normalizadas)
    } catch (err) {
      console.error('Error al obtener llegadas:', err)
      setError('No se pudieron cargar las llegadas')
      setLlegadas([])
    } finally {
      setLoading(false)
    }
  }

  function limpiarFiltros() {
    setNombreInput('')
    setLugarInput('')
    setFechaDesde('')
    setFechaHasta('')
    aplicarFiltros({ nombre: '', lugar: '', desde: '', hasta: '' })
  }

  const abrirMapa = (latitud: number, longitud: number) => {
    const url = `https://www.google.com/maps?q=${latitud},${longitud}`
    window.open(url, '_blank')
  }

  if (loading) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.logoTopContainer}>
          <img src="/logo.png" alt="Facility Argentina" style={styles.logoTop} />
        </div>
        <div style={styles.container}>
          <p>Cargando llegadas...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.logoTopContainer}>
          <img src="/logo.png" alt="Facility Argentina" style={styles.logoTop} />
        </div>
        <div style={styles.container}>
          <p style={{ color: 'red' }}>{error}</p>
          <button onClick={() => aplicarFiltros()} style={styles.boton}>
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.logoTopContainer}>
        <img src="/logo.png" alt="Facility Argentina" style={styles.logoTop} />
      </div>

      <div style={styles.container}>
        <div style={styles.headerContainer}>
          <button onClick={() => navigate('/superadmin')} style={styles.botonVolver}>
            ← Volver
          </button>
          <h1 style={styles.titulo}>Llegadas de Empleados</h1>
        </div>

        {/* Filtros */}
        <div style={styles.filtrosCard}>
          <div style={styles.filtrosRow}>
            <input
              type="text"
              placeholder="Nombre o apellido"
              value={nombreInput}
              onChange={(e) => setNombreInput(e.target.value)}
              style={styles.inputSm}
            />
            <input
              type="text"
              placeholder="Lugar"
              value={lugarInput}
              onChange={(e) => setLugarInput(e.target.value)}
              style={styles.inputSm}
            />
            <div style={styles.inputDateGroup}>
              <label style={styles.inputLabel}>Desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                style={styles.inputDate}
              />
            </div>
            <div style={styles.inputDateGroup}>
              <label style={styles.inputLabel}>Hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                style={styles.inputDate}
              />
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button onClick={limpiarFiltros} style={styles.btnLight}>
                Limpiar
              </button>
              <button onClick={() => aplicarFiltros()} style={styles.btnPrimary}>
                Aplicar filtros
              </button>
            </div>
          </div>
        </div>

        {llegadas.length === 0 ? (
          <div style={styles.contenido}>
            <p style={styles.texto}>No hay llegadas registradas.</p>
          </div>
        ) : (
          <div style={styles.contenido}>
            <div style={styles.llegadasContainer}>
              {llegadas.map((l) => (
                <div key={l.id} style={styles.llegadaCard}>
                  <div style={styles.llegadaHeader}>
                    <h3 style={styles.empleadoNombre}>
                      👤 {l.usuarios?.nombre} {l.usuarios?.apellido}
                    </h3>
                    <span style={styles.fecha}>📅 {l.fecha.split('T')[0]}</span>
                  </div>

                  <div style={styles.llegadaInfo}>
                    <p style={styles.texto}>
                      📍 <strong>Lugar:</strong> {l.lugar}
                    </p>
                    <p style={styles.texto}>
                      🕒 <strong>Hora:</strong> {l.hora}
                    </p>
                    <p style={styles.texto}>
                      📍 <strong>Coordenadas:</strong> {l.latitud.toFixed(5)}, {l.longitud.toFixed(5)}
                    </p>
                  </div>

                  <button
                    onClick={() => abrirMapa(l.latitud, l.longitud)}
                    style={styles.botonMapa}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#1d4ed8'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#1e40af'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    🗺️ Ver en Google Maps
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  wrapper: { minHeight: '100vh', backgroundColor: '#f8fafc' },
  logoTopContainer: { display: 'flex', justifyContent: 'center', paddingTop: 30, paddingBottom: 10 },
  logoTop: { height: 80, objectFit: 'contain' },
  container: { maxWidth: '1000px', margin: '0 auto', padding: '2rem', fontFamily: `'Segoe UI', sans-serif` },
  titulo: { fontSize: '2.2rem', fontWeight: 700, marginBottom: '0', color: '#1e293b', textAlign: 'center', flex: 1 },
  contenido: { backgroundColor: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' },
  filtrosCard: { backgroundColor: '#fff', borderRadius: 12, padding: '12px 14px', border: '1px solid #e2e8f0', marginBottom: 16 },
  filtrosRow: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' },

  inputSm: {
    minWidth: 160,
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid #E2E8F0',
    fontSize: 14,
    flex: '0 1 220px',
  },
  inputDateGroup: { display: 'flex', gap: 6, alignItems: 'center' },
  inputLabel: { fontSize: 13, color: '#334155' },
  inputDate: { padding: '6px 8px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 14 },

  llegadasContainer: { display: 'grid', gap: '1.5rem' },
  llegadaCard: { border: '2px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', backgroundColor: '#f8fafc', transition: 'all 0.2s ease' },
  llegadaHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #e2e8f0' },
  empleadoNombre: { fontSize: '1.3rem', fontWeight: 600, color: '#1e40af', margin: 0 },
  fecha: { fontSize: '1rem', color: '#64748b', fontWeight: 500 },
  llegadaInfo: { marginBottom: '1rem' },
  texto: { fontSize: '1rem', color: '#374151', marginBottom: '0.5rem', lineHeight: '1.5' },

  botonMapa: {
    backgroundColor: '#1e40af',
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
  boton: {
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    padding: '16px 24px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  headerContainer: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' },
  botonVolver: {
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

  btnLight: {
    backgroundColor: '#e2e8f0',
    color: '#0f172a',
    border: 'none',
    padding: '8px 12px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  btnPrimary: {
    backgroundColor: '#2563EB',
    color: '#fff',
    border: 'none',
    padding: '8px 12px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
}
