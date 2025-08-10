// src/superadmin/crear-tecnico.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function CrearTecnico() {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)

  const crearTecnico = async () => {
    setMensaje('')
    if (!email || !password || !nombre || !apellido) {
      setMensaje('Completá todos los campos'); return
    }
    if (password.length < 6) {
      setMensaje('La contraseña debe tener al menos 6 caracteres'); return
    }

    setCargando(true)
    try {
      // token de la sesión actual para autorizar la Edge Function
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setMensaje('No hay sesión válida'); return
      }

      // Llamamos a la función server-side (crea en Auth + inserta en usuarios)
      const resp = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/crear-usuario`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            // En funciones conviene mandar también el anon key
            'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY as string,
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
            nombre,
            apellido,
            rol: 'mantenimiento', // ← técnico
          }),
        }
      )

      const json = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        setMensaje(`Error: ${json?.error || 'No se pudo crear el usuario'}`)
        return
      }

      setMensaje('Técnico creado con éxito ✅')
      setNombre(''); setApellido(''); setEmail(''); setPassword('')
    } catch (e: any) {
      setMensaje(`Error inesperado: ${String(e?.message || e)}`)
      console.error(e)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={styles.contenedor}>
      <div style={styles.headerContainer}>
        <button onClick={() => navigate('/superadmin')} style={styles.botonVolver}>
          ← Volver
        </button>
        <h2 style={styles.titulo}>Crear nuevo técnico</h2>
      </div>

      <input placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} style={styles.input} />
      <input placeholder="Apellido" value={apellido} onChange={e => setApellido(e.target.value)} style={styles.input} />
      <input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} />
      <input placeholder="Contraseña" type="password" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} />

      <button onClick={crearTecnico} style={styles.boton} disabled={cargando}>
        {cargando ? 'Creando...' : 'Crear técnico'}
      </button>

      {mensaje && <p style={{ marginTop: 8 }}>{mensaje}</p>}
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  contenedor: {
    padding: '2rem',
    maxWidth: '420px',
    margin: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  input: {
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
  },
  boton: {
    padding: '12px',
    backgroundColor: '#2563EB',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  headerContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem',
  },
  titulo: {
    fontSize: '1.8rem',
    fontWeight: 700,
    marginBottom: 0,
    color: '#1e293b',
    textAlign: 'center',
    flex: 1,
  },
  botonVolver: {
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
}
