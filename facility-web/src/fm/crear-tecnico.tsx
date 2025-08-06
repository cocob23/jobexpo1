import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function CrearTecnico() {
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mensaje, setMensaje] = useState('')
  const navigate = useNavigate()

  const crearTecnico = async () => {
    if (!email || !password || !nombre || !apellido) {
      setMensaje('completá todos los campos')
      return
    }

    const emailLimpio = email.trim().toLowerCase()

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: emailLimpio,
      password,
      email_confirm: true,
    })

    if (authError) {
      setMensaje(`error al crear usuario: ${authError.message}`)
      return
    }

    const userId = authUser.user?.id

    const { error: insertError } = await supabase.from('usuarios').insert({
      id: userId,
      email: emailLimpio,
      nombre,
      apellido,
      rol: 'mantenimiento',
    })

    if (insertError) {
      setMensaje(`error al guardar en tabla usuarios: ${insertError.message}`)
    } else {
      setMensaje('técnico creado con éxito ✅')
      setNombre('')
      setApellido('')
      setEmail('')
      setPassword('')
    }
  }

  return (
    <div style={styles.contenedor}>
      <h2>crear nuevo técnico</h2>

      <input placeholder="nombre" value={nombre} onChange={e => setNombre(e.target.value)} style={styles.input} />
      <input placeholder="apellido" value={apellido} onChange={e => setApellido(e.target.value)} style={styles.input} />
      <input placeholder="email" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} />
      <input placeholder="contraseña" type="password" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} />

      <button onClick={crearTecnico} style={styles.boton}>crear técnico</button>

      {mensaje && <p>{mensaje}</p>}
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  contenedor: {
    padding: '2rem',
    maxWidth: '400px',
    margin: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  input: {
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #ccc',
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
}

