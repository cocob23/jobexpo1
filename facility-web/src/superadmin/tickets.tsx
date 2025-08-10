// src/superadmin/tickets.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type UsuarioRef = {
  nombre: string | null
  apellido: string | null
  email: string | null
}

type Ticket = {
  id: number
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
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null)

  useEffect(() => {
    obtenerTickets()
  }, [])

  const obtenerThumbDesdeStorage = async (ticketId: number) => {
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
      descripcion: row.descripcion,
      fecha_reporte: row.fecha_reporte,
      estado: row.estado,
      importe: row.importe,
      usuario_id: row.usuario_id,
      foto: row.foto,
      usuarios: usuarioNorm,
    }
  }

  const obtenerTickets = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('tickets')
        .select(`
          id,
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

  const actualizarEstado = async (id: number, nuevoEstado: 'Aprobado' | 'Desaprobado') => {
    const { error } = await supabase.from('tickets').update({ estado: nuevoEstado }).eq('id', id)
    if (error) {
      console.error('Error al actualizar ticket:', error.message)
    } else {
      obtenerTickets()
    }
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
        <button onClick={obtenerTickets} style={styles.btnPrimary}>
          Actualizar
        </button>
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
                    <p style={styles.row}><strong>ID:</strong> {t.id}</p>
                    <p style={styles.row}><strong>Usuario:</strong> {nombreUsuario(t)}</p>
                    <p style={styles.row}>
                      <strong>Fecha:</strong> {t.fecha_reporte ? new Date(t.fecha_reporte).toLocaleString() : '-'}
                    </p>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <p style={styles.row}><strong>Estado:</strong> {t.estado ?? 'Pendiente'}</p>
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
