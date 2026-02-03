// src/superadmin/inventario.tsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ToastProvider'

type StockRow = {
  id: string
  tipo: 'herramienta' | 'vestimenta' | string
  descripcion: string
  cantidad: number
}

type Usuario = { id: string; nombre: string | null; apellido: string | null; email: string | null }

export default function InventarioSuperadmin() {
  const navigate = useNavigate()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [stock, setStock] = useState<StockRow[]>([])
  const [buscaHerr, setBuscaHerr] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'herramienta' | 'vestimenta'>('todos')

  const [tecnicos, setTecnicos] = useState<Usuario[]>([])
  const [buscaTec, setBuscaTec] = useState('')
  const [tecSel, setTecSel] = useState<Usuario | null>(null)

  const [cantidadesAsignar, setCantidadesAsignar] = useState<Record<string, number>>({})

  // Formulario: agregar nuevo stock
  const [nuevoTipo, setNuevoTipo] = useState<'herramienta' | 'vestimenta' | ''>('')
  const [nuevaDesc, setNuevaDesc] = useState('')
  const [nuevaCant, setNuevaCant] = useState<number>(1)
  const [agregando, setAgregando] = useState(false)
  const [asignandoId, setAsignandoId] = useState<string | null>(null)

  useEffect(() => {
    cargarTodo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function cargarTodo() {
    setLoading(true)
    setError(null)
    try {
      // Stock: items en estado 'stock' sin usuario asignado
      const { data: stockData, error: stockErr } = await supabase
        .from('inventario')
        .select('id, tipo, descripcion, cantidad')
        .is('usuario_id', null)
        .eq('estado', 'stock')
        .order('descripcion', { ascending: true })

      if (stockErr) throw stockErr
      setStock((stockData as any[])?.map((r) => ({
        id: r.id,
        tipo: r.tipo,
        descripcion: r.descripcion,
        cantidad: r.cantidad ?? 0,
      })) || [])

      // Técnicos: solo roles de mantenimiento
      const { data: tecs, error: tecErr } = await supabase
        .from('usuarios')
        .select('id, nombre, apellido, email, rol')
        .in('rol', ['mantenimiento', 'mantenimiento-externo'])
        .order('apellido', { ascending: true })

      if (tecErr) throw tecErr
      setTecnicos((tecs as any[])?.map((u) => ({ id: u.id, nombre: u.nombre, apellido: u.apellido, email: u.email })) || [])
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'No se pudo cargar el inventario')
    } finally {
      setLoading(false)
    }
  }

  const stockFiltrado = useMemo(() => {
    const q = buscaHerr.trim().toLowerCase()
    return stock.filter((s) => {
      const tipoOk = filtroTipo === 'todos' ? true : s.tipo === filtroTipo
      const qOk = q ? (s.descripcion ?? '').toLowerCase().includes(q) : true
      return tipoOk && qOk
    })
  }, [stock, buscaHerr, filtroTipo])

  const tecnicosFiltrados = useMemo(() => {
    const q = buscaTec.trim().toLowerCase()
    if (!q) return tecnicos
    return tecnicos.filter((t) => {
      const nom = (t.nombre ?? '').toLowerCase()
      const ape = (t.apellido ?? '').toLowerCase()
      const email = (t.email ?? '').toLowerCase()
      const full = `${ape} ${nom}`.trim()
      return nom.includes(q) || ape.includes(q) || email.includes(q) || full.includes(q)
    })
  }, [tecnicos, buscaTec])

  const onAsignar = async (row: StockRow) => {
    try {
      setAsignandoId(row.id)
      if (!tecSel) {
        toast.info('Primero seleccioná un técnico')
        return
      }
      const qty = cantidadesAsignar[row.id] ?? 1
      if (!qty || qty <= 0) {
        toast.error('Cantidad inválida')
        return
      }
      if (qty > row.cantidad) {
        toast.error('La cantidad supera el stock disponible')
        return
      }

      // 1) Descontar del stock (fila con usuario_id null)
      const nuevaCant = row.cantidad - qty
      if (nuevaCant > 0) {
        const { error: upErr } = await supabase
          .from('inventario')
          .update({ cantidad: nuevaCant })
          .eq('id', row.id)
        if (upErr) throw upErr
      } else {
        const { error: delErr } = await supabase
          .from('inventario')
          .delete()
          .eq('id', row.id)
        if (delErr) throw delErr
      }

      // 2) Insertar asignación al técnico con estado 'entregado'
      const { error: insErr } = await supabase
        .from('inventario')
        .insert({
          usuario_id: tecSel.id,
          tipo: row.tipo,
          descripcion: row.descripcion,
          cantidad: qty,
          estado: 'entregado',
        })
      if (insErr) throw insErr

      toast.success('Asignación realizada')
      setCantidadesAsignar((prev) => ({ ...prev, [row.id]: 1 }))
      cargarTodo()
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || 'No se pudo asignar')
    } finally {
      setAsignandoId(null)
    }
  }

  const onAgregarStock = async () => {
    try {
      setAgregando(true)
      setError(null)
      // Validaciones simples
      if (!nuevoTipo) {
        toast.error('Seleccioná el tipo (herramienta o vestimenta)')
        setAgregando(false)
        return
      }
      const desc = nuevaDesc.trim()
      if (!desc) {
        toast.error('Ingresá una descripción')
        setAgregando(false)
        return
      }
      const cant = Number(nuevaCant)
      if (!cant || cant <= 0) {
        toast.error('La cantidad debe ser mayor a 0')
        setAgregando(false)
        return
      }

      // Dedupe: intentar mergear con fila existente mismo tipo+descripcion (usuario_id null, estado stock)
      const { data: rowExist, error: findErr } = await supabase
        .from('inventario')
        .select('id, cantidad')
        .is('usuario_id', null)
        .eq('estado', 'stock')
        .eq('tipo', nuevoTipo)
        .eq('descripcion', desc)
        .maybeSingle()
      if (findErr) throw findErr

      if (rowExist?.id) {
        const nuevaCantidad = (rowExist.cantidad ?? 0) + cant
        const { error: upErr } = await supabase
          .from('inventario')
          .update({ cantidad: nuevaCantidad })
          .eq('id', rowExist.id)
        if (upErr) throw upErr
      } else {
        // Insertar fila de stock (usuario_id null, estado 'stock')
        const { error: insErr } = await supabase
          .from('inventario')
          .insert({
            usuario_id: null,
            tipo: nuevoTipo,
            descripcion: desc,
            cantidad: cant,
            estado: 'stock',
          })
        if (insErr) throw insErr
      }

      // Limpiar formulario y recargar
      setNuevoTipo('')
      setNuevaDesc('')
      setNuevaCant(1)
      await cargarTodo()
      toast.success('Stock agregado correctamente')
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'No se pudo agregar al stock')
      toast.error(e?.message || 'No se pudo agregar al stock')
    }
      setAgregando(false)
  }

  return (
    <div style={styles.page as React.CSSProperties}>
      <div style={styles.headerRow as React.CSSProperties}>
        <button onClick={() => navigate('/superadmin')} style={styles.btnBack as React.CSSProperties}>← Volver</button>
        <h2 style={styles.title as React.CSSProperties}>Inventario</h2>
      </div>

      {error && <div style={styles.alertError as React.CSSProperties}>{error}</div>}
      {loading ? (
        <div>Cargando…</div>
      ) : (
        <div style={styles.grid as React.CSSProperties}>
          {/* Columna izquierda: Selección de técnico */}
          <div style={styles.col as React.CSSProperties}>
            <h3 style={styles.sectionTitle as React.CSSProperties}>Seleccionar técnico</h3>
            <input
              value={buscaTec}
              onChange={(e) => setBuscaTec(e.target.value)}
              placeholder="Buscar técnico (nombre/apellido/email)"
              style={styles.input as React.CSSProperties}
            />
            <div style={styles.list as React.CSSProperties}>
              {tecnicosFiltrados.map((t) => (
                <div
                  key={t.id}
                  style={{
                    padding: '8px 10px',
                    borderBottom: '1px solid #e5e7eb',
                    background: tecSel?.id === t.id ? '#dbeafe' : '#fff',
                    cursor: 'pointer',
                  }}
                  onClick={() => setTecSel(t)}
                >
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>
                    {`${t.apellido ?? ''} ${t.nombre ?? ''}`.trim() || t.email}
                  </div>
                  {t.email && <div style={{ color: '#64748b', fontSize: 12 }}>{t.email}</div>}
                </div>
              ))}
            </div>

            {/* Sección: Agregar al stock */}
            <h3 style={{ ...styles.sectionTitle, marginTop: 16 } as React.CSSProperties}>Agregar al stock</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
              <select
                value={nuevoTipo}
                onChange={(e) => setNuevoTipo(e.target.value as any)}
                style={styles.select as React.CSSProperties}
              >
                <option value="">Tipo…</option>
                <option value="herramienta">Herramienta</option>
                <option value="vestimenta">Vestimenta</option>
              </select>
              <input
                value={nuevaDesc}
                onChange={(e) => setNuevaDesc(e.target.value)}
                placeholder="Descripción"
                style={styles.input as React.CSSProperties}
              />
              <input
                type="number"
                min={1}
                value={nuevaCant}
                onChange={(e) => setNuevaCant(parseInt(e.target.value || '1', 10))}
                placeholder="Cantidad"
                style={styles.input as React.CSSProperties}
              />
              <button onClick={onAgregarStock} disabled={agregando} style={{ ...styles.btnPrimary, opacity: agregando ? 0.7 : 1 } as React.CSSProperties}>
                {agregando ? 'Agregando…' : 'Agregar al stock'}
              </button>
            </div>
          </div>

          {/* Columna derecha: Stock y asignación */}
          <div style={styles.col as React.CSSProperties}>
            <h3 style={styles.sectionTitle as React.CSSProperties}>Stock disponible</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value as any)}
                style={styles.select as React.CSSProperties}
              >
                <option value="todos">Todos</option>
                <option value="herramienta">Herramienta</option>
                <option value="vestimenta">Vestimenta</option>
              </select>
              <input
                value={buscaHerr}
                onChange={(e) => setBuscaHerr(e.target.value)}
                placeholder="Buscar herramienta/vestimenta"
                style={styles.input as React.CSSProperties}
              />
            </div>

            <div style={styles.table as React.CSSProperties}>
              <div style={styles.thead as React.CSSProperties}>
                <div>Tipo</div>
                <div>Descripción</div>
                <div style={{ textAlign: 'right' }}>Stock</div>
                <div style={{ textAlign: 'right' }}>Asignar</div>
              </div>
              <div>
                {stockFiltrado.length === 0 ? (
                  <div style={{ padding: 10, color: '#64748b' }}>No hay stock disponible.</div>
                ) : (
                  stockFiltrado.map((row) => (
                    <div key={row.id} style={styles.tr as React.CSSProperties}>
                      <div>{row.tipo}</div>
                      <div>{row.descripcion}</div>
                      <div style={{ textAlign: 'right' }}>{row.cantidad}</div>
                      <div style={{ textAlign: 'right' }}>
                        <input
                          type="number"
                          min={1}
                          max={row.cantidad}
                          value={cantidadesAsignar[row.id] ?? 1}
                          onChange={(e) => setCantidadesAsignar((prev) => ({ ...prev, [row.id]: parseInt(e.target.value || '1', 10) }))}
                          style={{ width: 70, marginRight: 8 }}
                        />
                        <button onClick={() => onAsignar(row)} disabled={!tecSel || asignandoId === row.id}>
                          {asignandoId === row.id ? 'Asignando…' : 'Asignar'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: { [k: string]: React.CSSProperties } = {
  page: { minHeight: '100vh', padding: 24, background: '#f8fafc' },
  headerRow: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 12, alignItems: 'center', marginBottom: 14 },
  btnBack: { background: '#6b7280', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6, cursor: 'pointer' },
  title: { margin: 0, textAlign: 'center', fontSize: '1.6rem', fontWeight: 700, color: '#1e293b' },
  grid: { display: 'grid', gap: 16, gridTemplateColumns: '1fr 2fr' },
  col: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 },
  sectionTitle: { margin: 0, marginBottom: 8, fontSize: 16, fontWeight: 700, color: '#0f172a' },
  input: { border: '1px solid #cbd5e1', borderRadius: 10, padding: '8px 10px', minWidth: 220 },
  select: { border: '1px solid #cbd5e1', borderRadius: 10, padding: '8px 10px' },
  list: { border: '1px solid #e5e7eb', borderRadius: 10, maxHeight: 280, overflow: 'auto', background: '#fff' },
  table: { border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' },
  thead: { display: 'grid', gridTemplateColumns: '120px 1fr 90px 160px', gap: 8, padding: 10, background: '#f1f5f9', fontWeight: 700, color: '#0f172a' },
  tr: { display: 'grid', gridTemplateColumns: '120px 1fr 90px 160px', gap: 8, padding: 10, borderTop: '1px solid #e5e7eb', alignItems: 'center' },
  alertError: { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 10, padding: 10, marginBottom: 10 },
  btnPrimary: { background: '#2563eb', color: '#fff', border: 'none', padding: '10px 12px', borderRadius: 8, cursor: 'pointer' },
  toast: { border: '1px solid', borderRadius: 10, padding: '8px 12px', marginBottom: 10, transition: 'opacity 0.2s' },
}
