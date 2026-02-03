import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Recorrido {
  id: string
  usuario_id: string
  iniciado_en: string | null
  finalizado_en: string | null
  inicio_latitude: number | null
  inicio_longitude: number | null
  fin_latitude: number | null
  fin_longitude: number | null
  km_manual: number | null
  estado: string | null
  creado_en?: string
  usuario_nombre?: string
  usuario_apellido?: string
}

export default function RecorridosFM() {
  const [recorridos, setRecorridos] = useState<Recorrido[]>([])
  const [filtroNombre, setFiltroNombre] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [total, setTotal] = useState(0)
  const [sugerencias, setSugerencias] = useState<string[]>([])
  const [mostrandoSug, setMostrandoSug] = useState(false)
  const [cargando, setCargando] = useState(false)

  useEffect(() => { cargar() }, [])

  useEffect(() => {
    const q = filtroNombre.trim()
    const handler = setTimeout(async () => {
      if (!q) { setSugerencias([]); return }
      const { data, error } = await supabase
        .from('usuarios')
        .select('nombre, apellido, email, rol')
        .or(`nombre.ilike.%${q}%,apellido.ilike.%${q}%,email.ilike.%${q}%`)
        .in('rol', ['mantenimiento','mantenimiento_externo'])
        .limit(10)
      if (!error && data) {
        setSugerencias(data.map(u => (u.nombre || '') + (u.apellido ? ` ${u.apellido}` : '') || u.email).filter(Boolean) as string[])
      } else {
        setSugerencias([])
      }
    }, 250)
    return () => clearTimeout(handler)
  }, [filtroNombre])

  const cargar = async (aplicarFiltros = false) => {
    setCargando(true)
    let query = supabase
      .from('recorridos')
      .select('id, usuario_id, iniciado_en, finalizado_en, inicio_latitude, inicio_longitude, fin_latitude, fin_longitude, km_manual, estado, creado_en, usuarios:usuario_id(nombre, apellido, email, rol)')
      .order('creado_en', { ascending: false })
      .limit(500)
    if (aplicarFiltros) {
      if (fechaDesde.trim()) query = query.gte('creado_en', fechaDesde + ' 00:00:00')
      if (fechaHasta.trim()) query = query.lte('creado_en', fechaHasta + ' 23:59:59')
    }
    const { data, error } = await query
    if (!error && data) {
      const normalizados: Recorrido[] = (data as any[]).map(r => ({
        ...r,
        usuario_nombre: (r.usuarios?.nombre || '') + (r.usuarios?.apellido ? ` ${r.usuarios?.apellido}` : '') || r.usuarios?.email || 'Sin nombre',
        usuario_apellido: r.usuarios?.apellido || ''
      }))
      const filtradoNombre = aplicarFiltros && filtroNombre.trim()
        ? normalizados.filter(r => (r.usuario_nombre || '').toLowerCase().includes(filtroNombre.toLowerCase()))
        : normalizados
      setRecorridos(filtradoNombre)
      setTotal(filtradoNombre.length)
    }
    setCargando(false)
  }

  const filtrados = recorridos

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.title}>Recorridos</h2>
      <div style={styles.filters}>
        <div style={{ position: 'relative', minWidth: 240, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={styles.label}>Empleado</label>
          <input
            placeholder="Filtrar por empleado"
            value={filtroNombre}
            onFocus={() => setMostrandoSug(true)}
            onBlur={() => setTimeout(() => setMostrandoSug(false), 150)}
            onChange={e => { setFiltroNombre(e.target.value); setMostrandoSug(true) }}
            style={styles.input}
          />
          {mostrandoSug && filtroNombre.trim() && (
            <div style={styles.suggestBox}>
              {sugerencias.length > 0 ? (
                sugerencias.map(s => (
                  <div
                    key={s}
                    style={styles.suggestItem}
                    onMouseDown={() => { setFiltroNombre(s); setMostrandoSug(false) }}
                  >{s}</div>
                ))
              ) : (
                <div style={styles.suggestItemEmpty}>No hay coincidencias</div>
              )}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={styles.label}>Desde</label>
          <input
            type="date"
            value={fechaDesde}
            onChange={e => setFechaDesde(e.target.value)}
            style={styles.input}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={styles.label}>Hasta</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={e => setFechaHasta(e.target.value)}
            style={styles.input}
          />
        </div>
        <div style={styles.buttonGroup}>
          <label style={styles.labelHidden}>Aplicar</label>
          <button disabled={cargando} onClick={() => cargar(true)} style={styles.reloadBtn}>Aplicar filtros</button>
        </div>
        <div style={styles.buttonGroup}>
          <label style={styles.labelHidden}>Limpiar</label>
          <button disabled={cargando} onClick={() => { setFiltroNombre(''); setFechaDesde(''); setFechaHasta(''); cargar() }} style={styles.secondaryBtn}>Limpiar</button>
        </div>
        <div style={styles.buttonGroup}>
          <label style={styles.labelHidden}>Actualizar</label>
          <button disabled={cargando} onClick={() => cargar()} style={styles.refreshBtn}>Actualizar</button>
        </div>
      </div>
      <p style={{ marginTop: -8, color: '#475569' }}>Total: {total}</p>
      {cargando && <p>Cargando...</p>}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Empleado</th>
              <th>Inició</th>
              <th>Finalizó</th>
              <th>Km manual</th>
              <th>Estado</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th>Creado</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(r => {
              const estadoFmt = r.estado ? (r.estado.toLowerCase() === 'finalizado' ? 'Finalizado' : r.estado.charAt(0).toUpperCase() + r.estado.slice(1)) : '-'
              return (
                <tr key={r.id}>
                  <td>{r.usuario_nombre}</td>
                  <td>{r.iniciado_en ? r.iniciado_en.replace('T',' ').slice(0,19) : '-'}</td>
                  <td>{r.finalizado_en ? r.finalizado_en.replace('T',' ').slice(0,19) : '-'}</td>
                  <td>{r.km_manual ?? '-'}</td>
                  <td>{estadoFmt}</td>
                  <td>
                    {r.inicio_latitude != null && r.inicio_longitude != null ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span>{r.inicio_latitude.toFixed(5)}, {r.inicio_longitude.toFixed(5)}</span>
                        <div
                          style={styles.mapBox}
                          role="button"
                          aria-label="Abrir en Google Maps"
                          onClick={() => window.open(`https://www.google.com/maps?q=${r.inicio_latitude},${r.inicio_longitude}`, '_blank')}
                          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && window.open(`https://www.google.com/maps?q=${r.inicio_latitude},${r.inicio_longitude}`, '_blank')}
                          tabIndex={0}
                        >
                          <iframe
                            title={`mapa-inicio-${r.id}`}
                            src={`https://maps.google.com/maps?q=${r.inicio_latitude},${r.inicio_longitude}&z=15&output=embed`}
                            style={styles.mapIframe as any}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                          />
                          <div style={styles.mapHint}>Click para abrir</div>
                        </div>
                      </div>
                    ) : '-'}
                  </td>
                  <td>
                    {r.fin_latitude != null && r.fin_longitude != null ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span>{r.fin_latitude.toFixed(5)}, {r.fin_longitude.toFixed(5)}</span>
                        <div
                          style={styles.mapBox}
                          role="button"
                          aria-label="Abrir en Google Maps"
                          onClick={() => window.open(`https://www.google.com/maps?q=${r.fin_latitude},${r.fin_longitude}`, '_blank')}
                          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && window.open(`https://www.google.com/maps?q=${r.fin_latitude},${r.fin_longitude}`, '_blank')}
                          tabIndex={0}
                        >
                          <iframe
                            title={`mapa-fin-${r.id}`}
                            src={`https://maps.google.com/maps?q=${r.fin_latitude},${r.fin_longitude}&z=15&output=embed`}
                            style={styles.mapIframe as any}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                          />
                          <div style={styles.mapHint}>Click para abrir</div>
                        </div>
                      </div>
                    ) : '-'}
                  </td>
                  <td>{r.creado_en?.replace('T',' ').slice(0,19) || '-'}</td>
                </tr>
              )
            })}
            {filtrados.length === 0 && !cargando && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 20 }}>Sin recorridos.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const styles: { [k: string]: React.CSSProperties } = {
  wrapper: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '16px 20px',
    fontFamily: 'Segoe UI, sans-serif'
  },
  title: {
    fontSize: '1.6rem',
    fontWeight: 700,
    marginBottom: 14,
    color: '#1e293b'
  },
  filters: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 16
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    fontSize: 14,
    minWidth: 200,
    height: 44,
    boxSizing: 'border-box'
  },
  reloadBtn: {
    backgroundColor: '#1e3a8a',
    color: '#fff',
    border: '1px solid #1e3a8a',
    padding: '10px 16px',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 600,
    height: 44,
    minWidth: 200,
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  secondaryBtn: {
    backgroundColor: '#e2e8f0',
    color: '#1e293b',
    border: '1px solid #cbd5e1',
    padding: '10px 16px',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 600,
    height: 44,
    minWidth: 200,
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  refreshBtn: {
    backgroundColor: '#334155',
    color: '#fff',
    border: '1px solid #334155',
    padding: '10px 16px',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 600,
    height: 44,
    minWidth: 160,
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: '#475569'
  },
  suggestBox: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    marginTop: 4,
    zIndex: 50,
    maxHeight: 220,
    overflowY: 'auto'
  },
  suggestItem: {
    padding: '10px 12px',
    cursor: 'pointer',
    borderBottom: '1px solid #e2e8f0'
  },
  suggestItemEmpty: {
    padding: '10px 12px',
    color: '#64748b'
  },
  tableWrapper: {
    overflow: 'auto',
    border: '2px solid #e2e8f0',
    borderRadius: 12,
    background: '#fff'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  mapThumbLink: {
    display: 'inline-block',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    overflow: 'hidden',
    width: 160,
    height: 120,
    background: '#f1f5f9'
  },
  mapThumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  mapFallback: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    color: '#64748b'
  },
  mapBox: {
    position: 'relative',
    width: 160,
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    border: '2px solid #cbd5e1',
    cursor: 'pointer',
    boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
    background: '#fff'
  },
  mapIframe: {
    border: '0',
    width: '100%',
    height: '100%',
    display: 'block'
  },
  mapHint: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    padding: '4px 8px',
    background: 'rgba(30,58,138,0.85)',
    color: '#fff',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.3
  }
}
