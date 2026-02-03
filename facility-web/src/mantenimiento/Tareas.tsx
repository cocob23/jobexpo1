import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { useNavigate } from 'react-router-dom'
import './responsive.css'

dayjs.locale('es')

type Trabajo = any

export default function TareasMantenimiento() {
  const [tareas, setTareas] = useState<Trabajo[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filtro, setFiltro] = useState<'Pendiente' | 'Realizado'>('Pendiente')
  const navigate = useNavigate()

  const handleGoBack = () => {
    navigate('/mantenimiento')
  }

  useEffect(() => {
    cargarTareas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro])

  const cargarTareas = async () => {
    if (!refreshing) setLoading(true)

    const { data: usuarioActual } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('trabajos_mantenimiento')
      .select(`
        id,
        descripcion,
        empresa,
        direccion,
        fecha_realizacion,
        tecnico:usuarios!usuario_id (
          nombre,
          apellido
          ),
        fm:usuarios!fm_id (
          nombre,
          apellido
        )
      `)
      .eq('usuario_id', usuarioActual?.user?.id)
      .eq('estado', filtro)
      .order('fecha_realizacion', { ascending: true })

    if (error) {
      alert('Error: ' + error.message)
    } else {
      setTareas(data || [])
    }

    setLoading(false)
    setRefreshing(false)
  }

  const onRefresh = () => {
    setRefreshing(true)
    void cargarTareas()
  }

  return (
    <div style={styles.container as React.CSSProperties}>
      {/* Botón Volver */}
      <button
        onClick={handleGoBack}
        style={{
          position: 'fixed',
          top: 90,
          left: 20,
          backgroundColor: '#6b7280',
          color: '#fff',
          border: 'none',
          padding: '10px 16px',
          borderRadius: 6,
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: 14,
          zIndex: 999,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        ← Volver
      </button>

      <img src="/logo.png" alt="logo" style={styles.logo as React.CSSProperties} />
      <h2 style={styles.tituloPantalla as React.CSSProperties}>Mis tareas asignadas</h2>

      <div style={styles.filtros as React.CSSProperties}>
        <button
          style={{ ...(styles.botonFiltro as React.CSSProperties), ...(filtro === 'Pendiente' ? styles.botonActivo : {}) }}
          onClick={() => setFiltro('Pendiente')}
        >
          {filtro === 'Pendiente' ? <span style={styles.textoActivo as React.CSSProperties}>Pendientes</span> : <span style={styles.textoFiltro as React.CSSProperties}>Pendientes</span>}
        </button>

        <button
          style={{ ...(styles.botonFiltro as React.CSSProperties), ...(filtro === 'Realizado' ? styles.botonActivo : {}) }}
          onClick={() => setFiltro('Realizado')}
        >
          {filtro === 'Realizado' ? <span style={styles.textoActivo as React.CSSProperties}>Realizadas</span> : <span style={styles.textoFiltro as React.CSSProperties}>Realizadas</span>}
        </button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {tareas.map((item) => (
            <div key={item.id} style={styles.card as React.CSSProperties} onClick={() => navigate(`/mantenimiento/detalle-tarea?id=${item.id}`)}>
              <div style={styles.nombreFM as React.CSSProperties}>Asignado por: {item.usuarios?.nombre} {item.usuarios?.apellido}</div>
              <div style={styles.descripcion as React.CSSProperties}>{item.descripcion}</div>
              <div style={styles.empresa as React.CSSProperties}>{item.empresa}</div>
              <div style={styles.direccion as React.CSSProperties}>{item.direccion}</div>
              <div style={styles.fecha as React.CSSProperties}>{dayjs(item.fecha_realizacion).format('DD/MM - HH:mm')}hs.</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  tituloPantalla: {
    marginTop: 30,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  logo: {
    width: 270,
    height: 90,
    objectFit: 'contain',
    display: 'block',
    margin: '30px auto 20px',
  },
  filtros: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 12,
  },
  botonFiltro: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2563EB',
    borderStyle: 'solid' as const,
  },
  botonActivo: {
    backgroundColor: '#2563EB',
  },
  textoFiltro: {
    color: '#2563EB',
    fontWeight: 'bold',
  },
  textoActivo: {
    color: '#fff',
    fontWeight: 'bold',
  },
  card: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    cursor: 'pointer',
  },
  nombreFM: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  descripcion: {
    fontSize: 15,
    marginBottom: 4,
  },
  empresa: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 4,
    color: '#444',
  },
  direccion: {
    fontSize: 14,
    marginBottom: 4,
  },
  fecha: {
    fontSize: 14,
    color: '#1e40af',
    fontWeight: 'bold',
  },
}
