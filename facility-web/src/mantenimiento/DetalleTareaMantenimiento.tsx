import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate, useSearchParams } from 'react-router-dom'
import SignatureCanvas from 'react-signature-canvas'
import jsPDF from 'jspdf'
import './responsive.css'

type Tarea = {
  id: string
  empresa: string
  sucursal?: string
  provincia?: string
  localidad?: string
  direccion?: string
  descripcion?: string
  estado?: string
  fecha_realizacion?: string
  comentarios?: string
  checklist?: { texto: string; hecho: boolean }[]
  parte_pdf?: string
  fm_id?: string
  usuario_id?: string
  asignador?: { nombre: string; apellido: string }
  tecnico?: { nombre: string; apellido: string }
}

export default function DetalleTareaMantenimiento() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id')

  const [tarea, setTarea] = useState<Tarea | null>(null)
  const [checklist, setChecklist] = useState<{ texto: string; hecho: boolean }[]>([])
  const [cargando, setCargando] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [mostrarFirma, setMostrarFirma] = useState<null | 'tecnico' | 'responsable'>(null)
  const [firmaResponsable, setFirmaResponsable] = useState<string | null>(null)
  const [firmaTecnico, setFirmaTecnico] = useState<string | null>(null)
  const [refrescando, setRefrescando] = useState(false)

  const sigPadRef = useRef<SignatureCanvas>(null)

  useEffect(() => {
    if (id) {
      obtenerTarea()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const obtenerTarea = async () => {
    if (!id) return
    setRefrescando(true)
    try {
      const { data, error } = await supabase
        .from('trabajos_mantenimiento')
        .select('*, asignador:fm_id(nombre, apellido), tecnico:usuario_id(nombre, apellido)')
        .eq('id', id)
        .single()

      if (error) {
        alert('Error: No se pudo obtener la tarea')
        console.error(error)
      } else {
        setTarea(data)
        setPdfUrl(data.parte_pdf || null)
        setChecklist(data.checklist || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setRefrescando(false)
    }
  }

  const toggleChecklist = async (index: number) => {
    const nuevoChecklist = [...checklist]
    nuevoChecklist[index].hecho = !nuevoChecklist[index].hecho
    setChecklist(nuevoChecklist)
    await supabase.from('trabajos_mantenimiento').update({ checklist: nuevoChecklist }).eq('id', id)
  }

  const marcarComoRealizado = () => {
    if (!checklist.every((i) => i.hecho)) {
      alert('Checklist incompleta: Debés completar todos los ítems para continuar')
      return
    }
    if (window.confirm('¿Estás seguro de que esta tarea está realizada?')) {
      realizarTarea()
    }
  }

  const realizarTarea = async () => {
    const { error } = await supabase
      .from('trabajos_mantenimiento')
      .update({ estado: 'Realizado' })
      .eq('id', id)
    
    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('Tarea marcada como realizada')
      obtenerTarea()
    }
  }

  const guardarFirma = () => {
    if (!sigPadRef.current) return
    if (sigPadRef.current.isEmpty()) {
      alert('La firma está vacía')
      return
    }

    const dataURL = sigPadRef.current.toDataURL()
    
    if (mostrarFirma === 'tecnico') {
      setFirmaTecnico(dataURL)
    } else if (mostrarFirma === 'responsable') {
      setFirmaResponsable(dataURL)
    }
    
    setMostrarFirma(null)
  }

  const limpiarFirma = () => {
    sigPadRef.current?.clear()
  }

  const generarPDF = async () => {
    if (!tarea) return
    setCargando(true)
    
    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 10
      let yPos = 10

      // Cargar logo
      const logoUrl = 'https://lknfaxkigownvjsijzhb.supabase.co/storage/v1/object/public/publicos/facilitylogo.png'
      let logoBase64 = ''
      
      try {
        const logoImg = await fetch(logoUrl)
        const logoBlob = await logoImg.blob()
        logoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(logoBlob)
        })
      } catch (err) {
        console.error('Error cargando logo:', err)
      }

      // Header con logo y fecha
      let logoDrawnHeight = 0
      if (logoBase64) {
        // Preservar aspecto del logo: calcular alto según naturalWidth/Height
        const imgEl = new Image()
        const targetWidth = 55 // mm
        await new Promise<void>((resolve) => {
          imgEl.onload = () => {
            try {
              const ratio = imgEl.naturalHeight && imgEl.naturalWidth
                ? imgEl.naturalHeight / imgEl.naturalWidth
                : (23 / 55) // fallback
              const targetHeight = +(targetWidth * ratio).toFixed(2)
              logoDrawnHeight = targetHeight
              doc.addImage(logoBase64, 'PNG', margin, yPos, targetWidth, targetHeight)
            } catch {
              logoDrawnHeight = 23
              doc.addImage(logoBase64, 'PNG', margin, yPos, 55, 23)
            }
            resolve()
          }
          imgEl.src = logoBase64
        })
      }
      
      // Fecha en la esquina derecha
      const hoy = new Date()
      const fecha = `${hoy.getDate()}/${hoy.getMonth() + 1}/${hoy.getFullYear()}`
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('Fecha:', pageWidth - margin - 25, yPos + 5)
      doc.setFont('helvetica', 'normal')
      doc.text(fecha, pageWidth - margin - 25, yPos + 10)
      
  // Avanzar por debajo del logo + margen de seguridad
  yPos += Math.max(logoDrawnHeight, 23) + 8

      // Sección: Información General
      doc.setFillColor(70, 130, 180) // #4682B4
      doc.rect(margin, yPos, pageWidth - 2 * margin, 7, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Información General', margin + 2, yPos + 5)
      yPos += 7

      // Resetear color de texto
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')

      // Tabla de información - Fila 1: Empresa | Sucursal
      const colWidth = (pageWidth - 2 * margin) / 2
      doc.rect(margin, yPos, colWidth, 7, 'S')
      doc.rect(margin + colWidth, yPos, colWidth, 7, 'S')
      doc.setFont('helvetica', 'bold')
      doc.text('Empresa:', margin + 2, yPos + 5)
      doc.setFont('helvetica', 'normal')
      doc.text(tarea.empresa || '', margin + 22, yPos + 5)
      doc.setFont('helvetica', 'bold')
      doc.text('Sucursal:', margin + colWidth + 2, yPos + 5)
      doc.setFont('helvetica', 'normal')
      doc.text(tarea.sucursal || '', margin + colWidth + 22, yPos + 5)
      yPos += 7

      // Fila 2: Provincia | Localidad
      doc.rect(margin, yPos, colWidth, 7, 'S')
      doc.rect(margin + colWidth, yPos, colWidth, 7, 'S')
      doc.setFont('helvetica', 'bold')
      doc.text('Provincia:', margin + 2, yPos + 5)
      doc.setFont('helvetica', 'normal')
      doc.text(tarea.provincia || '', margin + 22, yPos + 5)
      doc.setFont('helvetica', 'bold')
      doc.text('Localidad:', margin + colWidth + 2, yPos + 5)
      doc.setFont('helvetica', 'normal')
      doc.text(tarea.localidad || '', margin + colWidth + 22, yPos + 5)
      yPos += 7

      // Fila 3: Dirección | Técnico
      doc.rect(margin, yPos, colWidth, 7, 'S')
      doc.rect(margin + colWidth, yPos, colWidth, 7, 'S')
      doc.setFont('helvetica', 'bold')
      doc.text('Dirección:', margin + 2, yPos + 5)
      doc.setFont('helvetica', 'normal')
      const direccionText = doc.splitTextToSize(tarea.direccion || '', colWidth - 24)
      doc.text(direccionText[0] || '', margin + 22, yPos + 5)
      doc.setFont('helvetica', 'bold')
      doc.text('Técnico:', margin + colWidth + 2, yPos + 5)
      doc.setFont('helvetica', 'normal')
      const nombreTecnico = `${tarea.tecnico?.nombre || ''} ${tarea.tecnico?.apellido || ''}`
      doc.text(nombreTecnico, margin + colWidth + 22, yPos + 5)
      yPos += 10

      // Sección: Descripción
      doc.setFillColor(70, 130, 180)
      doc.rect(margin, yPos, pageWidth - 2 * margin, 7, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.text('Descripción', margin + 2, yPos + 5)
      yPos += 7

      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      const descripcionLines = doc.splitTextToSize(tarea.descripcion || '', pageWidth - 2 * margin - 4)
      const descripcionHeight = Math.max(15, descripcionLines.length * 5)
      doc.rect(margin, yPos, pageWidth - 2 * margin, descripcionHeight, 'S')
      doc.text(descripcionLines, margin + 2, yPos + 4)
      yPos += descripcionHeight + 3

      // Sección: Comentarios
      doc.setFillColor(70, 130, 180)
      doc.rect(margin, yPos, pageWidth - 2 * margin, 7, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.text('Comentarios', margin + 2, yPos + 5)
      yPos += 7

      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      const comentariosLines = doc.splitTextToSize(tarea.comentarios || 'Sin comentarios', pageWidth - 2 * margin - 4)
      const comentariosHeight = Math.max(15, comentariosLines.length * 5)
      doc.rect(margin, yPos, pageWidth - 2 * margin, comentariosHeight, 'S')
      doc.text(comentariosLines, margin + 2, yPos + 4)
      yPos += comentariosHeight + 3

      // Sección: Checklist
      doc.setFillColor(70, 130, 180)
      doc.rect(margin, yPos, pageWidth - 2 * margin, 7, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.text('Checklist', margin + 2, yPos + 5)
      yPos += 7

      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      
      if (checklist && checklist.length > 0) {
        const checklistHeight = checklist.length * 6 + 5
        doc.rect(margin, yPos, pageWidth - 2 * margin, checklistHeight, 'S')
        let checkYPos = yPos + 5
        checklist.forEach((item) => {
          doc.text(`[${item.hecho ? 'x' : ' '}] ${item.texto}`, margin + 5, checkYPos)
          checkYPos += 6
        })
        yPos += checklistHeight + 8
      } else {
        doc.rect(margin, yPos, pageWidth - 2 * margin, 10, 'S')
        doc.text('Sin checklist', margin + 2, yPos + 6)
        yPos += 18
      }

      // Sección de Firmas (Técnico y Responsable) - igual al layout deseado
      // Asegurar espacio suficiente; si no, nueva página
      const firmasBlockHeight = 40
      if (yPos + firmasBlockHeight + 10 > pageHeight) {
        doc.addPage()
        yPos = 20
      }

      const firmaWidth = (pageWidth - 2 * margin) / 2

      // Caja Firma Técnico
      doc.rect(margin, yPos, firmaWidth, firmasBlockHeight, 'S')
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('Firma Técnico', margin + firmaWidth / 2, yPos + 6, { align: 'center' })
      if (firmaTecnico) {
        try {
          doc.addImage(firmaTecnico, 'PNG', margin + 5, yPos + 8, firmaWidth - 10, firmasBlockHeight - 14)
        } catch (e) {
          console.warn('No se pudo agregar firma del técnico:', e)
        }
      }

      // Caja Firma Responsable
      doc.rect(margin + firmaWidth, yPos, firmaWidth, firmasBlockHeight, 'S')
      doc.text('Firma Responsable', margin + firmaWidth + firmaWidth / 2, yPos + 6, { align: 'center' })
      if (firmaResponsable) {
        try {
          doc.addImage(firmaResponsable, 'PNG', margin + firmaWidth + 5, yPos + 8, firmaWidth - 10, firmasBlockHeight - 14)
        } catch (e) {
          console.warn('No se pudo agregar firma del responsable:', e)
        }
      }

      // Guardar PDF y subir a Supabase
      const pdfBlob = doc.output('blob')
      const nombreArchivo = `parte_tecnico_${id}_${Date.now()}.pdf`
      const bucket = 'partestecnicos'
      const path = `pdfs/${nombreArchivo}`

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path)
      const url = publicUrlData.publicUrl

      const { error: updateError } = await supabase
        .from('trabajos_mantenimiento')
        .update({ parte_pdf: url })
        .eq('id', id)

      if (updateError) throw updateError

      alert('PDF generado y guardado exitosamente')
      setPdfUrl(url)
      obtenerTarea()
    } catch (err: any) {
      console.error('Error al generar PDF:', err)
      alert('Error al generar PDF: ' + err.message)
    } finally {
      setCargando(false)
    }
  }

  const descargarPDF = () => {
    if (!pdfUrl) return
    window.open(pdfUrl, '_blank')
  }

  const handleGoBack = () => {
    navigate('/mantenimiento')
  }

  if (!tarea && !refrescando) {
    return (
      <div style={styles.container as React.CSSProperties}>
        <p>Cargando tarea...</p>
      </div>
    )
  }

  return (
    <div style={styles.container as React.CSSProperties}>
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
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        ← Volver
      </button>

      <img src="/logo.png" alt="logo" style={styles.logo as React.CSSProperties} />
      <h2 style={styles.titulo as React.CSSProperties}>Detalle de la Tarea</h2>

      {tarea && (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={styles.infoSection as React.CSSProperties}>
            <div style={styles.label as React.CSSProperties}>Empresa:</div>
            <div style={styles.texto as React.CSSProperties}>{tarea.empresa}</div>

            <div style={styles.label as React.CSSProperties}>Sucursal:</div>
            <div style={styles.texto as React.CSSProperties}>{tarea.sucursal}</div>

            <div style={styles.label as React.CSSProperties}>Provincia:</div>
            <div style={styles.texto as React.CSSProperties}>{tarea.provincia}</div>

            <div style={styles.label as React.CSSProperties}>Localidad:</div>
            <div style={styles.texto as React.CSSProperties}>{tarea.localidad}</div>

            <div style={styles.label as React.CSSProperties}>Dirección:</div>
            <div style={styles.texto as React.CSSProperties}>{tarea.direccion}</div>

            <div style={styles.label as React.CSSProperties}>Fecha y hora de realización:</div>
            <div style={styles.texto as React.CSSProperties}>
              {tarea.fecha_realizacion && new Date(tarea.fecha_realizacion).toLocaleString('es-AR')}
            </div>

            <div style={styles.label as React.CSSProperties}>Asignado por:</div>
            <div style={styles.texto as React.CSSProperties}>
              {tarea.asignador
                ? `${tarea.asignador.nombre} ${tarea.asignador.apellido}`
                : 'No especificado'}
            </div>

            <div style={styles.label as React.CSSProperties}>Descripción:</div>
            <div style={styles.texto as React.CSSProperties}>{tarea.descripcion}</div>

            <div style={styles.label as React.CSSProperties}>Estado:</div>
            <div style={{
              ...styles.texto as React.CSSProperties,
              fontWeight: 600,
              color: tarea.estado === 'Realizado' ? '#16a34a' : '#dc2626'
            }}>
              {tarea.estado}
            </div>

            <div style={styles.label as React.CSSProperties}>Comentarios:</div>
            <div style={styles.texto as React.CSSProperties}>{tarea.comentarios || 'Sin comentarios'}</div>
          </div>

          {/* Checklist */}
          <div style={{ marginTop: 24 }}>
            <div style={styles.label as React.CSSProperties}>Checklist:</div>
            {checklist.map((item, index) => (
              <div
                key={index}
                style={{
                  ...styles.itemChecklist as React.CSSProperties,
                  backgroundColor: item.hecho ? '#22c55e' : '#fff',
                  color: item.hecho ? '#fff' : '#000',
                  cursor: 'pointer'
                }}
                onClick={() => toggleChecklist(index)}
              >
                {item.texto}
              </div>
            ))}
          </div>

          {/* Botones de firma */}
          <div style={{ marginTop: 24 }}>
            {!firmaTecnico && (
              <button
                style={styles.botonSecundario as React.CSSProperties}
                onClick={() => setMostrarFirma('tecnico')}
              >
                Firmar como técnico
              </button>
            )}

            {!firmaResponsable && (
              <button
                style={styles.botonSecundario as React.CSSProperties}
                onClick={() => setMostrarFirma('responsable')}
              >
                Firmar por responsable
              </button>
            )}

            <button
              style={styles.botonSecundario as React.CSSProperties}
              onClick={generarPDF}
              disabled={cargando}
            >
              {cargando ? 'Generando...' : 'Generar parte técnico'}
            </button>

            {pdfUrl && (
              <button
                style={styles.botonSecundario as React.CSSProperties}
                onClick={descargarPDF}
              >
                Descargar parte técnico
              </button>
            )}

            <button
              style={styles.botonPrincipal as React.CSSProperties}
              onClick={marcarComoRealizado}
            >
              Marcar como realizado
            </button>
          </div>
        </div>
      )}

      {/* Modal de firma */}
      {mostrarFirma && (
        <div style={styles.modalOverlay as React.CSSProperties}>
          <div style={styles.modalContent as React.CSSProperties}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>
                {mostrarFirma === 'tecnico' ? 'Firma del Técnico' : 'Firma del Responsable'}
              </h3>
              <button
                onClick={() => setMostrarFirma(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  padding: 4
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ border: '1px solid #ccc', borderRadius: 8 }}>
              <SignatureCanvas
                ref={sigPadRef}
                canvasProps={{
                  width: 500,
                  height: 300,
                  style: { width: '100%', height: '300px' }
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button
                onClick={limpiarFirma}
                style={{
                  ...styles.botonSecundario as React.CSSProperties,
                  flex: 1
                }}
              >
                Limpiar
              </button>
              <button
                onClick={guardarFirma}
                style={{
                  ...styles.botonPrincipal as React.CSSProperties,
                  flex: 1
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    padding: 24,
    backgroundColor: '#fff',
    minHeight: '100vh'
  },
  logo: {
    width: 270,
    height: 90,
    objectFit: 'contain' as const,
    display: 'block',
    margin: '8px auto 16px'
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 8,
    textAlign: 'center' as const
  },
  infoSection: {
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20
  },
  label: {
    fontWeight: 'bold',
    marginTop: 10,
    fontSize: 14,
    color: '#475569'
  },
  texto: {
    fontSize: 16,
    marginBottom: 10,
    color: '#0f172a'
  },
  itemChecklist: {
    padding: 10,
    border: '1px solid #ccc',
    borderRadius: 8,
    marginTop: 8,
    transition: 'all 0.2s'
  },
  botonPrincipal: {
    backgroundColor: '#2563EB',
    color: '#fff',
    padding: 14,
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 12,
    width: '100%'
  },
  botonSecundario: {
    borderColor: '#2563EB',
    border: '1px solid #2563EB',
    backgroundColor: '#fff',
    color: '#2563EB',
    padding: 12,
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 12,
    width: '100%'
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    maxWidth: 600,
    width: '90%'
  }
}
