// src/fm/FMLayout.tsx
import { Outlet, useNavigate } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import { supabase } from '../lib/supabase'
import './responsive.css'

export default function FMLayout() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <ProtectedRoute>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Navbar */}
        <nav style={styles.navbar}>
          {/* Sección izquierda: Botón inicio */}
          <div style={styles.leftSection}>
            <button onClick={() => navigate('/fm')} style={styles.botonInicio}>
              ⌂ Inicio
            </button>
          </div>

          {/* Sección centro: Logo */}
          <div style={styles.centerSection}>
            <img
              src="/logo.png"
              alt="Logo empresa"
              style={styles.logo}
              onClick={() => navigate('/fm')}
            />
          </div>

          {/* Sección derecha: Perfil y cerrar sesión */}
          <div style={styles.rightSection}>
            <button style={styles.navButton} onClick={() => navigate('/fm/perfil')}>
              Perfil
            </button>
            <button
              style={{ ...styles.navButton, backgroundColor: '#ef4444' }}
              onClick={handleLogout}
            >
              Cerrar sesión
            </button>
          </div>
        </nav>

        {/* Contenido */}
        <div style={{ flex: 1, padding: 24, marginTop: 70 }}>
          <Outlet />
        </div>
      </div>
    </ProtectedRoute>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  navbar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: '#e9ecf1ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    zIndex: 1000,
  },
  leftSection: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
  },
  centerSection: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightSection: {
    flex: 1,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    alignItems: 'center',
  },
  logo: {
    height: 45,
    objectFit: 'contain',
    cursor: 'pointer',
  },
  navButton: {
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '6px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14,
  },
  botonInicio: {
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
}
