import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Estado = 'cotizado' | 'aprobado' | 'cerrado' | 'facturado' | 'desestimado'

type Usuario = {
  id: string
  nombre: string | null
  apellido: string | null
  email: string | null
}

type Cotizacion = {
  id: string
  numero: number
  cliente: string
  descripcion: string | null
  monto: number | null
  fecha: string | null
  estado: Estado
  archivo_path: string | null
  archivo_mimetype: string | null
  creado_en: string
  subida_por: string
  usuarios?: Usuario | null
}

export default function CotizacionesSuperadmin() {
  const navigate = useNavigate()

  const [cargando, setCargando] = useState(false)
  const [listado, setListado] = useState<Cotizacion[]>([])

  // filtros
  const [qId, setQId] = useState('')
  const [fmId, setFmId] = useState<string>('')
  const [clienteQ, setClienteQ] = useState('')
  const [estado, setEstado] = useState<Estado | ''>('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const [fms, setFms] = useState<Usuario[]>([])

  const estados: Estado[] = useMemo(
    () => ['cotizado', 'aprobado', 'cerrado', 'facturado', 'desestimado'],
    []
  )

  const isUUID = (s: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s.trim())
  const parseNumero = (s: string) => {
    const raw = s.trim().replace(/^#/, '')
    const n = parseInt(raw, 10)
    return Number.isFinite(n) ? n : null
  }

  useEffect(() => {
    cargarFMs()
    cargarListado()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cargarFMs = async () => {
    const { data } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, email')
      .eq('rol', 'fm')
      .order('apellido', { ascending: true })
    setFms(data || [])
  }

  const cargarListado = async () => {
    setCargando(true)

    let q = supabase
      .from('cotizaciones')
      .select(`
        id, numero, cliente, descripcion, monto, fecha, estado,
        archivo_path, archivo_mimetype, creado_en, subida_por,
        usuarios:subida_por ( id, nombre, apellido, email )
      `)
      .order('numero', { ascending: false })

    if (qId.trim()) {
      if (isUUID(qId)) {
        q = q.eq('id', qId.trim())
      } else {
        const n = parseNumero(qId)
        if (n !== null) q = q.eq('numero', n)
      }
    }

    if (fmId) q = q.eq('subida_por', fmId)
    if (clienteQ) q = q.ilike('cliente', `%${clienteQ}%`)
    if (estado) q = q.eq('estado', estado)
    if (desde) q = q.gte('fecha', desde)
    if (hasta) q = q.lte('fecha', hasta)

    const { data, error } = await q
    if (!error && data) setListado(data as unknown as Cotizacion[])
    setCargando(false)
  }

  const verArchivo = async (row: Cotizacion) => {
    if (!row.archivo_path) return alert('No hay archivo')
    const { data, error } = await supabase.storage.from('cotizaciones').createSignedUrl(row.archivo_path, 3600)
    if (error || !data?.signedUrl) return alert('No se pudo obtener el archivo')
    window.open(data.signedUrl, '_blank')
  }

  const actualizarEstado = async (id: string, nuevo: Estado) => {
    const prev = listado.slice()
    setListado((x) => x.map((r) => (r.id === id ? { ...r, estado: nuevo } : r)))

    const { error } = await supabase.from('cotizaciones').update({ estado: nuevo }).eq('id', id)
    if (error) {
      alert('No se pudo actualizar el estado: ' + error.message)
      setListado(prev)
    }
  }

  const nombreFM = (u?: Usuario | null) =>
    u ? `${u.apellido ?? ''} ${u.nombre ?? ''}`.trim() || u.email || '—' : '—'

  const onKeyDownBuscar = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') cargarListado()
  }

  return (
    <div style={styles.wrap}>
      {/* Botón volver y título */}
      <div style={styles.headerRow}>
        <button onClick={() => navigate('/superadmin')} style={styles.btnBack}>
          ← Volver
        </button>
        <h2 style={styles.title}>Gestionar Cotizaciones (Superadmin)</h2>
      </div>

      {/* Filtros */}
      <div style={styles.filtros}>
        <input
          placeholder="N° o UUID…"
          value={qId}
          onChange={(e) => setQId(e.target.value)}
          onKeyDown={onKeyDownBuscar}
          style={styles.input}
        />

        <select value={fmId} onChange={(e) => setFmId(e.target.value)} style={styles.input}>
          <option value="">Todos los FM</option>
          {fms.map((u) => (
            <option key={u.id} value={u.id}>
              {nombreFM(u)}
            </option>
          ))}
        </select>

        <input
          placeholder="Cliente…"
          value={clienteQ}
          onChange={(e) => setClienteQ(e.target.value)}
          onKeyDown={onKeyDownBuscar}
          style={styles.input}
        />

        <select value={estado} onChange={(e) => setEstado((e.target.value as Estado) || '')} style={styles.input}>
          <option value="">Todos los estados</option>
          {estados.map((es) => (
            <option key={es} value={es}>
              {es}
            </option>
          ))}
        </select>

        <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={styles.input} />
        <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={styles.input} />
        <button onClick={cargarListado} disabled={cargando} style={styles.btn}>
          {cargando ? 'Cargando…' : 'Aplicar filtros'}
        </button>
      </div>

      {/* Tabla */}
      <div style={{ overflow: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>N°</th>
              <th style={styles.th}>Cliente</th>
              <th style={styles.th}>Descripción</th>
              <th style={styles.th}>Monto</th>
              <th style={styles.th}>Fecha</th>
              <th style={styles.th}>Estado</th>
              <th style={styles.th}>Subida por</th>
              <th style={styles.th}>Archivo</th>
            </tr>
          </thead>
          <tbody>
            {listado.map((r) => (
              <tr key={r.id}>
                <td style={styles.td}>#{String(r.numero).padStart(6, '0')}</td>
                <td style={styles.td}>{r.cliente}</td>
                <td style={styles.td}>{r.descripcion ?? '—'}</td>
                <td style={styles.td}>{r.monto ?? '—'}</td>
                <td style={styles.td}>{r.fecha ?? '—'}</td>
                <td style={styles.td}>
                  <select value={r.estado} onChange={(e) => actualizarEstado(r.id, e.target.value as Estado)} style={styles.inputSm}>
                    {estados.map((es) => (
                      <option key={es} value={es}>
                        {es}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={styles.td}>{nombreFM(r.usuarios)}</td>
                <td style={styles.td}>
                  <button style={styles.linkBtn} onClick={() => verArchivo(r)} disabled={!r.archivo_path}>
                    {r.archivo_path ? 'Ver/Descargar' : 'Sin archivo'}
                  </button>
                </td>
              </tr>
            ))}
            {!listado.length && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 16, color: '#64748b' }}>
                  No hay resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const styles: { [k: string]: React.CSSProperties } = {
  wrap: { maxWidth: 1100, margin: '0 auto', padding: 20, fontFamily: `'Segoe UI', sans-serif` },
  headerRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  btnBack: {
    backgroundColor: '#6b7280',
    color: '#fff',
    border: 'none',
    padding: '10px 16px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  title: { margin: 0, color: '#0f172a', fontSize: '1.4rem', fontWeight: 700 },
  filtros: {
    display: 'grid',
    gridTemplateColumns: '1fr 240px 1fr 200px 160px 160px 160px',
    gap: 8,
    marginBottom: 12,
  },
  input: { border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none', background: '#fff' },
  inputSm: { border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', fontSize: 13, outline: 'none', background: '#fff' },
  btn: { background: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', cursor: 'pointer', fontWeight: 600 },
  table: { width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 },
  th: { textAlign: 'left', padding: '10px 12px', color: '#475569', background: '#f8fafc' },
  td: { padding: '10px 12px', borderTop: '1px solid #e2e8f0' },
  linkBtn: { background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontWeight: 600 },
}
