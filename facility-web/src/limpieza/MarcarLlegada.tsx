import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

type Empresa = { id: string; nombre: string; alias: string | null }

export default function LimpiezaMarcarLlegada() {
  const [loading, setLoading] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  // Autocomplete de empresa
  const [term, setTerm] = useState('')
  const [suggestions, setSuggestions] = useState<Empresa[]>([])
  const [openSug, setOpenSug] = useState(false)
  const [selected, setSelected] = useState<Empresa | null>(null)
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => setCoords(null),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  // Buscar empresas por nombre/alias con debounce
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    if (!openSug) return
    debounceRef.current = window.setTimeout(async () => {
      const q = term.trim()
      if (q.length < 2) {
        setSuggestions([])
        return
      }
      const { data, error } = await supabase
        .from('empresas')
        .select('id,nombre,alias')
        .or(`nombre.ilike.%${q}%,alias.ilike.%${q}%`)
        .order('nombre', { ascending: true })
        .limit(15)
      if (error) {
        console.error('Empresas search error:', error)
        setSuggestions([])
      } else {
        setSuggestions(data || [])
      }
    }, 200) as unknown as number
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [term, openSug])

  const canSubmit = useMemo(() => !!selected, [selected])

  const onPick = (e: Empresa) => {
    setSelected(e)
    setTerm(e.nombre)
    setOpenSug(false)
  }

  const clearSelection = () => {
    setSelected(null)
    setTerm('')
    setSuggestions([])
    setOpenSug(true)
  }

  const marcarLlegada = async () => {
    setLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const usuarioId = sessionData?.session?.user?.id
      if (!usuarioId) throw new Error('Sesión no disponible')
      if (!selected) throw new Error('Seleccioná una empresa válida')

      const ahora = new Date()
      const fechaISO = ahora.toISOString()
      const hora = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}:${String(ahora.getSeconds()).padStart(2, '0')}`

      const { error } = await supabase
        .from('llegadas')
        .insert([
          {
            usuario_id: usuarioId,
            fecha: fechaISO,
            hora,
            latitud: coords?.lat ?? null,
            longitud: coords?.lng ?? null,
            // Guardamos el nombre de empresa en "lugar" para mantener compatibilidad con mobile
            lugar: selected.nombre,
          },
        ])

      if (error) throw error
      alert('Llegada marcada correctamente')
      setSelected(null)
      setTerm('')
      setSuggestions([])
      setOpenSug(false)
    } catch (e: any) {
      alert(e?.message || 'No se pudo marcar llegada')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h3>Marcar llegada</h3>
      <div className="card">
        <div className="row">
          <label style={{ width: '100%' }}>
            Empresa / Cliente
            <div className="autocomplete">
              <input
                value={term}
                onChange={(e) => { setTerm(e.target.value); setOpenSug(true); setSelected(null) }}
                onFocus={() => setOpenSug(true)}
                placeholder="Escribí el nombre y seleccioná…"
              />
              {!!selected && (
                <button type="button" className="btn" style={{ marginLeft: 8 }} onClick={clearSelection}>
                  Quitar selección
                </button>
              )}
            </div>
            {openSug && suggestions.length > 0 && (
              <ul className="suggestions">
                {suggestions.map((s) => (
                  <li key={s.id} className="suggestion-item" onClick={() => onPick(s)}>
                    <strong>{s.nombre}</strong>{s.alias ? <span className="muted"> · {s.alias}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </label>
        </div>
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
        <button className="btn" onClick={marcarLlegada} disabled={loading || !canSubmit}>
          {loading ? 'Marcando...' : 'Marcar llegada'}
        </button>
      </div>
    </div>
  )
}
