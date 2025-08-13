// src/fm/cotizaciones.tsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

type Estado = 'cotizado' | 'aprobado' | 'cerrado' | 'facturado' | 'desestimado'

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
}

export default function CotizacionesFM() {
  const [meId, setMeId] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const [listado, setListado] = useState<Cotizacion[]>([])
  const [qCliente, setQCliente] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  // form
  const [cliente, setCliente] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState<string>('')
  const [fecha, setFecha] = useState<string>('')
  const [estado, setEstado] = useState<Estado>('cotizado')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [subiendo, setSubiendo] = useState(false)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser()
      const uid = data?.user?.id ?? null
      setMeId(uid)
      await cargarListado()
    })()
  }, [])

  const cargarListado = async () => {
    setCargando(true)
    let q = supabase
      .from('cotizaciones')
      .select('*')
      .order('numero', { ascending: false })

    if (qCliente) q = q.ilike('cliente', `%${qCliente}%`)
    if (desde) q = q.gte('fecha', desde)
    if (hasta) q = q.lte('fecha', hasta)

    const { data, error } = await q
    if (error) {
      console.error(error)
    } else if (data) {
      setListado(data as Cotizacion[])
    }
    setCargando(false)
  }

  const limpiarForm = () => {
    setCliente('')
    setDescripcion('')
    setMonto('')
    setFecha('')
    setEstado('cotizado')
    setArchivo(null)
  }

  const subirCotizacion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!meId) return alert('No hay sesión')
    if (!cliente.trim()) return alert('Ingresá el cliente')
    if (!archivo) return alert('Adjuntá el archivo (PDF/Excel)')

    setSubiendo(true)

    // 1) Insert preliminar para obtener numero
    const { data: inserted, error: insertErr } = await supabase
      .from('cotizaciones')
      .insert({
        cliente: cliente.trim(),
        descripcion: descripcion.trim() || null,
        monto: monto ? Number(monto) : null,
        fecha: fecha || null,
        estado,
        subida_por: meId,
        archivo_path: null,
        archivo_mimetype: archivo.type || null,
      })
      .select('id, numero')
      .single()

    if (insertErr || !inserted) {
      setSubiendo(false)
      return alert('Error al crear la cotización: ' + (insertErr?.message ?? 'desconocido'))
    }

    // 2) Subir a storage usando el numero
    const safeCliente = cliente.toLowerCase().replace(/[^a-z0-9-_]+/g, '-')
    const ext = (archivo.name.split('.').pop() || 'pdf').toLowerCase()
    const fileName = `${String(inserted.numero).padStart(6, '0')}_${safeCliente}.${ext}`
    const path = `${meId}/${fileName}`

    const { error: upErr } = await supabase.storage
      .from('cotizaciones')
      .upload(path, archivo, { upsert: true, contentType: archivo.type || 'application/octet-stream' })

    if (upErr) {
      setSubiendo(false)
      return alert('Error al subir archivo: ' + upErr.message)
    }

    // 3) Update con archivo_path (ahora permitido por RLS update_owner)
    const { error: updErr } = await supabase
      .from('cotizaciones')
      .update({ archivo_path: path })
      .eq('id', inserted.id)

    setSubiendo(false)
    if (updErr) {
      return alert('Subido, pero no se guardó el path: ' + updErr.message)
    }

    alert(`Cotización COT-${String(inserted.numero).padStart(6, '0')} creada`)
    limpiarForm()
    cargarListado()
  }

  const estados: Estado[] = useMemo(
    () => ['cotizado', 'aprobado', 'cerrado', 'facturado', 'desestimado'],
    []
  )

  const verArchivo = async (row: Cotizacion) => {
    if (!row.archivo_path) return alert('No hay archivo')
    const { data, error } = await supabase.storage
      .from('cotizaciones')
      .createSignedUrl(row.archivo_path, 3600)
    if (error || !data?.signedUrl) return alert('No se pudo obtener el archivo')
    window.open(data.signedUrl, '_blank')
  }

  // 🔄 Cambiar estado desde la tabla (FM puede actualizar lo propio)
  const actualizarEstado = async (row: Cotizacion, nuevo: Estado) => {
    const prev = listado.slice()
    setListado((xs) => xs.map((r) => (r.id === row.id ? { ...r, estado: nuevo } : r)))

    const { error } = await supabase
      .from('cotizaciones')
      .update({ estado: nuevo })
      .eq('id', row.id)

    if (error) {
      alert('No se pudo actualizar el estado: ' + error.message)
      setListado(prev) // rollback
    }
  }

  return (
    <div style={styles.wrap}>
      <h2 style={styles.title}>Cotizaciones (FM)</h2>

      {/* Form de alta */}
      <form onSubmit={subirCotizacion} style={styles.form}>
        <div style={styles.row}>
          <label style={styles.label}>Cliente *</label>
          <input
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            style={styles.input}
            placeholder="Cliente"
            required
          />
        </div>

        <div style={styles.row}>
          <label style={styles.label}>Descripción</label>
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            style={styles.input}
            placeholder="Descripción"
          />
        </div>

        <div style={styles.row3}>
          <div style={styles.col}>
            <label style={styles.label}>Monto</label>
            <input
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              style={styles.input}
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>
          <div style={styles.col}>
            <label style={styles.label}>Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              style={styles.input}
            />
          </div>
          <div style={styles.col}>
            <label style={styles.label}>Estado</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as Estado)}
              style={styles.input}
            >
              {estados.map((es) => (
                <option key={es} value={es}>
                  {es}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.row}>
          <label style={styles.label}>Archivo (PDF/Excel) *</label>
          <input
            type="file"
            accept=".pdf,.xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            style={styles.input}
            required
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={subiendo} style={styles.btnPrimary}>
            {subiendo ? 'Subiendo…' : 'Guardar cotización'}
          </button>
          <button type="button" onClick={limpiarForm} disabled={subiendo} style={styles.btnGhost}>
            Limpiar
          </button>
        </div>
      </form>

      {/* Filtros */}
      <div style={styles.filters}>
        <input
          placeholder="Buscar por cliente…"
          value={qCliente}
          onChange={(e) => setQCliente(e.target.value)}
          style={styles.input}
        />
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
              <th>N°</th>
              <th>Cliente</th>
              <th>Descripción</th>
              <th>Monto</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Archivo</th>
            </tr>
          </thead>
          <tbody>
            {listado.map((row) => (
              <tr key={row.id}>
                <td>#{String(row.numero).padStart(6, '0')}</td>
                <td>{row.cliente}</td>
                <td>{row.descripcion ?? '-'}</td>
                <td>{row.monto ?? '-'}</td>
                <td>{row.fecha ?? '-'}</td>
                <td>
                  <select
                    value={row.estado}
                    onChange={(e) => actualizarEstado(row, e.target.value as Estado)}
                    style={styles.input}
                  >
                    {estados.map((es) => (
                      <option key={es} value={es}>
                        {es}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button style={styles.linkBtn} onClick={() => verArchivo(row)} disabled={!row.archivo_path}>
                    {row.archivo_path ? 'Ver/Descargar' : 'Sin archivo'}
                  </button>
                </td>
              </tr>
            ))}
            {!listado.length && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 16, color: '#64748b' }}>
                  No hay cotizaciones
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
  wrap: { maxWidth: 1000, margin: '0 auto', padding: 20, fontFamily: `'Segoe UI', sans-serif` },
  title: { margin: '0 0 12px', color: '#0f172a' },
  form: {
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    background: '#fff',
  },
  row: { display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', gap: 12, marginBottom: 10 },
  row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 10 },
  col: { display: 'grid', gridTemplateColumns: '1fr', gap: 6 },
  label: { color: '#475569', fontWeight: 600 },
  input: {
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 14,
    outline: 'none',
    background: '#fff',
  },
  btnPrimary: {
    background: '#0ea5e9',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  btnGhost: {
    background: '#fff',
    color: '#0f172a',
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  filters: {
    display: 'grid',
    gridTemplateColumns: '1fr 160px 160px 160px',
    gap: 8,
    margin: '8px 0 16px',
  },
  btn: {
    background: '#e2e8f0',
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    padding: '10px 12px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
  } as React.CSSProperties,
  linkBtn: {
    background: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    padding: '6px 10px',
    cursor: 'pointer',
    fontWeight: 600,
  },
}
