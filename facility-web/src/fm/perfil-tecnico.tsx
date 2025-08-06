import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function PerfilTecnico() {
  const query = new URLSearchParams(useLocation().search)
  const id = query.get('id')
  const [tecnico, setTecnico] = useState<any>(null)
  const [tareas, setTareas] = useState<any[]>([])
  const [documentos, setDocumentos] = useState<any>(null)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    if (id) fetchDatos()
  }, [id])

  const fetchDatos = async () => {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .single()
    setTecnico(usuario)

    const { data: tareasProximas } = await supabase
      .from('trabajos_mantenimiento')
      .select('*')
      .eq('usuario_id', id)
      .gte('fecha_realizacion', new Date().toISOString())
      .order('fecha_realizacion', { ascending: true })

    setTareas(tareasProximas || [])

    const { data: doc } = await supabase
      .from('documentos_tecnicos')
      .select('*')
      .eq('tecnico_id', id)
      .single()

    setDocumentos(doc)
  }

  const subirDocumento = async (tipo: 'poliza' | 'acta') => {
    const archivo = document.createElement('input')
    archivo.type = 'file'
    archivo.accept = 'application/pdf'

    archivo.onchange = async () => {
      if (!archivo.files || archivo.files.length === 0) return
      const file = archivo.files[0]
      const bucket = tipo === 'poliza' ? 'polizas' : 'actacompromiso'
      const path = `${id}/${tipo}.pdf`

      const { error: errorUpload } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true })

      if (errorUpload) {
        setMensaje(`error al subir archivo: ${errorUpload.message}`)
        return
      }

      const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
      const campo = tipo === 'poliza' ? 'poliza_url' : 'acta_compromiso_url'

      const { error: errorUpdate } = await supabase
        .from('documentos_tecnicos')
        .upsert([{ tecnico_id: id, [campo]: url }])

      if (errorUpdate) {
        setMensaje(`error al guardar URL: ${errorUpdate.message}`)
        return
      }

      const { data: docActualizado } = await supabase
        .from('documentos_tecnicos')
        .select('*')
        .eq('tecnico_id', id)
        .single()

      setDocumentos(docActualizado)
      setMensaje(`✅ ${tipo} subida correctamente`)
    }

    archivo.click()
  }

  const descargar = (tipo: 'poliza' | 'acta') => {
    const bucket = tipo === 'poliza' ? 'polizas' : 'actacompromiso'
    const path = `${id}/${tipo}.pdf`
    const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl

    fetch(url, { method: 'HEAD' }).then(res => {
      if (res.ok) {
        window.open(url, '_blank')
      } else {
        alert(`NO HAY ${tipo.toUpperCase()}`)
      }
    })
  }

  if (!tecnico) return <p>cargando perfil...</p>

  return (
    <div style={styles.container}>
      <img
        src={
          tecnico.avatar_url ||
          'https://ui-avatars.com/api/?name=User&background=ccc&color=000&size=128'
        }
        alt="avatar"
        style={styles.avatar}
      />
      <h2>{tecnico.nombre} {tecnico.apellido}</h2>
      <p><strong>empresa asignada:</strong> {tecnico.empresa || 'sin asignar'}</p>

      <h3 style={{ marginTop: 20 }}>próximas tareas:</h3>
      {tareas.length === 0 ? (
        <p>sin tareas próximas</p>
      ) : (
        tareas.map((t, i) => (
          <div key={i} style={styles.tareaCard}>
            <p><strong>{t.descripcion}</strong></p>
            <p>{new Date(t.fecha_realizacion).toLocaleString()}</p>
          </div>
        ))
      )}

      <button style={styles.boton} onClick={() => subirDocumento('poliza')}>
        subir póliza de seguro
      </button>
      <button style={styles.boton} onClick={() => subirDocumento('acta')}>
        subir acta de compromiso
      </button>

      <button style={styles.botonVerde} onClick={() => descargar('poliza')}>
        descargar póliza de seguro
      </button>
      <button style={styles.botonVerde} onClick={() => descargar('acta')}>
        descargar acta de compromiso
      </button>

      {mensaje && <p style={{ marginTop: '1rem' }}>{mensaje}</p>}
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '600px',
    margin: 'auto',
    padding: '2rem',
    textAlign: 'center',
  },
  avatar: {
    width: '130px',
    height: '130px',
    borderRadius: '50%',
    border: '3px solid #1e40af',
    marginBottom: '1rem',
  },
  tareaCard: {
    backgroundColor: '#f1f5f9',
    padding: '1rem',
    marginTop: '1rem',
    borderRadius: '10px',
    textAlign: 'left',
  },
  boton: {
    marginTop: '1rem',
    padding: '10px 16px',
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  botonVerde: {
    marginTop: '1rem',
    padding: '10px 16px',
    backgroundColor: '#22c55e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
}
