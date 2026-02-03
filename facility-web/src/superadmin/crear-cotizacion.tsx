import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ToastProvider'

type Estado = 'pendiente' | 'cotizado' | 'aprobado' | 'orden_compra_pendiente' | 'cerrado' | 'facturado' | 'desestimado'

export default function CrearCotizacionSuperadmin() {
  const navigate = useNavigate()
  const toast = useToast()

  const [meId, setMeId] = useState<string | null>(null)
  const [cliente, setCliente] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState<string>('')
  const [fecha, setFecha] = useState<string>('')
  const [estado, setEstado] = useState<Estado>('pendiente')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [numeroManual, setNumeroManual] = useState<string>('')

  // Autocompletar clientes
  type EmpresaMin = { id: string; nombre: string }
  const [empresas, setEmpresas] = useState<EmpresaMin[]>([])
  const [mostrarSug, setMostrarSug] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      setMeId(data?.user?.id ?? null)
    })()
  }, [])

  useEffect(() => {
    obtenerEmpresas()
  }, [])

  const obtenerEmpresas = async () => {
    const { data, error } = await supabase
      .from('empresas')
      .select('id, nombre')
      .order('nombre', { ascending: true })
    if (!error) setEmpresas((data || []) as EmpresaMin[])
  }

  const estados: Estado[] = useMemo(
    () => ['pendiente','cotizado','aprobado','orden_compra_pendiente','cerrado','facturado','desestimado'],
    []
  )

  const limpiarForm = () => {
    setCliente('')
    setDescripcion('')
    setMonto('')
    setFecha('')
  setEstado('pendiente')
    setArchivo(null)
  }

  const empresasFiltradas = useMemo(() => {
    const q = cliente.trim().toLowerCase()
    if (!q) return [] as EmpresaMin[]
    return empresas.filter((e) => e.nombre.toLowerCase().includes(q)).slice(0, 8)
  }, [cliente, empresas])

  const onClienteChange = (v: string) => {
    setCliente(v)
    setMostrarSug(true)
  }

  const subirCotizacion = async (e: React.FormEvent) => {
    e.preventDefault()
  if (!meId) { toast.error('No hay sesión'); return }
  if (!cliente.trim()) { toast.error('Ingresá el cliente'); return }
  if (!numeroManual.trim()) { toast.error('Ingresá el número de cotización'); return }
  const numeroInt = parseInt(numeroManual.trim(), 10)
  if (!Number.isFinite(numeroInt) || numeroInt <= 0) { toast.error('Número inválido (>0)'); return }
  if (!archivo) { toast.error('Adjuntá el archivo (PDF/Excel)'); return }

    setSubiendo(true)

    const { data: inserted, error: insertErr } = await supabase
      .from('cotizaciones')
      .insert({
        numero: numeroInt,
        cliente: cliente.trim(),
        descripcion: descripcion.trim() || null,
        monto: monto ? Number(monto) : null,
        fecha: fecha || null,
        estado,
        subida_por: meId,
        archivo_path: null,
        archivo_mimetype: archivo.type || null,
      })
      .select('id')
      .single()

    if (insertErr || !inserted) {
      setSubiendo(false)
      toast.error('Error al crear la cotización: ' + (insertErr?.message ?? 'desconocido'))
      return
    }

    const safeCliente = cliente.toLowerCase().replace(/[^a-z0-9-_]+/g, '-')
    const ext = (archivo.name.split('.').pop() || 'pdf').toLowerCase()
  const fileName = `${String(numeroInt).padStart(6, '0')}_${safeCliente}.${ext}`
    const path = `${meId}/${fileName}`

    const { error: upErr } = await supabase.storage
      .from('cotizaciones')
      .upload(path, archivo, { upsert: true, contentType: archivo.type || 'application/octet-stream' })

    if (upErr) {
      setSubiendo(false)
      toast.error('Error al subir archivo: ' + upErr.message)
      return
    }

    const { error: updErr } = await supabase.from('cotizaciones').update({ archivo_path: path }).eq('id', inserted.id)

    setSubiendo(false)
    if (updErr) {
      toast.error('Subido, pero no se guardó el path: ' + updErr.message)
      return
    }

    toast.success(`Cotización COT-${String(numeroInt).padStart(6, '0')} creada`)
    limpiarForm()
    navigate('/superadmin/cotizaciones')
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.headerRow}>
        <button onClick={() => navigate('/superadmin')} style={styles.btnBack}>
          ← Volver
        </button>
        <h2 style={styles.title}>Crear Cotización (Superadmin)</h2>
      </div>

      <form onSubmit={subirCotizacion} style={styles.form}>
        <div style={styles.row}>
          <label style={styles.label}>Número *</label>
          <input
            value={numeroManual}
            onChange={(e) => setNumeroManual(e.target.value)}
            style={styles.input}
            placeholder="Ej: 101"
            required
          />
        </div>

        <div style={styles.row}>
          <label style={styles.label}>Cliente *</label>
          <div style={{ position: 'relative' }}>
            <input
              value={cliente}
              onChange={(e) => onClienteChange(e.target.value)}
              onFocus={() => setMostrarSug(true)}
              onBlur={() => setTimeout(() => setMostrarSug(false), 120)}
              style={styles.input}
              placeholder="Cliente"
              required
            />
            {mostrarSug && empresasFiltradas.length > 0 && (
              <div style={styles.suggestBox}>
                {empresasFiltradas.map((e) => (
                  <div
                    key={e.id}
                    style={styles.suggestItem}
                    onMouseDown={(ev) => ev.preventDefault()}
                    onClick={() => {
                      setCliente(e.nombre)
                      setMostrarSug(false)
                    }}
                  >
                    {e.nombre}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={styles.row}>
          <label style={styles.label}>Descripción</label>
          <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} style={styles.input} placeholder="Descripción" />
        </div>

        <div style={styles.row3}>
          <div style={styles.col}>
            <label style={styles.label}>Monto</label>
            <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} style={styles.input} placeholder="0" min="0" step="0.01" />
          </div>
          <div style={styles.col}>
            <label style={styles.label}>Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={styles.input} />
          </div>
          <div style={styles.col}>
            <label style={styles.label}>Estado</label>
            <select value={estado} onChange={(e) => setEstado(e.target.value as Estado)} style={styles.input}>
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
    </div>
  )
}

const styles: { [k: string]: React.CSSProperties } = {
  wrap: { maxWidth: 1000, margin: '0 auto', padding: 20, fontFamily: `'Segoe UI', sans-serif` },
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
  title: { margin: 0, color: '#0f172a' },
  form: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 16, background: '#fff' },
  row: { display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', gap: 12, marginBottom: 10 },
  row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 10 },
  col: { display: 'grid', gridTemplateColumns: '1fr', gap: 6 },
  label: { color: '#475569', fontWeight: 600 },
  input: { border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none', background: '#fff' },
  btnPrimary: { background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', fontWeight: 600 },
  btnGhost: { background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', fontWeight: 600 },
  suggestBox: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
    zIndex: 10,
    marginTop: 4,
    maxHeight: 220,
    overflow: 'auto',
  },
  suggestItem: {
    padding: '8px 10px',
    cursor: 'pointer',
  },
}
