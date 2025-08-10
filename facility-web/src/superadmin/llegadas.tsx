import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Llegada = {
  id: string
  lugar: string
  fecha: string
  hora: string
  latitud: number
  longitud: number
  usuarios: {
    nombre: string
    apellido: string
  }
}

export default function Llegadas() {
  const navigate = useNavigate()
  const [llegadas, setLlegadas] = useState<Llegada[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    obtenerLlegadas()
  }, [])

  const obtenerLlegadas = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('llegadas')
        .select(`
          *,
          usuarios:usuario_id (
            nombre,
            apellido
          )
        `)
        .order('fecha', { ascending: false })

      if (error) {
        console.error('Error al obtener llegadas:', error)
        setError('No se pudieron cargar las llegadas')
      } else {
        setLlegadas(data || [])
      }
    } catch (err) {
      console.error('Error inesperado:', err)
      setError('Error inesperado al cargar las llegadas')
    } finally {
      setLoading(false)
    }
  }

  const abrirMapa = (latitud: number, longitud: number) => {
    const url = `https://www.google.com/maps?q=${latitud},${longitud}`
    window.open(url, '_blank')
  }

  if (loading) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.logoTopContainer}>
          <img src="/logo.png" alt="Facility Argentina" style={styles.logoTop} />
        </div>
        <div style={styles.container}>
          <p>Cargando llegadas...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.logoTopContainer}>
          <img src="/logo.png" alt="Facility Argentina" style={styles.logoTop} />
        </div>
        <div style={styles.container}>
          <p style={{ color: 'red' }}>{error}</p>
          <button onClick={obtenerLlegadas} style={styles.boton}>
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.logoTopContainer}>
        <img src="/logo.png" alt="Facility Argentina" style={styles.logoTop} />
      </div>

      <div style={styles.container}>
        <div style={styles.headerContainer}>
          <button onClick={() => navigate('/superadmin')} style={styles.botonVolver}>
            ← Volver
          </button>
          <h1 style={styles.titulo}>Llegadas de Empleados</h1>
        </div>

        {llegadas.length === 0 ? (
          <div style={styles.contenido}>
            <p style={styles.texto}>No hay llegadas registradas.</p>
          </div>
        ) : (
          <div style={styles.contenido}>
            <div style={styles.llegadasContainer}>
              {llegadas.map((llegada) => (
                <div key={llegada.id} style={styles.llegadaCard}>
                  <div style={styles.llegadaHeader}>
                    <h3 style={styles.empleadoNombre}>
                      👤 {llegada.usuarios?.nombre} {llegada.usuarios?.apellido}
                    </h3>
                    <span style={styles.fecha}>
                      📅 {llegada.fecha.split('T')[0]}
                    </span>
                  </div>
                  
                  <div style={styles.llegadaInfo}>
                    <p style={styles.texto}>
                      📍 <strong>Lugar:</strong> {llegada.lugar}
                    </p>
                    <p style={styles.texto}>
                      🕒 <strong>Hora:</strong> {llegada.hora}
                    </p>
                    <p style={styles.texto}>
                      📍 <strong>Coordenadas:</strong> {llegada.latitud.toFixed(5)}, {llegada.longitud.toFixed(5)}
                    </p>
                  </div>

                  <button
                    onClick={() => abrirMapa(llegada.latitud, llegada.longitud)}
                    style={styles.botonMapa}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#1d4ed8'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#1e40af'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    🗺️ Ver en Google Maps
                  </button>
                </div>
              ))}
            </div>
          </div>
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
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '2rem',
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
  contenido: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  llegadasContainer: {
    display: 'grid',
    gap: '1.5rem',
  },
  llegadaCard: {
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1.5rem',
    backgroundColor: '#f8fafc',
    transition: 'all 0.2s ease',
  },
  llegadaHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    paddingBottom: '0.5rem',
    borderBottom: '2px solid #e2e8f0',
  },
  empleadoNombre: {
    fontSize: '1.3rem',
    fontWeight: 600,
    color: '#1e40af',
    margin: 0,
  },
  fecha: {
    fontSize: '1rem',
    color: '#64748b',
    fontWeight: 500,
  },
  llegadaInfo: {
    marginBottom: '1rem',
  },
  texto: {
    fontSize: '1rem',
    color: '#374151',
    marginBottom: '0.5rem',
    lineHeight: '1.5',
  },
  botonMapa: {
    backgroundColor: '#1e40af',
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
  boton: {
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    padding: '16px 24px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  headerContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '2rem',
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
