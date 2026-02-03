// src/superadmin/tickets.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ToastProvider'

type UsuarioRef = {
  nombre: string | null
  apellido: string | null
  email: string | null
}

type Ticket = {
  id: string | number
  numero?: number | null
  descripcion: string | null
  fecha_reporte: string | null
  estado: string | null
  importe: number | null
  usuario_id: string | null
  foto: string | null
  usuarios: UsuarioRef | null
  _thumb?: string | null
}

type TicketRaw = Omit<Ticket, 'usuarios'> & { usuarios: UsuarioRef | UsuarioRef[] | null }

export default function Tickets() {
  const navigate = useNavigate()
  const toast = useToast()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null)
  const [tecnicos, setTecnicos] = useState<Array<{ id: string; nombre: string | null; apellido: string | null; email?: string | null }>>([])
  const [tecSel, setTecSel] = useState<string>('')
  const [tecQuery, setTecQuery] = useState<string>('')
  const [showTecSuggest, setShowTecSuggest] = useState<boolean>(false)
  const [desde, setDesde] = useState<string>('')
  const [hasta, setHasta] = useState<string>('')

  useEffect(() => {
    obtenerTecnicos()
    obtenerTickets()
  }, [])

  useEffect(() => {
    obtenerTickets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tecSel, desde, hasta])

  const limpiarFiltros = () => {
    setTecSel('')
    setTecQuery('')
    setDesde('')
    setHasta('')
    obtenerTickets()
  }

  const obtenerThumbDesdeStorage = async (ticketId: string | number) => {
    const bucket = 'tickets'
    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list(`${ticketId}`, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })

    if (error || !files || files.length === 0) return null

    const latest = files[0].name
    const path = `${ticketId}/${latest}`
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data?.publicUrl ?? null
  }

  const normalizarTicket = (row: TicketRaw): Ticket => {
    const usuarioNorm: UsuarioRef | null = Array.isArray(row.usuarios)
      ? (row.usuarios[0] ?? null)
      : (row.usuarios ?? null)

    return {
      id: row.id,
      numero: (row as any).numero ?? null,
      descripcion: row.descripcion,
      fecha_reporte: row.fecha_reporte,
      estado: row.estado,
      importe: row.importe,
      usuario_id: row.usuario_id,
      foto: row.foto,
      usuarios: usuarioNorm,
    }
  }

  const obtenerTecnicos = async () => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, email, rol')
      .in('rol', ['mantenimiento', 'mantenimiento-externo'])
      .order('apellido', { ascending: true })
    if (error) return
    setTecnicos((data || []).map((u: any) => ({ id: u.id, nombre: u.nombre, apellido: u.apellido, email: u.email })))
  }

  const obtenerTickets = async () => {
    try {
      setLoading(true)

      let q = supabase
        .from('tickets')
        .select(`
          id,
          numero,
          descripcion,
          fecha_reporte,
          estado,
          importe,
          usuario_id,
          foto,
          usuarios:usuario_id (
            nombre,
            apellido,
            email
          )
        `)
        .order('fecha_reporte', { ascending: false })

      if (tecSel) q = q.eq('usuario_id', tecSel)

      const desdeISO = desde ? new Date(`${desde}T00:00:00.000Z`).toISOString() : null
      const hastaISO = hasta ? new Date(`${hasta}T23:59:59.999Z`).toISOString() : null
      if (desdeISO) q = q.gte('fecha_reporte', desdeISO)
      if (hastaISO) q = q.lte('fecha_reporte', hastaISO)

      const { data, error } = await q

      if (error) {
        console.error('Error al obtener tickets:', error.message)
        setTickets([])
        return
      }

      const raw = (data || []) as TicketRaw[]

      const withThumbs: Ticket[] = await Promise.all(
        raw.map(async (r) => {
          const t = normalizarTicket(r)
          const direct = t.foto && t.foto.trim().length > 0 ? t.foto : null
          if (direct) return { ...t, _thumb: direct }
          const fallback = await obtenerThumbDesdeStorage(t.id)
          return { ...t, _thumb: fallback }
        })
      )

      setTickets(withThumbs)
    } finally {
      setLoading(false)
    }
  }

  const actualizarEstado = async (id: string | number, nuevoEstado: 'Aprobado' | 'Desaprobado') => {
    const { error } = await supabase.from('tickets').update({ estado: nuevoEstado }).eq('id', id)
    if (error) {
      console.error('Error al actualizar ticket:', error.message)
      toast.error('No se pudo actualizar: ' + error.message)
    } else {
      toast.success('Estado actualizado')
      obtenerTickets()
    }
  }

  const eliminarTicket = async (id: string | number) => {
    const confirmar = window.confirm(`¿Eliminar el ticket #${id}? Esta acción no se puede deshacer.`)
    if (!confirmar) return
    const { error } = await supabase.from('tickets').delete().eq('id', id)
    if (error) {
      console.error('Error al eliminar ticket:', error.message)
      toast.error('No se pudo eliminar: ' + error.message)
      return
    }
    // Refrescar lista
    setTickets((prev) => prev.filter((t) => t.id !== id))
    toast.success('Ticket eliminado')
  }

  const nombreUsuario = (t: Ticket) => {
    const u = t.usuarios
    if (!u) return 'Usuario'
    const base = u.nombre || u.email || 'Usuario'
    return u.apellido ? `${base} ${u.apellido}` : base
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button onClick={() => navigate('/superadmin')} style={styles.btnGray}>
          ← Volver
        </button>
        <h1 style={styles.title}>Gestión de Tickets</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', position: 'relative', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={tecQuery}
            onChange={(e) => { setTecQuery(e.target.value); setShowTecSuggest(true); }}
            onFocus={() => setShowTecSuggest(true)}
            placeholder="Buscar técnico por nombre/apellido/email"
            style={styles.input}
          />
          {showTecSuggest && tecQuery.trim().length > 0 && (
            <div style={styles.suggestBox} onMouseLeave={() => setShowTecSuggest(false)}>
              {tecnicos
                .filter((t) => {
                  const q = tecQuery.trim().toLowerCase()
                  const nom = (t.nombre ?? '').toLowerCase()
                  const ape = (t.apellido ?? '').toLowerCase()
                  const em = (t.email ?? '').toLowerCase()
                  return nom.includes(q) || ape.includes(q) || em.includes(q) || `${ape} ${nom}`.includes(q)
                })
                .slice(0, 8)
                .map((t) => (
                  <div
                    key={t.id}
                    style={styles.suggestItem}
                    onClick={() => { setTecSel(t.id); setTecQuery(`${t.apellido ?? ''} ${t.nombre ?? ''}`.trim() || (t.email ?? '')); setShowTecSuggest(false); }}
                  >
                    {`${t.apellido ?? ''} ${t.nombre ?? ''}`.trim() || (t.email ?? t.id)}
                  </div>
                ))}
            </div>
          )}
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={styles.input} />
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={styles.input} />
          <button onClick={obtenerTickets} style={styles.btnPrimary}>Aplicar filtros</button>
          <button onClick={limpiarFiltros} style={styles.btnGray}>Limpiar filtros</button>
        </div>
      </div>

      {loading ? (
        <p style={styles.empty}>Cargando…</p>
      ) : tickets.length === 0 ? (
        <p style={styles.empty}>No hay tickets cargados.</p>
      ) : (
        <ul style={styles.list}>
          {tickets.map((t) => (
            <li key={t.id} style={styles.card}>
              <div style={styles.cardHead}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {t._thumb ? (
                    <img
                      src={t._thumb}
                      alt={`Ticket ${t.id}`}
                      style={styles.thumb}
                      onClick={() => setFotoAmpliada(t._thumb!)}
                      onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                    />
                  ) : (
                    <div style={styles.thumbPlaceholder}>Sin imagen</div>
                  )}

                  <div>
                    <p style={styles.row}><strong>ID:</strong> {t.numero ?? t.id}</p>
                    <p style={styles.row}><strong>Usuario:</strong> {nombreUsuario(t)}</p>
                    <p style={styles.row}>
                      <strong>Fecha:</strong> {t.fecha_reporte ? new Date(t.fecha_reporte).toLocaleString() : '-'}
                    </p>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <p style={styles.row}>
                    <strong>Estado:</strong>{' '}
                    <span style={estadoStyle(t.estado)}>{t.estado ?? 'Pendiente'}</span>
                  </p>
                  <p style={styles.row}><strong>Importe:</strong> {t.importe != null ? `$${t.importe}` : '-'}</p>
                </div>
              </div>

              {t.descripcion && (
                <p style={{ marginTop: 10 }}>
                  <strong>Descripción:</strong> {t.descripcion}
                </p>
              )}

              <div style={styles.btnRow}>
                <button style={styles.btnSuccess} onClick={() => actualizarEstado(t.id, 'Aprobado')}>
                  Aprobar
                </button>
                <button style={styles.btnDanger} onClick={() => actualizarEstado(t.id, 'Desaprobado')}>
                  Desaprobar
                </button>
                <div style={{ flex: 1 }} />
                <button style={styles.btnDelete} onClick={() => eliminarTicket(t.id)}>
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {fotoAmpliada && (
        <div style={styles.modalOverlay} onClick={() => setFotoAmpliada(null)}>
          <img src={fotoAmpliada} alt="Vista ampliada" style={styles.modalImage} />
        </div>
      )}
    </div>
  )
}

// Helper para estilos de estado (aprobado, desaprobado, pendiente)
const estadoStyle = (estado: string | null): React.CSSProperties => {
  const base: React.CSSProperties = { fontWeight: 700 }
  const val = (estado || 'Pendiente').toLowerCase()
  switch (val) {
    case 'aprobado':
      return { ...base, color: '#16a34a' } // verde
    case 'desaprobado':
      return { ...base, color: '#dc2626' } // rojo
    default:
      return { ...base, color: '#d97706' } // amarillo para pendiente u otros
  }
}

const styles: { [k: string]: React.CSSProperties } = {
  page: { maxWidth: 1000, margin: '24px auto', padding: 16, fontFamily: `'Segoe UI', sans-serif` },
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
  title: { margin: 0, fontSize: '1.8rem', fontWeight: 700, color: '#1e293b', flex: 1, textAlign: 'center' },

  list: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 },
  empty: { color: '#64748b', textAlign: 'center' },

  card: { padding: 16, border: '1px solid #e2e8f0', background: '#fff', borderRadius: 12, boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
  cardHead: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  row: { margin: '2px 0' },

  thumb: { width: 180, height: 180, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer', background: '#f3f4f6' },
  thumbPlaceholder: {
    width: 180, height: 180, borderRadius: 8, border: '1px solid #e5e7eb',
    background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#9ca3af', fontSize: 12
  },

  btnRow: { display: 'flex', gap: 10, marginTop: 12 },
  btnPrimary: { backgroundColor: '#1e40af', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' },
  btnGray: { backgroundColor: '#6b7280', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' },
  btnSuccess: { backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' },
  btnDanger: { backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' },
  btnDelete: { backgroundColor: '#7f1d1d', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  suggestBox: {
    position: 'absolute', top: '100%', left: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
    zIndex: 10, width: 320, maxHeight: 240, overflow: 'auto'
  },
  suggestItem: { padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' },

  // Modal
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 9999
  },
  modalImage: {
    maxWidth: '90%', maxHeight: '90%', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
  }
}
