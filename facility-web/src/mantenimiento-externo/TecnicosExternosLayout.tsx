// src/mantenimiento-externo/TecnicosExternosLayout.tsx
import { Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function TecnicosExternosLayout() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Navbar (idéntica estética a FMLayout) */}
      <nav style={styles.navbar}>
        <div style={styles.leftSection}>
          <button onClick={() => navigate('/mantenimiento-externo')} style={styles.botonInicio}>
            ⌂ Inicio
          </button>
        </div>

        <div style={styles.centerSection}>
          <img
            src="/logo.png"
            alt="Logo empresa"
            style={styles.logo}
            onClick={() => navigate('/mantenimiento-externo')}
          />
        </div>

          <div style={styles.rightSection}>
            <button style={styles.navButton} onClick={() => navigate('/mantenimiento-externo/perfil')}>
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
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  navbar: {
    position: 'fixed',
    top: 0, left: 0, right: 0,
    height: 70,
    backgroundColor: '#e9ecf1ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    zIndex: 1000,
  },
  leftSection: { flex: 1, display: 'flex', alignItems: 'center' },
  centerSection: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' },
  rightSection: { flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '10px', alignItems: 'center' },
  logo: { height: 45, objectFit: 'contain', cursor: 'pointer' },
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
