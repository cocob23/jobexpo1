import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Tickets() {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<any[]>([])

  useEffect(() => {
    obtenerTickets()
  }, [])

  const obtenerTickets = async () => {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      console.error('Error al obtener tickets:', error.message)
    } else {
      setTickets(data || [])
    }
  }

  const actualizarEstado = async (id: number, nuevoEstado: string) => {
    const { error } = await supabase
      .from('tickets')
      .update({ estado: nuevoEstado })
      .eq('id', id)

    if (error) {
      console.error('Error al actualizar ticket:', error.message)
    } else {
      obtenerTickets()
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.headerContainer}>
        <button onClick={() => navigate('/superadmin')} style={styles.botonVolver}>
          ← Volver
        </button>
        <h1 style={styles.title}>Gestión de Tickets</h1>
      </div>

      {tickets.length === 0 ? (
        <p style={styles.empty}>No hay tickets cargados.</p>
      ) : (
        <ul style={styles.ticketList}>
          {tickets.map((ticket) => (
            <li key={ticket.id} style={styles.ticketItem}>
              <p><strong>ID:</strong> {ticket.id}</p>
              <p><strong>Descripción:</strong> {ticket.descripcion}</p>
              <p><strong>Estado:</strong> {ticket.estado}</p>

              <div style={styles.buttonGroup}>
                <button
                  style={styles.aprobar}
                  onClick={() => actualizarEstado(ticket.id, 'aprobado')}
                >
                  Aprobar
                </button>
                <button
                  style={styles.desaprobar}
                  onClick={() => actualizarEstado(ticket.id, 'desaprobado')}
                >
                  Desaprobar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { maxWidth: 800, margin: '40px auto', padding: 20, fontFamily: `'Segoe UI', sans-serif` },
  title: { fontSize: '2rem', color: '#1e293b', marginBottom: 0, textAlign: 'center', flex: 1 },
  empty: { color: '#64748b', fontStyle: 'italic', textAlign: 'center' },
  ticketList: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 20 },
  ticketItem: { padding: 20, border: '1px solid #e2e8f0', borderRadius: 12, backgroundColor: '#ffffff', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
  buttonGroup: { display: 'flex', gap: 10, marginTop: 10 },
  aprobar: { backgroundColor: '#22c55e', color: 'white', padding: '8px 16px', border: 'none', borderRadius: 8, cursor: 'pointer' },
  desaprobar: { backgroundColor: '#ef4444', color: 'white', padding: '8px 16px', border: 'none', borderRadius: 8, cursor: 'pointer' },
  headerContainer: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' },
  botonVolver: { backgroundColor: '#6b7280', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
}
