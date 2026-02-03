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
  // salida
  salida_fecha: string | null
  salida_hora: string | null
  salida_latitud: number | null
  salida_longitud: number | null
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

  const norm = (u: (UsuarioMin & { horario_llegada?: string | null }) | (UsuarioMin & { horario_llegada?: string | null })[] | null): (UsuarioMin & { horario_llegada?: string | null }) | null =>
    Array.isArray(u) ? (u[0] ?? null) : (u ?? null)
  const [soloTardes, setSoloTardes] = useState(false)

  const calcularDuracionMin = (l: { fecha?: string; hora?: string | null; salida_fecha?: string | null; salida_hora?: string | null }): number | null => {
    if (!l.fecha || !l.hora || !l.salida_fecha || !l.salida_hora) return null
    try {
      const inDate = new Date(`${String(l.fecha).split('T')[0]}T${l.hora}`)
      const outDate = new Date(`${String(l.salida_fecha).split('T')[0]}T${l.salida_hora}`)
      const diffMs = outDate.getTime() - inDate.getTime()
      if (!Number.isFinite(diffMs)) return null
      const mins = Math.round(diffMs / 60000)
      return mins < 0 ? null : mins
    } catch {
      return null
    }
  }

  const esTarde = (hLlegada?: string | null, hHorario?: string | null) => {
    if (!hLlegada || !hHorario) return false
    const [hlH, hlM] = hLlegada.split(':').map(Number)
    const [hhH, hhM] = hHorario.split(':').map(Number)
    if ([hlH, hlM, hhH, hhM].some((v) => Number.isNaN(v))) return false
    const llegadaMin = hlH * 60 + hlM
    const horarioMin = hhH * 60 + hhM
    return llegadaMin > (horarioMin + 10)
  }

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
          usuarios:usuario_id ( nombre, apellido, horario_llegada )
        `)
        .order('fecha', { ascending: false })

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

      if (lugar) query = query.ilike('lugar', `%${lugar}%`)

      const desdeISO = toISOStart(desde)
      const hastaISO = toISOEnd(hasta)
      if (desdeISO) query = query.gte('fecha', desdeISO)
      if (hastaISO) query = query.lte('fecha', hastaISO)

      const { data, error } = await query
      if (error) throw error

      const rows = (data as LlegadaRaw[] | null) ?? []
      const normalizadas: (Llegada & { usuarios: (UsuarioMin & { horario_llegada?: string | null }) | null })[] = rows.map((r) => ({
        id: r.id,
        lugar: r.lugar,
        fecha: r.fecha,
        hora: r.hora,
        latitud: r.latitud,
        longitud: r.longitud,
        salida_fecha: (r as any).salida_fecha ?? null,
        salida_hora: (r as any).salida_hora ?? null,
        salida_latitud: (r as any).salida_latitud ?? null,
        salida_longitud: (r as any).salida_longitud ?? null,
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
    setSoloTardes(false)
    aplicarFiltros({ nombre: '', lugar: '', desde: '', hasta: '' })
  }

  const abrirMapa = (latitud: number, longitud: number) => {
    const url = `https://www.google.com/maps?q=${latitud},${longitud}`
    window.open(url, '_blank')
  }

  const mapEmbedUrl = (lat: number, lng: number, zoom = 15) =>
    `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`

  if (loading) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.container}>
          <p>Cargando llegadas...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.wrapper}>
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
            <div style={styles.inputDateGroup}>
              <input
                id="sa-solo-tardes"
                type="checkbox"
                checked={soloTardes}
                onChange={(e) => setSoloTardes(e.target.checked)}
              />
              <label htmlFor="sa-solo-tardes" style={styles.inputLabel}>Solo tardes</label>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={styles.fecha}>📅 {l.fecha.split('T')[0]}{l.hora ? ` • 🕒 ${l.hora}` : ''}</span>
                      {esTarde(l.hora, (l as any).usuarios?.horario_llegada ?? null) && (
                        <span style={styles.badgeLate}>Tarde</span>
                      )}
                      {calcularDuracionMin(l) != null && (
                        <span style={styles.badgeDuration}>Duración: {calcularDuracionMin(l)} min</span>
                      )}
                    </div>
                  </div>

                  <div style={styles.llegadaInfo}>
                    <p style={styles.texto}>
                      📍 <strong>Lugar:</strong> {l.lugar}
                    </p>
                    <p style={styles.texto}>
                      🕒 <strong>Hora llegada:</strong> {l.hora}
                    </p>
                    <p style={styles.texto}>
                      📌 <strong>Coordenadas llegada:</strong> {l.latitud.toFixed(5)}, {l.longitud.toFixed(5)}
                    </p>

                    {l.latitud != null && l.longitud != null && (
                      <div
                        style={styles.mapBox}
                        role="button"
                        aria-label="Abrir en Google Maps"
                        onClick={() => abrirMapa(l.latitud, l.longitud)}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && abrirMapa(l.latitud, l.longitud)}
                        tabIndex={0}
                        title="Abrir en Google Maps"
                      >
                        <iframe
                          title={`mapa-llegada-${l.id}`}
                          src={mapEmbedUrl(l.latitud, l.longitud, 15)}
                          style={styles.mapIframe as any}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                        <div style={styles.mapHint}>Click para abrir en Google Maps</div>
                      </div>
                    )}

                    {/* Sección de salida */}
                    <div style={styles.salidaBox}>
                      <h4 style={styles.subtitulo}>Salida</h4>
                      {l.salida_hora ? (
                        <>
                          <p style={styles.texto}>
                            🗓️ <strong>Fecha salida:</strong> {String(l.salida_fecha).split('T')[0]} • 🕒 {l.salida_hora}
                          </p>
                          {(l.salida_latitud != null && l.salida_longitud != null) && (
                            <>
                              <p style={styles.texto}>
                                📌 <strong>Coordenadas salida:</strong> {Number(l.salida_latitud).toFixed(5)}, {Number(l.salida_longitud).toFixed(5)}
                              </p>
                              <div
                                style={styles.mapBox}
                                role="button"
                                aria-label="Abrir en Google Maps"
                                onClick={() => abrirMapa(Number(l.salida_latitud), Number(l.salida_longitud))}
                                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && abrirMapa(Number(l.salida_latitud), Number(l.salida_longitud))}
                                tabIndex={0}
                                title="Abrir en Google Maps"
                              >
                                <iframe
                                  title={`mapa-salida-${l.id}`}
                                  src={mapEmbedUrl(Number(l.salida_latitud), Number(l.salida_longitud), 15)}
                                  style={styles.mapIframe as any}
                                  loading="lazy"
                                  referrerPolicy="no-referrer-when-downgrade"
                                />
                                <div style={styles.mapHint}>Click para abrir en Google Maps</div>
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <p style={{ ...styles.texto, color: '#ef4444', fontWeight: 700 }}>Pendiente de salida</p>
                      )}
                    </div>
                  </div>
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
  badgeLate: {
    display: 'inline-block',
    backgroundColor: '#ef4444',
    color: '#fff',
    padding: '4px 8px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
  },
  badgeDuration: {
    display: 'inline-block',
    backgroundColor: '#0ea5e9',
    color: '#fff',
    padding: '4px 8px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
  },
  llegadaInfo: { marginBottom: '1rem' },
  texto: { fontSize: '1rem', color: '#374151', marginBottom: '0.5rem', lineHeight: '1.5' },
  subtitulo: { fontSize: '1.05rem', fontWeight: 700, color: '#1f2937', margin: '1rem 0 0.5rem' },
  salidaBox: { marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #cbd5e1' },

  // mini-mapa
  mapBox: {
    position: 'relative',
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0,0,0,0.07)',
  },
  mapIframe: {
    border: '0',
    width: '100%',
    height: '100%',
    display: 'block',
  },
  mapHint: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    padding: '4px 8px',
    background: 'rgba(30,58,138,0.9)',
    color: '#fff',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
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
