import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function CrearTecnico() {
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mensaje, setMensaje] = useState('')
  const navigate = useNavigate()

  const crearTecnico = async () => {
    if (!email || !password || !nombre || !apellido) {
      setMensaje('Completá todos los campos')
      return
    }

    setMensaje('Creando técnico...')

    try {
      const emailLimpio = email.trim().toLowerCase()
      console.log('Intentando crear usuario con email:', emailLimpio)

      // Usar signUp con confirmación automática
      const { data: authUser, error: authError } = await supabase.auth.signUp({
        email: emailLimpio,
        password,
        options: {
          data: {
            nombre,
            apellido,
            rol: 'mantenimiento'
          }
        }
      })

      if (authError) {
        console.error('Error en auth.signUp:', authError)
        setMensaje(`Error al crear usuario: ${authError.message}`)
        return
      }

      console.log('Usuario creado en auth:', authUser)

      const userId = authUser.user?.id
      if (!userId) {
        setMensaje('Error: No se pudo obtener el ID del usuario creado')
        return
      }

      console.log('Insertando en tabla usuarios con ID:', userId)

      const { error: insertError } = await supabase.from('usuarios').insert({
        id: userId,
        email: emailLimpio,
        nombre,
        apellido,
        rol: 'mantenimiento',
      })

      if (insertError) {
        console.error('Error al insertar en usuarios:', insertError)
        setMensaje(`Error al guardar en tabla usuarios: ${insertError.message}`)
      } else {
        console.log('Técnico creado exitosamente')
        setMensaje('Técnico creado con éxito ✅')
        setNombre('')
        setApellido('')
        setEmail('')
        setPassword('')
      }
    } catch (error) {
      console.error('Error inesperado:', error)
      setMensaje(`Error inesperado: ${error}`)
    }
  }

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

      <div style={styles.contenedor}>
        <div style={styles.headerContainer}>
          <button onClick={() => navigate('/fm')} style={styles.botonVolver}>
            ← Volver
          </button>
          <h2 style={styles.titulo}>Crear Nuevo Técnico</h2>
        </div>

        <input 
          placeholder="Nombre" 
          value={nombre} 
          onChange={e => setNombre(e.target.value)} 
          style={styles.input} 
          onFocus={(e) => {
            e.target.style.borderColor = '#1e40af'
            e.target.style.boxShadow = '0 0 0 3px rgba(30, 64, 175, 0.1)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e2e8f0'
            e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
          }}
        />
        <input 
          placeholder="Apellido" 
          value={apellido} 
          onChange={e => setApellido(e.target.value)} 
          style={styles.input} 
          onFocus={(e) => {
            e.target.style.borderColor = '#1e40af'
            e.target.style.boxShadow = '0 0 0 3px rgba(30, 64, 175, 0.1)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e2e8f0'
            e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
          }}
        />
        <input 
          placeholder="Email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          style={styles.input} 
          onFocus={(e) => {
            e.target.style.borderColor = '#1e40af'
            e.target.style.boxShadow = '0 0 0 3px rgba(30, 64, 175, 0.1)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e2e8f0'
            e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
          }}
        />
        <input 
          placeholder="Contraseña" 
          type="password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          style={styles.input} 
          onFocus={(e) => {
            e.target.style.borderColor = '#1e40af'
            e.target.style.boxShadow = '0 0 0 3px rgba(30, 64, 175, 0.1)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e2e8f0'
            e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
          }}
        />

        <button 
          onClick={crearTecnico} 
          style={styles.boton}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#1d4ed8'
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#1e40af'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          ➕ Crear Técnico
        </button>

        {mensaje && (
          <p style={mensaje.includes('✅') ? styles.mensajeExito : styles.mensajeError}>
            {mensaje}
          </p>
        )}
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
  contenedor: {
    maxWidth: '500px',
    margin: '0 auto',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    fontFamily: `'Segoe UI', sans-serif`,
  },
  titulo: {
    fontSize: '2.2rem',
    fontWeight: 700,
    marginBottom: '0',
    color: '#1e293b',
    textAlign: 'center',
    flex: 1,
  },
  input: {
    padding: '16px 20px',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    fontSize: '16px',
    transition: 'all 0.2s ease',
    backgroundColor: 'white',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  boton: {
    padding: '16px 24px',
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  mensajeExito: {
    color: '#059669',
    backgroundColor: '#d1fae5',
    padding: '16px',
    borderRadius: '12px',
    textAlign: 'center',
    fontWeight: '600',
    border: '2px solid #10b981',
  },
  mensajeError: {
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    padding: '16px',
    borderRadius: '12px',
    textAlign: 'center',
    fontWeight: '600',
    border: '2px solid #ef4444',
  },
  headerContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem',
  },
  botonVolver: {
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
}

