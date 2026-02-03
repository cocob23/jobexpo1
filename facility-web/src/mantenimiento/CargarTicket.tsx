import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import './responsive.css'

export default function CargarTicket() {
  const navigate = useNavigate()
  const [descripcion, setDescripcion] = useState('')
  const [importe, setImporte] = useState('')
  const [imagen, setImagen] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleGoBack = () => {
    navigate('/mantenimiento')
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) setImagen(f)
  }

  const subirTicket = async () => {
    if (!descripcion || !imagen || !importe) {
      alert('Completá todos los campos.')
      return
    }

    const importeNum = parseInt(importe)
    if (isNaN(importeNum) || importeNum < 0) {
      alert('Importe inválido')
      return
    }

    setLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) throw new Error('Usuario no encontrado')

      const nombreArchivo = `${userId}/${Date.now()}-${imagen.name}`
      const { error: uploadError } = await supabase.storage.from('tickets').upload(nombreArchivo, imagen as any)
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('tickets').getPublicUrl(nombreArchivo)
      const urlImagen = urlData.publicUrl

      const { error: insertError } = await supabase.from('tickets').insert([
        {
          usuario_id: userId,
          descripcion,
          foto: urlImagen,
          fecha_reporte: new Date().toISOString(),
          estado: 'Pendiente',
          importe: importeNum,
        },
      ])

      if (insertError) throw insertError
      alert('Ticket cargado correctamente')
      navigate('/mantenimiento/tickets')
    } catch (err: any) {
      console.error(err)
      alert('Error: ' + (err.message || err))
    } finally {
      setLoading(false)
    }
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
      <h2 style={styles.titulo as React.CSSProperties}>Cargar Ticket</h2>

      <div style={styles.imagenSelector as React.CSSProperties}>
        <input type="file" accept="image/*" onChange={onFileChange} />
        {imagen ? <div style={{ marginTop: 8 }}>{imagen.name}</div> : <div style={{ color: '#666' }}>Seleccionar foto del ticket</div>}
      </div>

      <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción del ticket" style={styles.input as React.CSSProperties} />

      <input type="text" value={importe} onChange={(e) => setImporte(e.target.value)} placeholder="Importe del ticket (ej: 5000)" style={styles.input as React.CSSProperties} />

      <button onClick={subirTicket} disabled={loading} style={styles.boton as React.CSSProperties}>
        {loading ? 'Enviando...' : 'Enviar Ticket'}
      </button>
    </div>
  )
}

const styles = {
  container: { padding: 24, backgroundColor: '#fff' },
  titulo: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, marginTop: 30 },
  logo: { width: 270, height: 90, objectFit: 'contain' as const, display: 'block', margin: '30px auto 20px' },
  imagenSelector: { borderWidth: 1, borderStyle: 'solid' as const, borderColor: '#ccc', borderRadius: 12, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  imagenPreview: { width: '100%', height: '100%', borderRadius: 12 },
  imagenTexto: { color: '#666' },
  input: { borderWidth: 1, borderStyle: 'solid' as const, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 20, width: '100%' },
  boton: { backgroundColor: '#1e40af', padding: 14, borderRadius: 8, alignItems: 'center', color: '#fff', border: 'none', cursor: 'pointer' },
}
