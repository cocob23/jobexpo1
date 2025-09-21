import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button, Card, Input } from '../components/ui'
import { FaEnvelope, FaLock, FaShieldAlt } from 'react-icons/fa'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const iniciarSesion = async () => {
    if (!email || !password) {
      setError('Por favor completa todos los campos')
      return
    }

    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('Credenciales inválidas')
      setLoading(false)
      return
    }

    const { data: perfil, error: perfilError } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', data.user.id)
      .single()

    if (perfilError) {
      setError('Error obteniendo perfil: ' + perfilError.message)
      setLoading(false)
      return
    }
    
    if (!perfil) {
      setError('No se encontró el perfil de usuario en la tabla usuarios.')
      setLoading(false)
      return
    }

    const rol = perfil.rol

    if (rol === 'superadmin') navigate('/superadmin')
    else if (rol === 'fm') navigate('/fm')
    else if (rol === 'mantenimiento') navigate('/mantenimiento')
    else if (rol === 'limpieza') navigate('/limpieza')
    else if (rol === 'mantenimiento-externo') navigate('/mantenimiento-externo')
    else {
      setError('Rol no reconocido: ' + rol)
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      iniciarSesion()
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.backgroundOverlay}></div>
      <div style={styles.container} className="fade-in">
        <Card variant="elevated" padding="lg" style={styles.card}>
          <div style={styles.header}>
            <div style={styles.iconContainer}>
              <FaShieldAlt style={styles.headerIcon} />
            </div>
            <img src="logo.png" alt="Logo" style={styles.logo} />
            <h1 style={styles.title}>Bienvenido de vuelta</h1>
            <p style={styles.subtitle}>Accede a tu cuenta para continuar</p>
          </div>

          {error && (
            <div style={styles.errorAlert}>
              {error}
            </div>
          )}

          <div style={styles.form}>
            <Input
              type="email"
              placeholder="tu@email.com"
              label="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              icon={<FaEnvelope />}
              fullWidth
              error={error && !email ? 'El email es requerido' : ''}
            />

            <Input
              type="password"
              placeholder="Tu contraseña"
              label="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              icon={<FaLock />}
              fullWidth
              error={error && !password ? 'La contraseña es requerida' : ''}
              style={{ marginTop: '1rem' }}
            />

            <Button
              onClick={iniciarSesion}
              loading={loading}
              fullWidth
              size="lg"
              style={{ marginTop: '2rem' }}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>
          </div>

          <div style={styles.footer}>
            <p style={styles.footerText}>
              Sistema de gestión empresarial seguro
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    background: 'var(--gradient-hero)',
    padding: '1rem',
  } as React.CSSProperties,
  
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(ellipse at center, rgba(102, 126, 234, 0.1) 0%, rgba(0, 0, 0, 0.1) 100%)',
    zIndex: -1,
  } as React.CSSProperties,

  container: {
    width: '100%',
    maxWidth: '420px',
  } as React.CSSProperties,

  card: {
    backdropFilter: 'blur(10px)',
    background: 'rgba(255, 255, 255, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
  } as React.CSSProperties,

  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  } as React.CSSProperties,

  iconContainer: {
    width: '4rem',
    height: '4rem',
    borderRadius: '50%',
    background: 'var(--gradient-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem',
    boxShadow: 'var(--shadow-glow)',
  } as React.CSSProperties,

  headerIcon: {
    fontSize: '1.5rem',
    color: 'var(--neutral-0)',
  } as React.CSSProperties,

  logo: {
    width: '120px',
    height: 'auto',
    marginBottom: '1.5rem',
    borderRadius: '0.5rem',
  } as React.CSSProperties,

  title: {
    fontSize: '1.875rem',
    fontWeight: '700',
    color: 'var(--neutral-800)',
    margin: '0 0 0.5rem 0',
  } as React.CSSProperties,

  subtitle: {
    fontSize: '1rem',
    color: 'var(--neutral-600)',
    margin: 0,
  } as React.CSSProperties,

  form: {
    marginBottom: '2rem',
  } as React.CSSProperties,

  errorAlert: {
    padding: '0.75rem 1rem',
    backgroundColor: 'var(--error-50)',
    border: '1px solid var(--error-200)',
    borderRadius: '0.5rem',
    color: 'var(--error-700)',
    fontSize: '0.875rem',
    marginBottom: '1rem',
    textAlign: 'center',
  } as React.CSSProperties,

  footer: {
    textAlign: 'center',
    paddingTop: '1rem',
    borderTop: '1px solid var(--neutral-200)',
  } as React.CSSProperties,

  footerText: {
    fontSize: '0.875rem',
    color: 'var(--neutral-500)',
    margin: 0,
  } as React.CSSProperties,
} as const
