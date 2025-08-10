// src/superadmin/SuperadminLayout.tsx
import { Outlet, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function SuperadminLayout() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    const validar = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const { data: userData } = await supabase.auth.getUser()
      const user = userData?.user

      if (!session || !user) {
        setAuthorized(false)
        setLoading(false)
        return
      }

      const { data: perfil } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', user.id)
        .single()

      setAuthorized(perfil?.rol === 'superadmin')
      setLoading(false)
    }

    validar()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (loading) return <div style={{ padding: 24 }}>Cargando...</div>
  if (!authorized) return <Navigate to="/login" replace />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Navbar fija */}
      <nav style={styles.navbar}>
        {/* Izquierda: botón Inicio */}
        <div style={styles.left}>
          <button
            style={styles.navButtonSecondary}
            onClick={() => navigate('/superadmin')}
            title="Ir al inicio"
          >
            Inicio
          </button>
        </div>

        {/* Centro: logo clickeable */}
        <div style={styles.center} onClick={() => navigate('/superadmin')} title="Inicio">
          <img src="/logo.png" alt="Logo empresa" style={styles.logo} />
        </div>

        {/* Derecha: Perfil y Cerrar sesión */}
        <div style={styles.right}>
          <button
            style={styles.navButton}
            onClick={() => navigate('/superadmin/perfil')}
          >
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
    backgroundColor: '#e9ecf1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center', // el centro es el punto de referencia
    padding: '0 20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    zIndex: 1000,
  },
  left: {
    position: 'absolute',
    left: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  center: {
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto',
  },
  logo: {
    height: 45,
    objectFit: 'contain',
    display: 'block',
  },
  right: {
    position: 'absolute',
    right: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  navButton: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '10px 16px',
    borderRadius: 6,
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14,
  },
  navButtonSecondary: {
    backgroundColor: '#6b7280',
    color: '#fff',
    border: 'none',
    padding: '10px 16px',
    borderRadius: 6,
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14,
  },
}
