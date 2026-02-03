import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { useNavigate } from 'react-router-dom'
import './responsive.css'

dayjs.locale('es')

export default function TicketsPrincipal() {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const handleGoBack = () => {
    navigate('/mantenimiento')
  }

  useEffect(() => {
    void cargarTickets()
  }, [])

  const cargarTickets = async () => {
    if (!refreshing) setLoading(true)

    const { data: userData, error: errorUsuario } = await supabase.auth.getUser()
    if (errorUsuario || !userData?.user) {
      alert('Error: No se pudo obtener el usuario.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('usuario_id', userData.user.id)
      .order('fecha_reporte', { ascending: false })

    if (error) {
      alert('Error: No se pudieron cargar los tickets.')
    } else {
      setTickets(data || [])
    }

    setLoading(false)
    setRefreshing(false)
  }

  const onRefresh = () => {
    setRefreshing(true)
    void cargarTickets()
  }

  return (
    <div style={styles.container as React.CSSProperties}>
      <button 
        onClick={handleGoBack} 
        style={{
          position: 'fixed',
          top: 90,
          left: 20,
          backgroundColor: '#6b7280',
          color: '#fff',
          border: 'none',
          padding: '10px 16px',
          borderRadius: 6,
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: 14,
          zIndex: 999,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        ← Volver
      </button>
      <img src="/logo.png" alt="logo" style={styles.logo as React.CSSProperties} />
      <div style={styles.encabezado as React.CSSProperties}>
        <h2 style={styles.titulo as React.CSSProperties}>Tickets</h2>
        <button style={styles.boton as React.CSSProperties} onClick={() => navigate('/mantenimiento/cargar-ticket')}>Cargar Ticket</button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {tickets.map((item) => (
            <div key={item.id} style={styles.card as React.CSSProperties}>
              {item.foto && <img src={item.foto} alt="ticket" style={styles.imagen as React.CSSProperties} />}
              <div style={styles.descripcion as React.CSSProperties}>{item.descripcion}</div>
              <div style={styles.fecha as React.CSSProperties}>{dayjs(item.fecha_reporte).format('DD/MM/YYYY - HH:mm')}hs.</div>
              <div style={styles.importe as React.CSSProperties}>${item.importe}</div>
              <div style={{ ...styles.estado as React.CSSProperties, ...(item.estado === 'Aprobado' ? styles.aprobado : item.estado === 'Desaprobado' ? styles.desaprobado : styles.pendiente) }}>{`Estado: ${item.estado}`}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { padding: 20, backgroundColor: '#fff' },
  encabezado: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  titulo: { fontSize: 22, fontWeight: 'bold' },
  logo: { width: 270, height: 90, objectFit: 'contain' as const, display: 'block', margin: '30px auto 20px' },
  boton: { backgroundColor: '#1e40af', padding: '8px 14px', borderRadius: 8, color: '#fff', border: 'none', cursor: 'pointer' },
  card: { borderWidth: 1, borderStyle: 'solid' as const, borderColor: '#ccc', borderRadius: 12, padding: 12, marginBottom: 16 },
  imagen: { width: '100%', height: 200, objectFit: 'cover' as const, borderRadius: 8, marginBottom: 8 },
  descripcion: { fontSize: 16, fontWeight: 500, marginBottom: 4 },
  fecha: { fontSize: 14, color: '#666' },
  importe: { fontSize: 16, color: '#1e40af', fontWeight: 'bold', marginTop: 4 },
  estado: { marginTop: 8, fontWeight: 'bold' },
  aprobado: { color: '#22c55e' },
  desaprobado: { color: '#ef4444' },
  pendiente: { color: '#f59e0b' },
}
