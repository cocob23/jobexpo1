import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaUserPlus,
  FaTasks,
  FaTicketAlt,
  FaUserTie,
  FaUserCircle,
  FaUsersCog,
  FaClipboardList,
  FaFileInvoiceDollar,
  FaMapMarkerAlt
} from 'react-icons/fa'

export default function FMHome() {
  const navigate = useNavigate()

  // Evitar scroll fantasma
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    const prevBg = document.body.style.backgroundColor
    document.body.style.overflow = 'hidden'
    document.body.style.backgroundColor = '#fff'
    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.backgroundColor = prevBg
    }
  }, [])

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <h1 style={styles.title}>Panel de Facility Manager</h1>
        <p style={styles.subtitle}>Bienvenido, Facility Manager. ¿Qué querés hacer hoy?</p>

        <div style={styles.grid}>
          <button style={styles.card} onClick={() => navigate('/fm/ver-tareas')}>
            <FaTasks size={32} />
            <span>Ver Tareas Asignadas</span>
          </button>

          <button style={styles.card} onClick={() => navigate('/fm/asignar-tarea')}>
            <FaClipboardList size={32} />
            <span>Asignar Tarea</span>
          </button>

          <button style={styles.card} onClick={() => navigate('/fm/tecnicos')}>
            <FaUsersCog size={32} />
            <span>Lista de Técnicos</span>
          </button>

          <button style={styles.card} onClick={() => navigate('/fm/crear-tecnico')}>
            <FaUserPlus size={32} />
            <span>Crear Técnico</span>
          </button>



          <button style={styles.card} onClick={() => navigate('/fm/tickets')}>
            <FaTicketAlt size={32} />
            <span>Ver Tickets</span>
          </button>

          <button style={styles.card} onClick={() => navigate('/fm/cotizaciones')}>
            <FaFileInvoiceDollar size={32} />
            <span>Cotizaciones</span>
          </button>

          <button style={styles.card} onClick={() => navigate('/fm/perfil')}>
            <FaUserCircle size={32} />
            <span>Perfil FM</span>
          </button>

          <button style={styles.card} onClick={() => navigate('/fm/llegadas')}>
            <FaMapMarkerAlt size={32} />
            <span>Ver Llegadas</span>
          </button>
        </div>
      </div>
    </div>
  )
}

const NAVBAR_HEIGHT = 70 // ajusta si tu navbar tiene otra altura

const styles: { [key: string]: React.CSSProperties } = {
  wrapper: {
    height: '100vh',
    width: '100vw',
    backgroundColor: '#fff',
    overflow: 'hidden',
    paddingTop: NAVBAR_HEIGHT + 16,
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'center',
  },
  container: {
    width: '100%',
    maxWidth: 1000,
    padding: '0 20px 16px',
    fontFamily: `'Segoe UI', sans-serif`,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    margin: 0,
    color: '#1e293b',
  },
  subtitle: {
    fontSize: '1.05rem',
    color: '#64748b',
    marginTop: 6,
    marginBottom: 16,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 16,
    maxHeight: `calc(100vh - ${NAVBAR_HEIGHT + 16 + 60 + 28}px)`,
    overflow: 'auto',
    paddingBottom: 4,
  },
  card: {
    background: '#ffffff',
    border: '2px solid #e2e8f0',
    borderRadius: 16,
    padding: '20px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    fontSize: 16,
    fontWeight: 600,
    color: '#1e293b',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
  },
}
