import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Tarea = {
  id: string
  empresa: string
  sucursal: string
  provincia: string
  localidad: string
  direccion: string
  fecha_realizacion: string
  descripcion: string
  estado: string
  comentarios: string
  checklist: { texto: string; hecho: boolean }[]
  parte_pdf: string | null
  usuarios?: {
    nombre: string
    apellido: string
  }
}

export default function DetalleTareaFM() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tarea, setTarea] = useState<Tarea | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) obtenerTarea()
  }, [id])

  const obtenerTarea = async () => {
    if (!id) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('trabajos_mantenimiento')
        .select(`
          *,
          usuarios:usuario_id (
            nombre,
            apellido
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error al obtener tarea:', error)
        setError('No se pudo obtener la tarea')
      } else {
        setTarea(data)
      }
    } catch (err) {
      console.error('Error inesperado:', err)
      setError('Error inesperado al cargar la tarea')
    } finally {
      setLoading(false)
    }
  }

  const generarPDF = async () => {
    if (!tarea) return

    try {
      const hoy = new Date()
      const fecha = `${hoy.getDate()}/${hoy.getMonth() + 1}/${hoy.getFullYear()}`

      const html = `<html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; }
            .header { display: flex; justify-content: space-between; align-items: center; border: 1px solid #000; padding: 8px; }
            .logo { width: 150px; }
            .section-title { background-color: #4682B4; color: white; padding: 4px; font-weight: bold; font-size: 12px; }
            .info-row { display: flex; border-bottom: 1px solid #000; }
            .info-cell { flex: 1; padding: 6px; border-right: 1px solid #000; }
            .checklist { margin-top: 8px; }
          </style>
        </head>
        <body>
          <div class="header">
            <img class="logo" src="https://lknfaxkigownvjsijzhb.supabase.co/storage/v1/object/public/publicos//facilitylogo.png" />
            <div style="font-size: 10px; text-align: right;">
              <div><strong>Fecha:</strong> ${fecha}</div>
            </div>
          </div>

          <div class="section-title">Información General</div>
          <div class="info-row">
            <div class="info-cell"><strong>Empresa:</strong> ${tarea.empresa}</div>
            <div class="info-cell"><strong>Sucursal:</strong> ${tarea.sucursal}</div>
          </div>
          <div class="info-row">
            <div class="info-cell"><strong>Provincia:</strong> ${tarea.provincia}</div>
            <div class="info-cell"><strong>Localidad:</strong> ${tarea.localidad}</div>
          </div>
          <div class="info-row">
            <div class="info-cell"><strong>Dirección:</strong> ${tarea.direccion}</div>
            <div class="info-cell"><strong>Técnico:</strong> ${tarea.usuarios?.nombre || '-'} ${tarea.usuarios?.apellido || ''}</div>
          </div>

          <div class="section-title">Descripción</div>
          <div class="info-row">
            <div class="info-cell" style="flex: 2;">${tarea.descripcion}</div>
          </div>

          <div class="section-title">Comentarios</div>
          <div class="info-row">
            <div class="info-cell" style="flex: 2;">${tarea.comentarios || 'Sin comentarios'}</div>
          </div>

          <div class="section-title">Checklist</div>
          <div class="info-row">
            <div class="info-cell" style="flex: 2;">
              <ul class="checklist">
                ${tarea.checklist?.map(i => `<li>[${i.hecho ? 'x' : ' '}] ${i.texto}</li>`).join('') || 'Sin checklist'}
              </ul>
            </div>
          </div>
        </body>
      </html>`

      // Crear blob del HTML
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)

      // Abrir en nueva ventana para imprimir
      const printWindow = window.open(url, '_blank')
      if (printWindow) {
        printWindow.print()
      }

      // Limpiar URL
      URL.revokeObjectURL(url)

      alert('PDF generado exitosamente')
    } catch (err: any) {
      console.error('Error al generar PDF:', err)
      alert('Error al generar PDF: ' + err.message)
    }
  }

  const descargarPDF = async () => {
    if (!tarea?.parte_pdf) {
      alert('No hay PDF disponible para descargar')
      return
    }

    try {
      // Crear un enlace temporal para descargar
      const link = document.createElement('a')
      link.href = tarea.parte_pdf
      link.download = `parte_tecnico_${tarea.id}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error al descargar PDF:', error)
      alert('Error al descargar el PDF')
    }
  }

  if (loading) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.logoTopContainer}>
          <img src="/logo.png" alt="Facility Argentina" style={styles.logoTop} />
        </div>
        <div style={styles.container}>
          <p>Cargando tarea...</p>
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
          <button onClick={obtenerTarea} style={styles.boton}>
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
          <button onClick={() => navigate('/fm/ver-tareas')} style={styles.botonVolver}>
            ← Volver
          </button>
          <h1 style={styles.titulo}>Detalle de la Tarea</h1>
        </div>

        {tarea && (
          <div style={styles.contenido}>
            <div style={styles.seccion}>
              <h2 style={styles.seccionTitulo}>Información General</h2>
              
              <div style={styles.campo}>
                <label style={styles.label}>Empresa:</label>
                <span style={styles.texto}>{tarea.empresa}</span>
              </div>

              <div style={styles.campo}>
                <label style={styles.label}>Asignado a:</label>
                <span style={styles.texto}>
                  {tarea.usuarios?.nombre} {tarea.usuarios?.apellido}
                </span>
              </div>

              <div style={styles.campo}>
                <label style={styles.label}>Sucursal:</label>
                <span style={styles.texto}>{tarea.sucursal}</span>
              </div>

              <div style={styles.campo}>
                <label style={styles.label}>Provincia:</label>
                <span style={styles.texto}>{tarea.provincia}</span>
              </div>

              <div style={styles.campo}>
                <label style={styles.label}>Localidad:</label>
                <span style={styles.texto}>{tarea.localidad}</span>
              </div>

              <div style={styles.campo}>
                <label style={styles.label}>Dirección:</label>
                <span style={styles.texto}>{tarea.direccion}</span>
              </div>

              <div style={styles.campo}>
                <label style={styles.label}>Fecha y hora de realización:</label>
                <span style={styles.texto}>
                  {new Date(tarea.fecha_realizacion).toLocaleString('es-AR')}
                </span>
              </div>
            </div>

            <div style={styles.seccion}>
              <h2 style={styles.seccionTitulo}>Detalles del Trabajo</h2>
              
              <div style={styles.campo}>
                <label style={styles.label}>Descripción:</label>
                <span style={styles.texto}>{tarea.descripcion}</span>
              </div>

              <div style={styles.campo}>
                <label style={styles.label}>Estado:</label>
                <span style={styles.texto}>{tarea.estado}</span>
              </div>

              <div style={styles.campo}>
                <label style={styles.label}>Comentarios:</label>
                <span style={styles.texto}>{tarea.comentarios || 'Sin comentarios'}</span>
              </div>
            </div>

            <div style={styles.seccion}>
              <h2 style={styles.seccionTitulo}>Checklist</h2>
              {tarea.checklist && tarea.checklist.length > 0 ? (
                <div style={styles.checklistContainer}>
                  {tarea.checklist.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        ...styles.itemChecklist,
                        ...(item.hecho ? styles.itemChecklistHecho : styles.itemChecklistPendiente),
                      }}
                    >
                      <span style={styles.checklistIcon}>
                        {item.hecho ? '✅' : '⏳'}
                      </span>
                      <span style={styles.textoChecklist}>{item.texto}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={styles.texto}>Sin checklist definido</span>
              )}
            </div>

            <div style={styles.botonesContainer}>
              <button onClick={generarPDF} style={styles.boton}>
                📄 Generar parte técnico
              </button>

              {tarea.parte_pdf && (
                <button onClick={descargarPDF} style={styles.botonSecundario}>
                  ⬇️ Descargar parte técnico
                </button>
              )}
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
    maxWidth: '800px',
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
  seccion: {
    marginBottom: '2rem',
  },
  seccionTitulo: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#1e40af',
    marginBottom: '1rem',
    paddingBottom: '0.5rem',
    borderBottom: '2px solid #e2e8f0',
  },
  campo: {
    display: 'flex',
    marginBottom: '1rem',
    alignItems: 'flex-start',
  },
  label: {
    fontWeight: 600,
    color: '#374151',
    minWidth: '200px',
    fontSize: '1rem',
  },
  texto: {
    fontSize: '1rem',
    color: '#1f2937',
    flex: 1,
  },
  checklistContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  itemChecklist: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    borderRadius: '8px',
    border: '2px solid',
    gap: '12px',
  },
  itemChecklistHecho: {
    borderColor: '#22c55e',
    backgroundColor: '#dcfce7',
  },
  itemChecklistPendiente: {
    borderColor: '#ef4444',
    backgroundColor: '#fee2e2',
  },
  checklistIcon: {
    fontSize: '1.2rem',
  },
  textoChecklist: {
    fontSize: '1rem',
    color: '#111',
    flex: 1,
  },
  botonesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginTop: '2rem',
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
  botonSecundario: {
    backgroundColor: 'white',
    color: '#1e40af',
    border: '2px solid #1e40af',
    padding: '16px 24px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
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
