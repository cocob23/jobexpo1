// src/superadmin/SuperadminLayout.tsx
import { Outlet, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { FaHome, FaUser, FaSignOutAlt } from 'react-icons/fa'

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

  if (loading) return (
    <div style={styles.loadingContainer}>
      <div className="spinner"></div>
      <p>Cargando...</p>
    </div>
  )
  if (!authorized) return <Navigate to="/login" replace />

  return (
    <div style={styles.wrapper}>
      {/* Modern Navbar */}
      <nav style={styles.navbar}>
        <div style={styles.navContent}>
          {/* Left section */}
          <div style={styles.navLeft}>
            <button
              style={styles.homeButton}
              onClick={() => navigate('/superadmin')}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'var(--primary-600)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'var(--gradient-primary)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <FaHome style={{ marginRight: '0.5rem' }} />
              Inicio
            </button>
          </div>

          {/* Center section - Logo */}
          <div style={styles.navCenter} onClick={() => navigate('/superadmin')}>
            <div style={styles.logoContainer}>
              <img src="/logo.png" alt="Logo empresa" style={styles.logo} />
            </div>
            <div style={styles.brandInfo}>
              <h2 style={styles.brandTitle}>Admin Panel</h2>
              <p style={styles.brandSubtitle}>Sistema de Gestión</p>
            </div>
          </div>

          {/* Right section */}
          <div style={styles.navRight}>
            <button
              style={styles.navButton}
              onClick={() => navigate('/superadmin/perfil')}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'var(--neutral-100)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <FaUser style={{ marginRight: '0.5rem' }} />
              Perfil
            </button>
            
            <button
              style={styles.logoutButton}
              onClick={handleLogout}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'var(--error-600)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'var(--error-500)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <FaSignOutAlt style={{ marginRight: '0.5rem' }} />
              Salir
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main style={styles.content} className="fade-in">
        <Outlet />
      </main>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  wrapper: {
    minHeight: '100vh',
    backgroundColor: 'var(--neutral-50)',
    display: 'flex',
    flexDirection: 'column',
  },

  navbar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '80px',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid var(--neutral-200)',
    boxShadow: 'var(--shadow-sm)',
    zIndex: 1000,
  },

  navContent: {
    height: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  navLeft: {
    display: 'flex',
    alignItems: 'center',
    flex: '0 0 auto',
  },

  navCenter: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
    flex: '1',
    justifyContent: 'center',
  },

  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flex: '0 0 auto',
  },

  homeButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.75rem 1.5rem',
    background: 'var(--gradient-primary)',
    color: 'var(--neutral-0)',
    border: 'none',
    borderRadius: '0.75rem',
    fontWeight: '600',
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: 'var(--shadow-sm)',
  },

  logoContainer: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    background: 'var(--gradient-card)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '1rem',
    boxShadow: 'var(--shadow-md)',
  },

  logo: {
    width: '35px',
    height: 'auto',
    borderRadius: '0.25rem',
  },

  brandInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },

  brandTitle: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--neutral-800)',
    lineHeight: 1.2,
  },

  brandSubtitle: {
    margin: 0,
    fontSize: '0.75rem',
    color: 'var(--neutral-500)',
    fontWeight: '500',
    lineHeight: 1,
  },

  navButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    background: 'transparent',
    color: 'var(--neutral-600)',
    border: 'none',
    borderRadius: '0.5rem',
    fontWeight: '500',
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    background: 'var(--error-500)',
    color: 'var(--neutral-0)',
    border: 'none',
    borderRadius: '0.5rem',
    fontWeight: '600',
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: 'var(--shadow-sm)',
  },

  content: {
    flex: 1,
    marginTop: '80px',
    padding: '2rem',
    maxWidth: '1200px',
    margin: '80px auto 0',
    width: '100%',
  },

  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'var(--neutral-50)',
    color: 'var(--neutral-600)',
    gap: '1rem',
  },
}