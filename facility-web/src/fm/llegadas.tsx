// src/fm/Llegadas.tsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './responsive.css'

type Llegada = {
  id: string
  lugar: string | null
  fecha: string
  hora: string | null
  latitud: number | null
  longitud: number | null
  // salida
  salida_fecha?: string | null
  salida_hora?: string | null
  salida_latitud?: number | null
  salida_longitud?: number | null
  usuarios: {
    nombre: string
    apellido: string
    horario_llegada?: string | null
  } | null
}

export default function Llegadas() {
  const navigate = useNavigate()

  const [llegadas, setLlegadas] = useState<Llegada[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // filtros
  const [busqueda, setBusqueda] = useState<string>('')
  const [fecha, setFecha] = useState<string>('')        // '' = sin filtro
  const [lugar, setLugar] = useState<string>('')
  const [soloTardes, setSoloTardes] = useState<boolean>(false)

  useEffect(() => {
    obtenerLlegadas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const obtenerLlegadas = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('llegadas')
        .select(`
          *,
          usuarios:usuario_id (
            nombre,
            apellido,
            horario_llegada
          )
        `)

      if (fecha) query = query.eq('fecha', fecha)
      if (lugar.trim()) query = query.ilike('lugar', `%${lugar.trim()}%`)

      query = query.order('fecha', { ascending: false }).order('hora', { ascending: false })

      const { data, error } = await query
      if (error) throw error

      setLlegadas((data || []) as Llegada[])
    } catch (err) {
      console.error('Error al obtener llegadas:', err)
      setError('No se pudieron cargar las llegadas')
    } finally {
      setLoading(false)
    }
  }

  const abrirMapa = (latitud: number | null, longitud: number | null) => {
    if (latitud == null || longitud == null) return
    const url = `https://www.google.com/maps?q=${latitud},${longitud}`
    window.open(url, '_blank')
  }

  const mapEmbedUrl = (lat: number, lng: number, zoom = 15) =>
    `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`

  const esTarde = (hLlegada?: string | null, hHorario?: string | null) => {
    if (!hLlegada || !hHorario) return false
    // formatos esperados: 'HH:MM' (24h)
    const [hlH, hlM] = hLlegada.split(':').map(Number)
    const [hhH, hhM] = hHorario.split(':').map(Number)
    if ([hlH, hlM, hhH, hhM].some((v) => Number.isNaN(v))) return false
    const llegadaMin = hlH * 60 + hlM
    const horarioMin = hhH * 60 + hhM
    return llegadaMin > (horarioMin + 10) // más de 10 min tarde
  }

  const calcularDuracionMin = (l: Llegada): number | null => {
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

  // filtro por nombre/apellido (client‑side)
  const llegadasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    let base = llegadas
    if (soloTardes) {
      base = base.filter(l => esTarde(l.hora, l.usuarios?.horario_llegada ?? null))
    }
    if (!q) return base
    return base.filter(l => {
      const nombre = l.usuarios?.nombre?.toLowerCase() || ''
      const apellido = l.usuarios?.apellido?.toLowerCase() || ''
      return nombre.includes(q) || apellido.includes(q) || `${nombre} ${apellido}`.includes(q)
    })
  }, [llegadas, busqueda, soloTardes])

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <div style={styles.headerContainer}>
          <button onClick={() => navigate('/fm')} style={styles.botonVolver}>
            ← Volver
          </button>

          <h1 style={styles.titulo}>Llegadas de Empleados</h1>

          {/* barra de búsqueda por nombre */}
          <div style={styles.searchWrap}>
            <input
              type="text"
              placeholder="Buscar por nombre o apellido…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={styles.searchInput}
            />
          </div>
        </div>

        {/* filtros extra: fecha + lugar */}
        <div style={styles.filtersRow}>
          <div style={styles.filterGroup}>
            <label style={styles.label}>Fecha</label>
            <div style={styles.dateRow}>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                style={styles.input}
              />
              {fecha && (
                <button
                  type="button"
                  onClick={() => setFecha('')}
                  style={styles.btnClear}
                >
                  Quitar
                </button>
              )}
            </div>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Lugar</label>
            <input
              type="text"
              placeholder="Filtrar por lugar…"
              value={lugar}
              onChange={(e) => setLugar(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Tardanza</label>
            <div style={styles.dateRow}>
              <input
                id="solo-tardes"
                type="checkbox"
                checked={soloTardes}
                onChange={(e) => setSoloTardes(e.target.checked)}
              />
              <label htmlFor="solo-tardes" style={{ fontSize: 13 }}>Solo tardes</label>
            </div>
          </div>

          <button onClick={obtenerLlegadas} style={styles.botonRefrescar}>
            Aplicar / Actualizar
          </button>
        </div>

        {/* estados */}
        {loading ? (
          <div style={styles.contenido}>
            <p>Cargando llegadas...</p>
          </div>
        ) : error ? (
          <div style={styles.contenido}>
            <p style={{ color: 'red' }}>{error}</p>
            <button onClick={obtenerLlegadas} style={styles.boton}>
              Reintentar
            </button>
          </div>
        ) : llegadasFiltradas.length === 0 ? (
          <div style={styles.contenido}>
            <p style={styles.texto}>No hay llegadas para ese filtro.</p>
          </div>
        ) : (
          <div style={styles.contenido}>
            <div style={styles.llegadasContainer}>
              {llegadasFiltradas.map((llegada) => (
                <div key={llegada.id} style={styles.llegadaCard}>
                  <div style={styles.llegadaHeader}>
                    <h3 style={styles.empleadoNombre}>
                      👤 {llegada.usuarios?.nombre} {llegada.usuarios?.apellido}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={styles.fechaBadge}>
                        📅 {String(llegada.fecha).split('T')[0]}
                        {llegada.hora ? ` • 🕒 ${llegada.hora}` : ''}
                      </span>
                      {esTarde(llegada.hora, llegada.usuarios?.horario_llegada ?? null) && (
                        <span style={styles.badgeLate}>Tarde</span>
                      )}
                      {calcularDuracionMin(llegada) != null && (
                        <span style={styles.badgeDuration}>Duración: {calcularDuracionMin(llegada)} min</span>
                      )}
                    </div>
                  </div>

                  <div style={styles.llegadaInfo}>
                    <p style={styles.texto}>
                      📍 <strong>Lugar:</strong> {llegada.lugar || '—'}
                    </p>
                    {(llegada.latitud != null && llegada.longitud != null) && (
                      <>
                        <p style={styles.texto}>
                          📌 <strong>Coordenadas:</strong>{' '}
                          {Number(llegada.latitud).toFixed(5)}, {Number(llegada.longitud).toFixed(5)}
                        </p>

                        {/* mini‑mapa embebido, clickeable */}
                        <div
                          style={styles.mapBox}
                          role="button"
                          aria-label="Abrir en Google Maps"
                          onClick={() => abrirMapa(llegada.latitud, llegada.longitud)}
                          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && abrirMapa(llegada.latitud, llegada.longitud)}
                          tabIndex={0}
                        >
                          <iframe
                            title={`mapa-${llegada.id}`}
                            src={mapEmbedUrl(llegada.latitud, llegada.longitud, 15)}
                            style={styles.mapIframe as any}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                          />
                          <div style={styles.mapHint}>Click para abrir en Google Maps</div>
                        </div>
                      </>
                    )}

                    {/* Sección de salida */}
                    <div style={styles.salidaBox}>
                      <h4 style={styles.subtitulo}>Salida</h4>
                      {llegada.salida_hora ? (
                        <>
                          <p style={styles.texto}>
                            🗓️ <strong>Fecha salida:</strong> {String(llegada.salida_fecha).split('T')[0]} • 🕒 {llegada.salida_hora}
                          </p>
                          {(llegada.salida_latitud != null && llegada.salida_longitud != null) && (
                            <>
                              <p style={styles.texto}>
                                📌 <strong>Coordenadas salida:</strong> {Number(llegada.salida_latitud).toFixed(5)}, {Number(llegada.salida_longitud).toFixed(5)}
                              </p>
                              <div
                                style={styles.mapBox}
                                role="button"
                                aria-label="Abrir en Google Maps"
                                onClick={() => abrirMapa(Number(llegada.salida_latitud), Number(llegada.salida_longitud))}
                                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && abrirMapa(Number(llegada.salida_latitud), Number(llegada.salida_longitud))}
                                tabIndex={0}
                              >
                                <iframe
                                  title={`mapa-salida-${llegada.id}`}
                                  src={mapEmbedUrl(Number(llegada.salida_latitud), Number(llegada.salida_longitud), 15)}
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

  headerContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem',
    flexWrap: 'wrap',
  },
  titulo: {
    fontSize: '2.0rem',
    fontWeight: 700,
    margin: 0,
    color: '#1e293b',
    textAlign: 'center',
    flex: 1,
  },
  botonVolver: {
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },

  // filtros
  filtersRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr auto',
    gap: '12px',
    marginBottom: '20px',
    alignItems: 'end',
  },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: 13, color: '#64748b', fontWeight: 600 },
  input: {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '10px 12px',
    background: '#fff',
  },
  dateRow: { display: 'flex', gap: 8, alignItems: 'center' },
  btnClear: {
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    padding: '10px 12px',
    borderRadius: '8px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  botonRefrescar: {
    backgroundColor: '#1e40af',
    color: '#fff',
    border: 'none',
    padding: '12px 16px',
    borderRadius: '10px',
    fontWeight: 700,
    cursor: 'pointer',
    height: 44,
  },

  // búsqueda por nombre
  searchWrap: { display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' },
  searchInput: {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '10px 12px',
    minWidth: '220px',
    background: '#fff',
  },

  // lista
  contenido: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  llegadasContainer: { display: 'grid', gap: '1.5rem' },
  llegadaCard: {
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1.5rem',
    backgroundColor: '#f8fafc',
    transition: 'all 0.2s ease',
  },
  llegadaHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    paddingBottom: '0.5rem',
    borderBottom: '2px solid #e2e8f0',
  },
  empleadoNombre: { fontSize: '1.1rem', fontWeight: 700, color: '#1e40af', margin: 0 },
  fechaBadge: { fontSize: '0.95rem', color: '#64748b', fontWeight: 600 },
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
  texto: { fontSize: '1rem', color: '#374151', marginBottom: '0.5rem', lineHeight: 1.5 },
  subtitulo: { fontSize: '1.05rem', fontWeight: 700, color: '#1f2937', margin: '1rem 0 0.5rem' },
  salidaBox: { marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #cbd5e1' },

  // mini‑mapa
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

  botonMapa: {
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
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
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
}
