import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function NuevaPassword() {
  const [password, setPassword] = useState('')
  const [guardando, setGuardando] = useState(false)
  const navigate = useNavigate()

  const guardar = async () => {
    if (password.length < 6) return alert('La contraseña debe tener al menos 6 caracteres')

    setGuardando(true)
    const { error } = await supabase.auth.updateUser({ password })
    setGuardando(false)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('Contraseña actualizada')
      navigate('/')
    }
  }

  return (
    <div style={styles.container}>
      <h2>Nueva contraseña</h2>
      <input
        type="password"
        placeholder="Nueva contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={styles.input}
      />
      <button onClick={guardar} style={styles.button} disabled={guardando}>
        {guardando ? 'Guardando...' : 'Cambiar contraseña'}
      </button>
    </div>
  )
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '120px' },
  input: { padding: '12px', marginBottom: '12px', width: '240px', borderRadius: '8px', border: '1px solid #ccc' },
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
