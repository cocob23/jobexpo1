import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import dayjs from 'dayjs'
import 'dayjs/locale/es'

dayjs.locale('es')

type Tecnico = {
  id: string
  nombre: string
  apellido: string
  empresa: string | null
  avatar_url: string
}

type Tarea = {
  descripcion: string
  fecha_realizacion: string
}

export default function PerfilTecnicoFM() {
  const { id } = useParams<{ id: string }>()
  const [tecnico, setTecnico] = useState<Tecnico | null>(null)
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [documentos, setDocumentos] = useState<any>(null)

  useEffect(() => {
    if (id) fetchDatos()
  }, [id])

  const fetchDatos = async () => {
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, empresa')
      .eq('id', id)
      .single()

    if (userError || !usuario) return

    // Obtener avatar
    const { data: files } = await supabase.storage.from('avatars').list(`${id}`)
    let avatar_url = ''
    if (files && files.length > 0) {
      const latestFile = files[0].name
      const path = `${id}/${latestFile}`
      const { data: avatar } = supabase.storage.from('avatars').getPublicUrl(path)
      avatar_url = avatar?.publicUrl || ''
    }

    // Setear técnico completo
    const tecnicoCompleto: Tecnico = {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      empresa: usuario.empresa,
      avatar_url,
    }
    setTecnico(tecnicoCompleto)

    // Obtener tareas
    const { data: tareasProximas } = await supabase
      .from('trabajos_mantenimiento')
      .select('descripcion, fecha_realizacion')
      .eq('usuario_id', id)
      .gte('fecha_realizacion', new Date().toISOString())
      .order('fecha_realizacion', { ascending: true })

    setTareas(tareasProximas || [])

    // Obtener documentos
    const { data: doc } = await supabase
      .from('documentos_tecnicos')
      .select('*')
      .eq('tecnico_id', id)
      .maybeSingle()

    setDocumentos(doc)
  }

  const descargar = (tipo: 'poliza' | 'acta') => {
    const bucket = tipo === 'poliza' ? 'polizas' : 'actacompromiso'
    const path = `${id}/${tipo}.pdf`
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    if (data?.publicUrl) window.open(data.publicUrl, '_blank')
  }

  return (
    <div style={styles.container}>
      {tecnico && (
        <>
          <img
            src={
              tecnico.avatar_url ||
              'https://ui-avatars.com/api/?name=User'
            }
            alt="avatar"
            style={styles.avatar}
          />
          <h2>{tecnico.nombre} {tecnico.apellido}</h2>
          <p>Empresa asignada: {tecnico.empresa || 'Sin asignar'}</p>

          <h3>Próximas tareas</h3>
          {tareas.length === 0 ? (
            <p>Sin tareas próximas</p>
          ) : (
            tareas.map((t, i) => (
              <div key={i} style={styles.tareaCard}>
                <strong>{t.descripcion}</strong>
                <p>{dayjs(t.fecha_realizacion).format('DD/MM HH:mm')} hs</p>
              </div>
            ))
          )}

          <h3>Documentos</h3>
          <button onClick={() => descargar('poliza')}>Descargar póliza</button>
          <button onClick={() => descargar('acta')}>Descargar acta compromiso</button>
        </>
      )}
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: 600,
    margin: 'auto',
    padding: 24,
    fontFamily: 'sans-serif',
  },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: '50%',
    border: '3px solid #1e40af',
    marginBottom: 16,
  },
  tareaCard: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
}
