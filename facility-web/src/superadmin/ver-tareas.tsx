// src/fm/ver-tareas.tsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function VerTareas() {
  const [tareas, setTareas] = useState<any[]>([])
  const [filtro, setFiltro] = useState<'Pendiente' | 'Realizado'>('Pendiente')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    obtenerTareas()
  }, [filtro])

  const obtenerTareas = async () => {
    setLoading(true)
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id
    if (!userId) return

    const { data, error } = await supabase
      .from('trabajos_mantenimiento')
      .select(`
        id,
        descripcion,
        estado,
        empresa,
        fecha_realizacion,
        usuarios:usuario_id ( nombre, apellido )
      `)
      .eq('fm_id', userId)
      .eq('estado', filtro)
      .order('fecha_realizacion', { ascending: true })

    if (error) {
      console.error('Error al obtener tareas:', error)
    } else {
      setTareas(data || [])
    }

    setLoading(false)
  }

  return (
    <div style={{ padding: '30px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/superadmin')}
          style={{
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            padding: '10px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          ← Volver
        </button>
        <h2 style={{ margin: 0, flex: 1 }}>Tareas Asignadas</h2>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={() => setFiltro('Pendiente')}
          style={{
            padding: '10px 16px',
            borderRadius: '20px',
            border: '1px solid #2563EB',
            backgroundColor: filtro === 'Pendiente' ? '#2563EB' : '#fff',
            color: filtro === 'Pendiente' ? '#fff' : '#2563EB',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Pendientes
        </button>

        <button
          onClick={() => setFiltro('Realizado')}
          style={{
            padding: '10px 16px',
            borderRadius: '20px',
            border: '1px solid #2563EB',
            backgroundColor: filtro === 'Realizado' ? '#2563EB' : '#fff',
            color: filtro === 'Realizado' ? '#fff' : '#2563EB',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Realizadas
        </button>
      </div>

      {loading ? (
        <p>Cargando tareas...</p>
      ) : tareas.length === 0 ? (
        <p>No hay tareas asignadas.</p>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {tareas.map((t) => (
            <div
              key={t.id}
              onClick={() => navigate(`/fm/detalle-tarea?id=${t.id}`)}
              style={{
                border: '1px solid #ccc',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer'
              }}
            >
              <h4>{t.descripcion}</h4>
              <p>{t.usuarios?.nombre} {t.usuarios?.apellido}</p>
              <p>{t.empresa}</p>
              <p>{new Date(t.fecha_realizacion).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
