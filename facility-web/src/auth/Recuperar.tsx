import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Recuperar() {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const navigate = useNavigate()

  const enviarCodigo = async () => {
    if (!email) return alert('Poné tu email')

    setEnviando(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })
    setEnviando(false)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('Listo. Te mandamos un código a tu email.')
      navigate('/verificar-codigo', { state: { email } })
    }
  }

  return (
    <div style={styles.container}>
      <h2>Recuperar contraseña</h2>
      <input
        type="email"
        placeholder="Tu email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={styles.input}
      />
      <button onClick={enviarCodigo} style={styles.button} disabled={enviando}>
        {enviando ? 'Enviando...' : 'Enviar código'}
      </button>
      <p onClick={() => navigate(-1)} style={styles.link}>Volver</p>
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
  link: { marginTop: '16px', color: '#2563EB', cursor: 'pointer', fontWeight: 'bold' },
} as const
