import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import dayjs from 'dayjs'
import 'dayjs/locale/es'

dayjs.locale('es')

type Tecnico = {
  id: string
  nombre: string
  apellido: string
  empresa?: string | null
  avatar_url: string
}

type Tarea = {
  descripcion: string
  fecha_realizacion: string
}

export default function PerfilTecnicoFM() {
  console.log('Componente PerfilTecnicoFM montado')
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tecnico, setTecnico] = useState<Tecnico | null>(null)
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log('useEffect ejecutado, id:', id)
    if (id) {
      console.log('Llamando a fetchDatos con id:', id)
      fetchDatos()
    } else {
      console.log('No hay ID, estableciendo loading en false')
      setLoading(false)
    }
  }, [id])

  const fetchDatos = async () => {
    console.log('fetchDatos ejecutado')
    if (!id) {
      console.log('No hay ID, retornando')
      return
    }
    
    console.log('Iniciando carga de datos...')
    setLoading(true)
    setError(null)
    
    try {
      console.log('Buscando usuario con ID:', id)
      console.log('Tipo de ID:', typeof id)
      
      const { data: usuario, error: errorUsuario } = await supabase
        .from('usuarios')
        .select('id, nombre, apellido')
        .eq('id', id)
        .single()

      console.log('Respuesta de Supabase - data:', usuario)
      console.log('Respuesta de Supabase - error:', errorUsuario)

      if (errorUsuario) {
        console.error('Error al buscar usuario:', errorUsuario)
        console.error('Detalles del error:', {
          message: errorUsuario.message,
          details: errorUsuario.details,
          hint: errorUsuario.hint
        })
        setError(`Error al cargar datos del técnico: ${errorUsuario.message}`)
        setLoading(false)
        return
      }

      if (!usuario) {
        console.error('No se encontró usuario con ID:', id)
        setError('Técnico no encontrado')
        setLoading(false)
        return
      }

      console.log('Usuario encontrado:', usuario)

      const { data: files } = await supabase.storage.from('avatars').list(`${id}`, {
        sortBy: { column: 'created_at', order: 'desc' }
      })

      let avatar_url = ''
      if (files && files.length > 0) {
        const latestFile = files[0].name
        const path = `${id}/${latestFile}`
        const { data: avatar } = supabase.storage.from('avatars').getPublicUrl(path)
        avatar_url = avatar?.publicUrl || ''
      }

      setTecnico({ id: usuario.id, nombre: usuario.nombre, apellido: usuario.apellido, empresa: null, avatar_url })

      const { data: tareasProximas } = await supabase
        .from('trabajos_mantenimiento')
        .select('descripcion, fecha_realizacion')
        .eq('usuario_id', id)
        .gte('fecha_realizacion', new Date().toISOString())
        .order('fecha_realizacion', { ascending: true })

      setTareas(tareasProximas || [])

      const { data: doc } = await supabase
        .from('documentos_tecnicos')
        .select('*')
        .eq('tecnico_id', id)
        .maybeSingle()

      console.log('Documentos cargados:', doc)
      setLoading(false)
      console.log('Datos cargados exitosamente')
    } catch (error) {
      console.error('Error en fetchDatos:', error)
      setError('Error al cargar los datos')
      setLoading(false)
    }
  }

  const descargar = async (tipo: 'poliza' | 'acta') => {
    if (!id) {
      alert('No hay ID de técnico')
      return
    }

    const bucket = tipo === 'poliza' ? 'polizas' : 'actacompromiso'
    const path = `${id}/${tipo}.pdf`
    
    console.log('Intentando descargar:', bucket, path)
    
    try {
      // Primero verificar si el archivo existe
      const { data: listData, error: listError } = await supabase.storage
        .from(bucket)
        .list(`${id}`)
      
      if (listError) {
        console.error('Error al listar archivos:', listError)
        alert('Error al verificar archivos')
        return
      }
      
      const fileExists = listData?.some(file => file.name === `${tipo}.pdf`)
      if (!fileExists) {
        alert(`No existe ${tipo === 'poliza' ? 'la póliza' : 'el acta'}`)
        return
      }
      
      // Obtener la URL pública
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)
      
      if (!urlData?.publicUrl) {
        console.error('No se pudo obtener la URL pública')
        alert('Error al generar el enlace de descarga')
        return
      }
      
      console.log('URL de descarga:', urlData.publicUrl)
      
      // Intentar descargar usando fetch para verificar que el archivo existe
      try {
        const response = await fetch(urlData.publicUrl, { method: 'HEAD' })
        if (!response.ok) {
          console.error('Archivo no encontrado en URL:', response.status)
          alert('El archivo no está disponible para descarga')
          return
        }
        
        console.log('Archivo verificado, abriendo...')
        
        // Intentar descargar el archivo directamente
        try {
          const downloadResponse = await fetch(urlData.publicUrl)
          if (!downloadResponse.ok) {
            throw new Error(`HTTP ${downloadResponse.status}`)
          }
          
          const blob = await downloadResponse.blob()
          console.log('Archivo descargado, tamaño:', blob.size)
          
          if (blob.size === 0) {
            alert('El archivo descargado está vacío')
            return
          }
          
          // Crear URL del blob y descargar
          const blobUrl = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = blobUrl
          link.download = `${tipo}.pdf`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(blobUrl)
          
        } catch (downloadError) {
          console.error('Error al descargar archivo:', downloadError)
          // Fallback: abrir en nueva pestaña
          window.open(urlData.publicUrl, '_blank')
        }
      } catch (fetchError) {
        console.error('Error al verificar archivo:', fetchError)
        // Intentar abrir directamente de todas formas
        window.open(urlData.publicUrl, '_blank')
      }
      
    } catch (error) {
      console.error('Error al descargar archivo:', error)
      alert('Error al descargar el archivo')
    }
  }

  const eliminar = async (tipo: 'poliza' | 'acta') => {
    if (!id) return

    const confirmado = window.confirm(`¿Está seguro que desea eliminar la ${tipo}?`)
    if (!confirmado) return

    const bucket = tipo === 'poliza' ? 'polizas' : 'actacompromiso'
    const path = `${id}/${tipo}.pdf`

    const { error: errorRemove } = await supabase.storage.from(bucket).remove([path])
    if (errorRemove) {
      alert('Error eliminando el archivo')
      return
    }

    const campo = tipo === 'poliza' ? 'poliza_url' : 'acta_compromiso_url'
    await supabase
      .from('documentos_tecnicos')
      .update({ [campo]: null })
      .eq('tecnico_id', id)

    fetchDatos()
  }

    const subir = async (tipo: 'poliza' | 'acta') => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/pdf'
    input.onchange = async (e: any) => {
      const file = e.target.files[0]
      if (!file || !id) {
        console.log('No se seleccionó archivo o no hay ID')
        return
      }

      console.log('Archivo seleccionado:', file.name, 'Tamaño:', file.size)

      try {
        console.log('Iniciando lectura del archivo...')
        
        // Usar FileReader para leer el archivo como ArrayBuffer
        const reader = new FileReader()
        
        reader.onload = async (event) => {
          const result = event.target?.result
          if (!result) {
            console.error('No se pudo leer el archivo')
            alert('Error al leer el archivo')
            return
          }
          
          console.log('Archivo leído, tipo:', typeof result)
          if (result instanceof ArrayBuffer) {
            console.log('Tamaño del ArrayBuffer:', result.byteLength)
            
            if (result.byteLength === 0) {
              alert('El archivo está vacío')
              return
            }
          } else {
            console.error('Resultado no es ArrayBuffer:', typeof result)
            alert('Error al procesar el archivo')
            return
          }

          const bucket = tipo === 'poliza' ? 'polizas' : 'actacompromiso'
          const path = `${id}/${tipo}.pdf`

          console.log('Subiendo archivo a:', bucket, path)

                    const { data: uploadData, error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(path, result, {
              contentType: 'application/pdf',
              upsert: true,
            })

          if (uploadError) {
            console.error('Error al subir archivo:', uploadError)
            alert(`Error subiendo archivo: ${uploadError.message}`)
            return
          }

          console.log('Archivo subido exitosamente:', uploadData)

          const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path)
          const campo = tipo === 'poliza' ? 'poliza_url' : 'acta_compromiso_url'
          
          const { error: upsertError } = await supabase.from('documentos_tecnicos').upsert([
            { tecnico_id: id, [campo]: pub?.publicUrl },
          ])

          if (upsertError) {
            console.error('Error al guardar URL en BD:', upsertError)
            alert('Error al guardar la URL del archivo')
            return
          }

          console.log('URL guardada en BD exitosamente')
          alert('Archivo subido exitosamente')
          fetchDatos()
        }
        
        reader.onerror = () => {
          console.error('Error al leer el archivo')
          alert('Error al leer el archivo')
        }
        
        reader.readAsArrayBuffer(file)
      } catch (error) {
        console.error('Error inesperado al subir archivo:', error)
        alert('Error inesperado al subir archivo')
      }
    }
    input.click()
  }

  return (
    <div style={styles.container}>
      {loading ? (
        <p>Cargando técnico...</p>
      ) : error ? (
        <div>
          <p style={{ color: 'red' }}>{error}</p>
          <button onClick={() => fetchDatos()}>Reintentar</button>
        </div>
      ) : tecnico ? (
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
          <div style={styles.buttonContainer}>
            <button 
              style={styles.uploadButton} 
              onClick={() => subir('poliza')}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#1d4ed8'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#1e40af'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              📄 Subir póliza
            </button>
            <button 
              style={styles.uploadButton} 
              onClick={() => subir('acta')}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#1d4ed8'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#1e40af'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              📄 Subir acta
            </button>
            <button 
              style={styles.downloadButton} 
              onClick={() => descargar('poliza')}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#047857'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#059669'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              ⬇️ Descargar póliza
            </button>
            <button 
              style={styles.downloadButton} 
              onClick={() => descargar('acta')}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#047857'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#059669'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              ⬇️ Descargar acta compromiso
            </button>
            <button 
              style={styles.deleteButton} 
              onClick={() => eliminar('poliza')}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#b91c1c'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#dc2626'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              🗑️ Eliminar póliza
            </button>
            <button 
              style={styles.deleteButton} 
              onClick={() => eliminar('acta')}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#b91c1c'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#dc2626'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              🗑️ Eliminar acta
            </button>
          </div>
        </>
      ) : (
        <p>No se encontró el técnico</p>
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
  buttonContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginTop: 16,
  },
  uploadButton: {
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    padding: '14px 20px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  downloadButton: {
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    padding: '14px 20px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '14px 20px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
}
