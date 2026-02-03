import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LimpiezaMarcarSalida() {
  const [loading, setLoading] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCoords(null),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  const marcarSalida = async () => {
    setLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const usuarioId = sessionData?.session?.user?.id
      if (!usuarioId) throw new Error('Sesión no disponible')

      // Buscar la última llegada pendiente de salida
      const { data: pendientes, error: selError } = await supabase
        .from('llegadas')
        .select('*')
        .eq('usuario_id', usuarioId)
        .is('salida_hora', null)
        .order('fecha', { ascending: false })
        .limit(1)

      if (selError) throw selError
      const llegada = pendientes?.[0]
      if (!llegada) throw new Error('No hay llegadas pendientes de salida')

      const ahora = new Date()
      const fechaISO = ahora.toISOString()
      const salidaHora = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}:${String(ahora.getSeconds()).padStart(2, '0')}`

      const { error: updError } = await supabase
        .from('llegadas')
        .update({
          salida_fecha: fechaISO,
          salida_hora: salidaHora,
          salida_latitud: coords?.lat ?? null,
          salida_longitud: coords?.lng ?? null,
        })
        .eq('id', llegada.id)
        .eq('usuario_id', usuarioId)

      if (updError) throw updError
      alert('Salida marcada correctamente')
    } catch (e: any) {
      alert(e?.message || 'No se pudo marcar salida')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h3>Marcar salida</h3>
      <div className="card">
        <div className="row">
          Coordenadas: {coords ? (
            <>
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}{' '}
              <a href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`} target="_blank" rel="noreferrer">Ver mapa</a>
            </>
          ) : '(No disponibles)'}
          <div style={{ marginTop: 8 }}>
            <button type="button" className="btn" onClick={() => navigator.geolocation && navigator.geolocation.getCurrentPosition(
              (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              () => setCoords(null),
              { enableHighAccuracy: true, timeout: 10000 }
            )}>Actualizar ubicación</button>
          </div>
        </div>
        <button className="btn" onClick={marcarSalida} disabled={loading}>
          {loading ? 'Marcando...' : 'Marcar salida'}
        </button>
      </div>
    </div>
  )
}
