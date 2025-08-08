import { useNavigate } from 'react-router-dom'
import {
  FaUserPlus,
  FaTasks,
  FaTicketAlt,
  FaBoxes,
  FaUserTie,
  FaUserCircle,
  FaUsersCog,
  FaClipboardList
} from 'react-icons/fa'

export default function SuperadminIndex() {
  const navigate = useNavigate()

  return (
    <div style={styles.wrapper}>
      {/* Logo centrado arriba */}
      <div style={styles.logoTopContainer}>
        <img
          src="/logo.png"
          alt="Facility Argentina"
          style={styles.logoTop}
        />
      </div>

      {/* Contenido principal */}
      <div style={styles.container}>
        <h1 style={styles.title}>Panel de Administración</h1>
        <p style={styles.subtitle}>Bienvenido, Superadmin. ¿Qué querés hacer hoy?</p>

        <div style={styles.grid}>
          <button style={styles.card} onClick={() => navigate('/superadmin/crear-tecnico')}>
            <FaUserPlus size={32} />
            <span>Crear Técnico</span>
          </button>

          <button style={styles.card} onClick={() => navigate('/superadmin/tecnicos')}>
            <FaUsersCog size={32} />
            <span>Lista de Técnicos</span>
          </button>

          <button style={styles.card} onClick={() => navigate('/superadmin/asignar-tarea')}>
            <FaClipboardList size={32} />
            <span>Asignar Tarea</span>
          </button>

          <button style={styles.card} onClick={() => navigate('/superadmin/ver-tareas')}>
            <FaTasks size={32} />
            <span>Ver Tareas</span>
          </button>

          <button style={styles.card} onClick={() => navigate('/superadmin/tickets')}>
            <FaTicketAlt size={32} />
            <span>Ver Tickets</span>
          </button>

          <button style={styles.card} onClick={() => navigate('/superadmin/perfil')}>
            <FaUserCircle size={32} />
            <span>Perfil Superadmin</span>
          </button>

          <button style={styles.card} onClick={() => navigate('/superadmin/tecnicos')}>
            <FaUserTie size={32} />
            <span>Perfil Técnico</span>
          </button>
        </div>
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  wrapper: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  logoTopContainer: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: 30,
    paddingBottom: 10,
  },
  logoTop: {
    height: 80,
    objectFit: 'contain',
  },
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: 20,
    textAlign: 'center',
    fontFamily: `'Segoe UI', sans-serif`,
  },
  title: {
    fontSize: '2.2rem',
    fontWeight: 700,
    marginBottom: 10,
    color: '#1e293b',
  },
  subtitle: {
    fontSize: '1.1rem',
    color: '#64748b',
    marginBottom: 40,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 20,
  },
  card: {
    background: '#ffffff',
    border: '2px solid #e2e8f0',
    borderRadius: 16,
    padding: '30px 20px',
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
