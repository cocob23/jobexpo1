import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const iniciarSesion = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert('Credenciales inválidas')
      return
    }

    const { data: perfil } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', data.user.id)
      .single()

    const rol = perfil?.rol

    if (rol === 'superadmin') navigate('/superadmin')
    else if (rol === 'fm') navigate('/fm')
    else if (rol === 'mantenimiento') navigate('/mantenimiento')
    else if (rol === 'limpieza') navigate('/limpieza')
    else navigate('/login')
  }

  return (
    <div style={styles.container}>
      <img src="logo.png" alt="Logo" style={styles.logo} />
      <h2>Iniciar sesión</h2>
      <p>Accedé con tu cuenta de Facility</p>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={styles.input}
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={styles.input}
      />
      <button onClick={iniciarSesion} style={styles.button}>Entrar</button>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: '120px',
  },
  logo: {
    width: '180px',
    marginBottom: '40px',
  },
  input: {
    padding: '12px',
    marginBottom: '12px',
    width: '240px',
    borderRadius: '8px',
    border: '1px solid #ccc',
  },
  button: {
    padding: '12px 20px',
    backgroundColor: '#2563EB',
    color: 'white',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
} as const
