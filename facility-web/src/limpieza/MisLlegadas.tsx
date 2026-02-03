import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LimpiezaMisLlegadas() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const { data: sessionData } = await supabase.auth.getSession()
      const usuarioId = sessionData?.session?.user?.id
      if (!usuarioId) {
        setRows([])
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('llegadas')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('fecha', { ascending: false })
      if (error) {
        console.error(error)
        setRows([])
      } else {
        setRows(data || [])
      }
      setLoading(false)
    })()
  }, [])

  const durationMin = (l: any): number | null => {
    const fIn = l?.fecha
    const hIn = l?.hora
    const fOut = l?.salida_fecha
    const hOut = l?.salida_hora
    if (!fIn || !hIn || !fOut || !hOut) return null
    try {
      const inDate = new Date(String(fIn).split('T')[0] + 'T' + hIn)
      const outDate = new Date(String(fOut).split('T')[0] + 'T' + hOut)
      const diff = outDate.getTime() - inDate.getTime()
      if (!Number.isFinite(diff)) return null
      const mins = Math.round(diff / 60000)
      return mins < 0 ? null : mins
    } catch {
      return null
    }
  }

  if (loading) return <div>Cargando...</div>
  if (rows.length === 0) return <div>No tenés llegadas registradas.</div>

  return (
    <div>
      <h3>Mis llegadas</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {rows.map((item) => {
          const fechaIn = (item.fecha || '').toString().split('T')[0]
          const fechaOut = (item.salida_fecha || '').toString().split('T')[0]
          const dur = durationMin(item)
          const latIn = item?.latitud
          const lngIn = item?.longitud
          const latOut = item?.salida_latitud
          const lngOut = item?.salida_longitud
          return (
            <li key={item.id} className="card">
              <div className="row">
                <div><strong>📍</strong> {item.lugar || 'Sin lugar'}</div>
                <div><strong>🕒</strong> {item.hora} — <strong>📅</strong> {fechaIn}</div>
                {dur != null && (<div className="badge">Duración: {dur} min</div>)}
                {latIn && lngIn ? (
                  <div className="muted">
                    {Number(latIn).toFixed(5)}, {Number(lngIn).toFixed(5)}{' '}
                    <a href={`https://www.google.com/maps?q=${latIn},${lngIn}`} target="_blank" rel="noreferrer">Ver mapa</a>
                  </div>
                ) : (
                  <div className="muted">(Sin coordenadas)</div>
                )}
              </div>

              <div className="divider" />
              <div>
                <strong>Salida</strong>
                {item?.salida_hora ? (
                  <>
                    <div><strong>🕒</strong> {item.salida_hora} — <strong>📅</strong> {fechaOut}</div>
                    {latOut && lngOut ? (
                      <div className="muted">
                        {Number(latOut).toFixed(5)}, {Number(lngOut).toFixed(5)}{' '}
                        <a href={`https://www.google.com/maps?q=${latOut},${lngOut}`} target="_blank" rel="noreferrer">Ver mapa</a>
                      </div>
                    ) : (
                      <div className="muted">(Sin coordenadas de salida)</div>
                    )}
                  </>
                ) : (
                  <div className="error">Pendiente de salida</div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
