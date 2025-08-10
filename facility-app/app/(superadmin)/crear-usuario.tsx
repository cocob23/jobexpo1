// src/superadmin/crear-usuario.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Rol = 'mantenimiento' | 'fm' | 'limpieza' | 'superadmin'

export default function CrearUsuario() {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState<Rol>('mantenimiento')
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)
  const [verPass, setVerPass] = useState(false)

  const generarPassword = () => {
    // Simple generator: 10 chars con números y letras
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    let p = ''
    for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)]
    setPassword(p)
  }

  const crearUsuario = async () => {
    setMensaje('')
    if (!email || !password || !nombre || !apellido) {
      setMensaje('Completá todos los campos')
      return
    }
    if (password.length < 6) {
      setMensaje('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setCargando(true)
    const emailLimpio = email.trim().toLowerCase()

    // 1) Crear en Auth (con email confirmado y user_metadata con rol)
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: emailLimpio,
      password,
      email_confirm: true,
      user_metadata: { rol, nombre, apellido },
    })

    if (authError) {
      setMensaje(`Error al crear usuario (Auth): ${authError.message}`)
      setCargando(false)
      return
    }

    const userId = authUser.user?.id
    if (!userId) {
      setMensaje('No se obtuvo el ID del usuario recién creado')
      setCargando(false)
      return
    }

    // 2) Insert en tabla usuarios
    const { error: insertError } = await supabase.from('usuarios').insert({
      id: userId,
      email: emailLimpio,
      nombre,
      apellido,
      rol,
    })

    if (insertError) {
      // 2b) Si falla el insert en la tabla, borro el usuario de Auth para no dejarlo huérfano
      await supabase.auth.admin.deleteUser(userId)
      setMensaje(`Error al guardar en tabla usuarios: ${insertError.message}`)
      setCargando(false)
      return
    }

    setMensaje('Usuario creado con éxito ✅')
    setNombre('')
    setApellido('')
    setEmail('')
    setPassword('')
    setRol('mantenimiento')
    setCargando(false)
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <button onClick={() => navigate('/superadmin')} style={styles.botonVolver}>
          ← Volver
        </button>
        <h2 style={styles.titulo}>Crear usuario</h2>
      </div>

      <div style={styles.card}>
        <div style={styles.row}>
          <input
            placeholder="Nombre"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            style={styles.input}
          />
          <input
            placeholder="Apellido"
            value={apellido}
            onChange={e => setApellido(e.target.value)}
            style={styles.input}
          />
        </div>

        <input
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={styles.input}
          type="email"
        />

        <div style={styles.row}>
          <input
            placeholder="Contraseña"
            type={verPass ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ ...styles.input, flex: 1 }}
          />
          <button type="button" onClick={() => setVerPass(v => !v)} style={styles.btnSec}>
            {verPass ? 'Ocultar' : 'Ver'}
          </button>
          <button type="button" onClick={generarPassword} style={styles.btnSec}>
            Generar
          </button>
        </div>

        <label style={styles.label}>Rol</label>
        <select value={rol} onChange={e => setRol(e.target.value as Rol)} style={styles.select}>
          <option value="mantenimiento">Mantenimiento</option>
          <option value="fm">Facility Manager</option>
          <option value="limpieza">Limpieza</option>
          <option value="superadmin">Superadmin</option>
        </select>

        <button onClick={crearUsuario} style={styles.boton} disabled={cargando}>
          {cargando ? 'Creando...' : 'Crear usuario'}
        </button>

        {mensaje && <p style={styles.mensaje}>{mensaje}</p>}
      </div>
    </div>
  )
}

const styles: { [k: string]: React.CSSProperties } = {
  wrapper: {
    padding: '30px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    maxWidth: '560px',
    marginBottom: '16px',
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
  titulo: {
    margin: 0,
    fontSize: '1.6rem',
    fontWeight: 700,
    color: '#1e293b',
    flex: 1,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    width: '100%',
    maxWidth: '560px',
    borderRadius: '14px',
    padding: '18px',
    boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  row: {
    display: 'flex',
    gap: '12px',
  },
  input: {
    flex: 1,
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    outline: 'none',
  },
  label: {
    fontSize: '0.9rem',
    color: '#334155',
    fontWeight: 600,
    marginTop: '4px',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    outline: 'none',
    backgroundColor: '#fff',
  },
  boton: {
    marginTop: '8px',
    padding: '12px',
    backgroundColor: '#2563EB',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  btnSec: {
    padding: '10px 12px',
    backgroundColor: '#e5e7eb',
    color: '#111827',
    border: 'none',
    borderRadius: '10px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  mensaje: {
    marginTop: '6px',
    color: '#2563EB',
    fontWeight: 500,
  },
}
