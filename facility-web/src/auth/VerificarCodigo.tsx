import { useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function VerificarCodigo() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email || ''
  const [codigo, setCodigo] = useState('')
  const [verificando, setVerificando] = useState(false)

  const verificar = async () => {
    setVerificando(true)
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: codigo,
      type: 'email',
    })
    setVerificando(false)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      navigate('/nueva-password')
    }
  }

  return (
    <div style={styles.container}>
      <h2>Ingresá el código</h2>
      <input
        type="text"
        placeholder="Código que recibiste"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        style={styles.input}
      />
      <button onClick={verificar} style={styles.button} disabled={verificando}>
        {verificando ? 'Verificando...' : 'Verificar código'}
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
