// src/fm/asignar-tarea.tsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type UsuarioBase = { id: string; nombre: string; apellido: string }
type EmpresaMin = { id: string; nombre: string }

export default function AsignarTarea() {
  const navigate = useNavigate()

  const [usuarios, setUsuarios] = useState<UsuarioBase[]>([])
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState('')

  // Form
  const [busqueda, setBusqueda] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [empresa, setEmpresa] = useState('')               // texto visible
  const [empresaSeleccionadaId, setEmpresaSeleccionadaId] = useState<string>('') // id si elegiste de la lista
  const [sucursal, setSucursal] = useState('')
  const [direccion, setDireccion] = useState('')
  const [provincia, setProvincia] = useState('')
  const [localidad, setLocalidad] = useState('')
  const [checklistItems, setChecklistItems] = useState<string[]>([])
  const [nuevoItem, setNuevoItem] = useState('')
  const [fecha, setFecha] = useState('')
  const [cargando, setCargando] = useState(false)

  // Empresas (autocompletar)
  const [empresas, setEmpresas] = useState<EmpresaMin[]>([])
  const [showSugs, setShowSugs] = useState(false)

  useEffect(() => {
    obtenerUsuarios()
    obtenerEmpresas()
  }, [])

  const obtenerUsuarios = async () => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido')
      .eq('rol', 'mantenimiento')

    if (!error) setUsuarios((data || []) as UsuarioBase[])
  }

  const obtenerEmpresas = async () => {
    const { data, error } = await supabase
      .from('empresas')
      .select('id, nombre')
      .order('nombre', { ascending: true })
    if (!error) setEmpresas((data || []) as EmpresaMin[])
  }

  // Filtra sugerencias por prefijo (case-insensitive)
  const empresasFiltradas = useMemo(() => {
    const q = empresa.trim().toLowerCase()
    if (!q) return []
    return empresas.filter(e => e.nombre.toLowerCase().startsWith(q)).slice(0, 10)
  }, [empresa, empresas])

  // Al tipear en empresa, invalida selección previa
  const onEmpresaChange = (v: string) => {
    setEmpresa(v)
    setEmpresaSeleccionadaId('')
    setShowSugs(true)
  }

  const asignarTarea = async () => {
    // Validaciones
    if (!usuarioSeleccionado) return alert('Seleccioná un técnico')
    if (!descripcion.trim()) return alert('Completá la descripción')
    if (!empresa.trim()) return alert('Elegí/ingresá la empresa')
    if (!sucursal.trim() || !direccion.trim() || !provincia.trim() || !localidad.trim())
      return alert('Completá sucursal, dirección, provincia y localidad')
    if (!fecha) return alert('Indicá la fecha de realización')
    if (checklistItems.length === 0) return alert('Agregá al menos un ítem al checklist')

    // Si NO se seleccionó una empresa existente (no hay id) pero el texto coincide con una existente -> fijamos id igual
    const match = empresas.find(e => e.nombre.toLowerCase() === empresa.trim().toLowerCase())
    if (!empresaSeleccionadaId && match) {
      setEmpresaSeleccionadaId(match.id)
    }

    // Si no hay empresa seleccionada (ni match exacto), pedimos confirmación para continuar “igual”
    if (!empresaSeleccionadaId && !match) {
      const continuar = window.confirm(
        `La empresa/cliente "${empresa}" no coincide con ninguna registrada.\n\n` +
        `¿Querés continuar IGUAL con este nombre? (Si preferís, podés crearla primero desde "Crear empresa/cliente")`
      )
      if (!continuar) return
    }

    setCargando(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const fmId = auth?.user?.id

      // ⬇️ Importante: NO mandamos empresa_id porque tu tabla no la tiene
      const payload = {
        usuario_id: usuarioSeleccionado,
        descripcion: descripcion.trim(),
        estado: 'Pendiente',
        fecha: new Date().toISOString(),
        fecha_realizacion: new Date(fecha).toISOString(),
        fm_id: fmId,
        tipo: 'checklist',
        checklist: checklistItems.map(item => ({ texto: item, hecho: false })),
        sucursal: sucursal.trim(),
        direccion: direccion.trim(),
        provincia: provincia.trim(),
        localidad: localidad.trim(),
        empresa: empresa.trim(), // guardamos el nombre visible
      }

      const { error } = await supabase.from('trabajos_mantenimiento').insert([payload as any])
      if (error) throw error

      alert('Tarea asignada correctamente')
      // Reset
      setUsuarioSeleccionado('')
      setDescripcion('')
      setEmpresa('')
      setEmpresaSeleccionadaId('')
      setSucursal('')
      setDireccion('')
      setProvincia('')
      setLocalidad('')
      setChecklistItems([])
      setFecha('')
      setShowSugs(false)
    } catch (e: any) {
      alert(e?.message || 'Error al asignar tarea')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <button onClick={() => navigate('/superadmin')} style={styles.backButton}>
          ← Volver
        </button>
        <h2 style={{ margin: 0, flex: 1 }}>Asignar Tarea</h2>
        <div />
      </div>

      <div style={styles.card}>
        {/* Buscar técnico */}
        <input
          type="text"
          placeholder="Buscar técnico"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={styles.input}
        />

        <div>
          {usuarios
            .filter(u => `${u.nombre} ${u.apellido}`.toLowerCase().includes(busqueda.toLowerCase()))
            .map((u) => (
              <div
                key={u.id}
                onClick={() => setUsuarioSeleccionado(u.id)}
                style={{
                  ...styles.userItem,
                  backgroundColor: usuarioSeleccionado === u.id ? '#2563EB' : '#fff',
                  color: usuarioSeleccionado === u.id ? '#fff' : '#000'
                }}
              >
                {u.nombre} {u.apellido}
              </div>
            ))}
        </div>

        {/* Empresa con autocompletar + crear */}
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Empresa / Cliente (elegí de la lista)"
              value={empresa}
              onChange={e => onEmpresaChange(e.target.value)}
              onFocus={() => setShowSugs(true)}
              style={styles.input}
            />
            <button
              type="button"
              onClick={() => navigate('/fm/empresas/nueva')}
              style={styles.btnLight}
              title="Crear empresa/cliente"
            >
              Crear empresa/cliente
            </button>
          </div>

          {showSugs && empresasFiltradas.length > 0 && (
            <div style={styles.suggestBox}>
              {empresasFiltradas.map((em) => (
                <div
                  key={em.id}
                  style={styles.suggestItem}
                  onMouseDown={() => {
                    setEmpresa(em.nombre)
                    setEmpresaSeleccionadaId(em.id)
                    setShowSugs(false)
                  }}
                >
                  {em.nombre}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ubicación / datos */}
        <input
          type="text"
          placeholder="Sucursal"
          value={sucursal}
          onChange={e => setSucursal(e.target.value)}
          style={styles.input}
        />
        <input
          type="text"
          placeholder="Dirección"
          value={direccion}
          onChange={e => setDireccion(e.target.value)}
          style={styles.input}
        />
        <input
          type="text"
          placeholder="Provincia"
          value={provincia}
          onChange={e => setProvincia(e.target.value)}
          style={styles.input}
        />
        <input
          type="text"
          placeholder="Localidad"
          value={localidad}
          onChange={e => setLocalidad(e.target.value)}
          style={styles.input}
        />

        {/* Descripción */}
        <textarea
          placeholder="Descripción"
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
          style={styles.textarea}
        />

        {/* Checklist */}
        <h4 style={styles.label}>Checklist:</h4>
        <ul style={styles.checklist}>
          {checklistItems.map((item, index) => (
            <li key={index} style={styles.checklistItem}>
              {item}{' '}
              <button
                style={styles.removeBtn}
                onClick={() => setChecklistItems(checklistItems.filter((_, i) => i !== index))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <div style={styles.newItemRow}>
          <input
            type="text"
            placeholder="Nuevo ítem"
            value={nuevoItem}
            onChange={e => setNuevoItem(e.target.value)}
            style={{ ...styles.input, marginBottom: 0 }}
          />
          <button
            style={styles.addBtn}
            onClick={() => {
              if (nuevoItem.trim()) {
                setChecklistItems([...checklistItems, nuevoItem.trim()])
                setNuevoItem('')
              }
            }}
          >
            +
          </button>
        </div>

        {/* Fecha */}
        <label style={styles.label}>Fecha de realización:</label>
        <input
          type="datetime-local"
          value={fecha}
          onChange={e => setFecha(e.target.value)}
          style={styles.input}
        />

        <button
          onClick={asignarTarea}
          disabled={cargando}
          style={styles.submitBtn}
        >
          {cargando ? 'Asignando...' : 'Asignar Tarea'}
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, any> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '30px',
    background: '#fff',
    minHeight: '100vh',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
    width: '100%',
    maxWidth: '700px',
  },
  backButton: {
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  card: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '700px',
    position: 'relative',
  },
  input: {
    width: '100%',
    padding: '10px',
    marginBottom: '10px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    outline: 'none',
    color: '#0f172a',
  },
  textarea: {
    width: '100%',
    padding: '10px',
    minHeight: '80px',
    marginBottom: '10px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    outline: 'none',
    color: '#0f172a',
  },
  userItem: {
    padding: '10px',
    marginBottom: '6px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    cursor: 'pointer',
  },

  // Autocomplete
  suggestBox: {
    position: 'absolute',
    zIndex: 20,
    top: '100%',
    left: 0,
    right: 0,
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
    maxHeight: 260,
    overflowY: 'auto',
    marginTop: 4,
  },
  suggestItem: {
    padding: '10px 12px',
    borderBottom: '1px solid #f1f5f9',
    cursor: 'pointer',
  },

  checklist: {
    listStyle: 'none',
    padding: 0,
    marginBottom: '10px',
  },
  checklistItem: {
    display: 'flex',
    justifyContent: 'space-between',
    background: '#f3f4f6',
    padding: '6px 10px',
    borderRadius: '6px',
    marginBottom: '6px',
  },
  removeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'red',
    cursor: 'pointer',
    fontSize: 16,
    fontWeight: 700,
  },
  newItemRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '10px',
  },
  addBtn: {
    padding: '0 12px',
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: 18,
    fontWeight: 800,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: '4px',
    display: 'block',
    color: '#334155',
  },
  submitBtn: {
    padding: '12px 20px',
    backgroundColor: '#1e40af',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: '100%',
    marginTop: 6,
  },

  // Botón crear empresa
  btnLight: {
    whiteSpace: 'nowrap',
    padding: '10px 12px',
    backgroundColor: '#e2e8f0',
    color: '#0f172a',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    fontWeight: 700,
    cursor: 'pointer',
  },
}
