import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import './responsive.css'

export default function Inventario() {
  const navigate = useNavigate()
  const [herramientas, setHerramientas] = useState<any[]>([])
  const [vestimenta, setVestimenta] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const handleGoBack = () => {
    navigate('/mantenimiento')
  }

  useEffect(() => {
    void cargarInventario()
  }, [])

  const cargarInventario = async () => {
    setLoading(true)
    const { data: userData, error: errorUsuario } = await supabase.auth.getUser()
    if (errorUsuario || !userData?.user) {
      alert('Error: No se pudo obtener el usuario.')
      setLoading(false)
      return
    }

    const usuarioId = userData.user.id

    const { data: inventarioData, error } = await supabase
      .from('inventario')
      .select('*')
      .eq('usuario_id', usuarioId)

    if (error) {
      alert('Error: No se pudo cargar el inventario.')
      setLoading(false)
      return
    }

    const herramientasFiltradas = (inventarioData?.filter((item: any) => item.tipo === 'herramienta') || [])
    const vestimentaFiltrada = (inventarioData?.filter((item: any) => item.tipo === 'vestimenta') || [])

    setHerramientas(herramientasFiltradas)
    setVestimenta(vestimentaFiltrada)
    setLoading(false)
  }

  if (loading) return <div style={styles.loader as React.CSSProperties}>Cargando...</div>

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

      <h2 style={styles.titulo as React.CSSProperties}>Inventario Personal</h2>

      <h3 style={styles.subtitulo as React.CSSProperties}>Herramientas</h3>
      <div style={styles.lista as React.CSSProperties}>
        {herramientas.length === 0 ? (
          <div style={styles.vacio as React.CSSProperties}>No tenés herramientas asignadas.</div>
        ) : (
          herramientas.map((item) => (
            <div key={item.id} style={styles.cardHerramienta as React.CSSProperties}>
              <div style={styles.icono as React.CSSProperties}>🛠️</div>
              <div>
                <div style={styles.itemDescripcion as React.CSSProperties}>{item.descripcion}</div>
                <div style={styles.itemCantidad as React.CSSProperties}>Cantidad: {item.cantidad}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <h3 style={styles.subtitulo as React.CSSProperties}>Vestimenta</h3>
      <div style={styles.lista as React.CSSProperties}>
        {vestimenta.length === 0 ? (
          <div style={styles.vacio as React.CSSProperties}>No tenés vestimenta asignada.</div>
        ) : (
          vestimenta.map((item) => (
            <div key={item.id} style={styles.cardVestimenta as React.CSSProperties}>
              <div style={styles.icono as React.CSSProperties}>👕</div>
              <div>
                <div style={styles.itemDescripcion as React.CSSProperties}>{item.descripcion}</div>
                <div style={styles.itemCantidad as React.CSSProperties}>Cantidad: {item.cantidad}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    padding: 24,
    backgroundColor: '#fff',
  },
  loader: {
    padding: 24,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  logo: {
    width: 270,
    height: 90,
    objectFit: 'contain' as const,
    display: 'block',
    margin: '30px auto 20px',
  },
  subtitulo: {
    fontSize: 18,
    fontWeight: 600,
    marginTop: 20,
    marginBottom: 8,
    color: '#1e3a8a',
  },
  vacio: {
    fontSize: 14,
    color: '#666',
    paddingLeft: 8,
  },
  lista: {
    gap: 12,
    marginBottom: 20,
  },
  cardHerramienta: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    padding: 12,
    gap: 12,
    marginBottom: 8,
  },
  cardVestimenta: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    borderRadius: 10,
    padding: 12,
    gap: 12,
    marginBottom: 8,
  },
  icono: {
    fontSize: 28,
  },
  itemDescripcion: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemCantidad: {
    fontSize: 14,
    color: '#555',
  },
}
