import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Tecnico = {
  id: string
  nombre: string
  apellido: string
}

export default function ListaTecnicos() {
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [filtrados, setFiltrados] = useState<Tecnico[]>([])
  const [cargando, setCargando] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    obtenerTecnicos()
  }, [])

  const obtenerTecnicos = async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido')
      .eq('rol', 'mantenimiento')

    if (!error && data) {
      setTecnicos(data)
      setFiltrados(data)
    }
    setCargando(false)
  }

  useEffect(() => {
    const filtro = tecnicos.filter((t) =>
      `${t.nombre} ${t.apellido}`.toLowerCase().includes(busqueda.toLowerCase())
    )
    setFiltrados(filtro)
  }, [busqueda, tecnicos])

  return (
    <div style={styles.container}>
      <h2 style={styles.titulo}>técnicos de mantenimiento</h2>

      <input
        type="text"
        placeholder="buscar por nombre o apellido"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        style={styles.input}
      />

      {cargando ? (
        <p>cargando técnicos...</p>
      ) : (
        filtrados.map((tecnico) => (
          <div
            key={tecnico.id}
            style={styles.card}
            onClick={() => navigate(`/superadmin/perfil-tecnico/${tecnico.id}`)}
          >
            <p style={styles.cardNombre}>{tecnico.nombre} {tecnico.apellido}</p>
          </div>
        ))
      )}
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '2rem',
    maxWidth: '500px',
    margin: 'auto',
  },
  titulo: {
    fontSize: '22px',
    fontWeight: 'bold',
    marginBottom: '1rem',
  },
  input: {
    padding: '12px',
    width: '100%',
    borderRadius: '10px',
    border: '1px solid #ccc',
    marginBottom: '16px',
  },
  card: {
    backgroundColor: '#f3f4f6',
    padding: '16px',
    borderRadius: '10px',
    marginBottom: '12px',
    cursor: 'pointer',
  },
  cardNombre: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1e40af',
  },
}
