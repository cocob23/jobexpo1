// src/superadmin/tickets.tsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase' // Ajustá si tu path es distinto

export default function Tickets() {
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
      <h1 style={styles.title}>Gestión de Tickets</h1>

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
  container: {
    maxWidth: 800,
    margin: '40px auto',
    padding: 20,
    fontFamily: `'Segoe UI', sans-serif`,
  },
  title: {
    fontSize: '2rem',
    color: '#1e293b',
    marginBottom: 30,
    textAlign: 'center',
  },
  empty: {
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  ticketList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  ticketItem: {
    padding: 20,
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
  },
  buttonGroup: {
    display: 'flex',
    gap: 10,
    marginTop: 10,
  },
  aprobar: {
    backgroundColor: '#22c55e',
    color: 'white',
    padding: '8px 16px',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  desaprobar: {
    backgroundColor: '#ef4444',
    color: 'white',
    padding: '8px 16px',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
}
