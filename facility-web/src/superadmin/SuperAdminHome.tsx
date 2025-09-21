import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaUserPlus,
  FaTasks,
  FaTicketAlt,
  FaUserTie,
  FaUsersCog,
  FaClipboardList,
  FaMapMarkerAlt,
  FaCalculator,
  FaBuilding,
  FaShieldAlt,
} from 'react-icons/fa'
import { Card } from '../components/ui'

export default function SuperadminIndex() {
  const navigate = useNavigate()

  // Evitar scroll fantasma
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    const prevBg = document.body.style.backgroundColor
    document.body.style.overflow = 'hidden'
    document.body.style.backgroundColor = 'var(--neutral-50)'
    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.backgroundColor = prevBg
    }
  }, [])

  const menuItems = [
    {
      title: 'Crear Usuario',
      description: 'Añadir nuevos usuarios al sistema',
      icon: FaUserPlus,
      path: '/superadmin/crear-usuario',
      color: 'var(--gradient-primary)',
      bgColor: 'var(--primary-50)',
    },
    {
      title: 'Lista de Técnicos',
      description: 'Gestionar técnicos del sistema',
      icon: FaUsersCog,
      path: '/superadmin/tecnicos',
      color: 'var(--gradient-success)',
      bgColor: 'var(--success-50)',
    },
    {
      title: 'Asignar Tarea',
      description: 'Crear y asignar nuevas tareas',
      icon: FaClipboardList,
      path: '/superadmin/asignar-tarea',
      color: 'var(--gradient-secondary)',
      bgColor: 'var(--secondary-50)',
    },
    {
      title: 'Crear Empresa/Cliente',
      description: 'Registrar nuevas empresas',
      icon: FaBuilding,
      path: '/superadmin/empresas/nueva',
      color: 'var(--gradient-warning)',
      bgColor: 'var(--warning-50)',
    },
    {
      title: 'Empresas / Clientes',
      description: 'Ver y gestionar empresas',
      icon: FaBuilding,
      path: '/superadmin/empresas-clientes',
      color: 'var(--gradient-primary)',
      bgColor: 'var(--primary-50)',
    },
    {
      title: 'Ver Tareas',
      description: 'Monitorear tareas activas',
      icon: FaTasks,
      path: '/superadmin/ver-tareas',
      color: 'var(--gradient-success)',
      bgColor: 'var(--success-50)',
    },
    {
      title: 'Ver Tickets',
      description: 'Gestionar tickets de soporte',
      icon: FaTicketAlt,
      path: '/superadmin/tickets',
      color: 'var(--gradient-secondary)',
      bgColor: 'var(--secondary-50)',
    },
    {
      title: 'Perfil Técnico',
      description: 'Ver perfiles técnicos',
      icon: FaUserTie,
      path: '/superadmin/tecnicos',
      color: 'var(--gradient-warning)',
      bgColor: 'var(--warning-50)',
    },
    {
      title: 'Ver Llegadas',
      description: 'Monitorear llegadas y asistencia',
      icon: FaMapMarkerAlt,
      path: '/superadmin/llegadas',
      color: 'var(--gradient-primary)',
      bgColor: 'var(--primary-50)',
    },
    {
      title: 'Gestionar Cotizaciones',
      description: 'Revisar y aprobar cotizaciones',
      icon: FaCalculator,
      path: '/superadmin/cotizaciones',
      color: 'var(--gradient-success)',
      bgColor: 'var(--success-50)',
    },
  ]

  return (
    <div style={styles.wrapper}>
      <div style={styles.container} className="fade-in">
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerIcon}>
            <FaShieldAlt />
          </div>
          <h1 style={styles.title}>Panel de Administración</h1>
          <p style={styles.subtitle}>
            Bienvenido, Superadmin. Desde aquí puedes gestionar todo el sistema
          </p>
        </div>

        {/* Stats Cards */}
        <div style={styles.statsContainer}>
          <Card variant="elevated" padding="md" style={styles.statCard}>
            <h3 style={styles.statNumber}>12</h3>
            <p style={styles.statLabel}>Usuarios Activos</p>
          </Card>
          <Card variant="elevated" padding="md" style={styles.statCard}>
            <h3 style={{ ...styles.statNumber, color: 'var(--success-500)' }}>8</h3>
            <p style={styles.statLabel}>Tareas Completadas</p>
          </Card>
          <Card variant="elevated" padding="md" style={styles.statCard}>
            <h3 style={{ ...styles.statNumber, color: 'var(--secondary-500)' }}>3</h3>
            <p style={styles.statLabel}>Tickets Pendientes</p>
          </Card>
        </div>

        {/* Menu Grid */}
        <div style={styles.grid}>
          {menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <Card
                key={index}
                variant="elevated"
                padding="lg"
                style={{ 
                  ...styles.menuCard,
                  animationDelay: `${index * 0.1}s`,
                }}
                className="slide-in"
                onClick={() => navigate(item.path)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px) scale(1.02)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-xl)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
                }}
              >
                <div 
                  style={{ 
                    ...styles.cardIcon,
                    background: item.color,
                  }}
                >
                  <Icon style={styles.cardIconElement} />
                </div>
                <div style={styles.cardContent}>
                  <h3 style={styles.cardTitle}>{item.title}</h3>
                  <p style={styles.cardDescription}>{item.description}</p>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  wrapper: {
    minHeight: 'calc(100vh - 80px)',
    width: '100%',
    overflow: 'auto',
    paddingBottom: '2rem',
  },

  container: {
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: 'var(--font-sans)',
  },

  header: {
    textAlign: 'center',
    marginBottom: '3rem',
  },

  headerIcon: {
    width: '4rem',
    height: '4rem',
    borderRadius: '50%',
    background: 'var(--gradient-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.5rem',
    boxShadow: 'var(--shadow-glow)',
    fontSize: '1.5rem',
    color: 'var(--neutral-0)',
  },

  title: {
    fontSize: '2.5rem',
    fontWeight: '800',
    margin: '0 0 1rem 0',
    background: 'var(--gradient-primary)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },

  subtitle: {
    fontSize: '1.125rem',
    color: 'var(--neutral-600)',
    maxWidth: '600px',
    margin: '0 auto',
    lineHeight: '1.6',
  },

  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem',
    marginBottom: '3rem',
  },

  statCard: {
    textAlign: 'center',
    background: 'var(--gradient-card)',
    border: '1px solid var(--neutral-100)',
  },

  statNumber: {
    fontSize: '2.5rem',
    fontWeight: '800',
    margin: '0 0 0.5rem 0',
    color: 'var(--primary-500)',
  },

  statLabel: {
    fontSize: '0.875rem',
    color: 'var(--neutral-600)',
    margin: 0,
    fontWeight: '500',
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1.5rem',
  },

  menuCard: {
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    background: 'var(--neutral-0)',
    border: '1px solid var(--neutral-200)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    minHeight: '120px',
    position: 'relative',
    overflow: 'hidden',
  },

  cardIcon: {
    width: '3.5rem',
    height: '3.5rem',
    borderRadius: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: 'var(--shadow-md)',
  },

  cardIconElement: {
    fontSize: '1.5rem',
    color: 'var(--neutral-0)',
  },

  cardContent: {
    flex: 1,
  },

  cardTitle: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: 'var(--neutral-800)',
    margin: '0 0 0.5rem 0',
    lineHeight: '1.3',
  },

  cardDescription: {
    fontSize: '0.875rem',
    color: 'var(--neutral-600)',
    margin: 0,
    lineHeight: '1.4',
  },
}
