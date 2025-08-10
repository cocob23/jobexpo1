// src/fm/asignar-tarea.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AsignarTarea() {
  const navigate = useNavigate()
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [sucursal, setSucursal] = useState('')
  const [direccion, setDireccion] = useState('')
  const [provincia, setProvincia] = useState('')
  const [localidad, setLocalidad] = useState('')
  const [checklistItems, setChecklistItems] = useState<string[]>([])
  const [nuevoItem, setNuevoItem] = useState('')
  const [fecha, setFecha] = useState('')
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    obtenerUsuarios()
  }, [])

  const obtenerUsuarios = async () => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido')
      .eq('rol', 'mantenimiento')

    if (!error) {
      setUsuarios(data || [])
    }
  }

  const asignarTarea = async () => {
    if (
      !usuarioSeleccionado ||
      !descripcion ||
      !empresa ||
      !sucursal ||
      !direccion ||
      !provincia ||
      !localidad ||
      !fecha ||
      checklistItems.length === 0
    ) {
      alert('Completá todos los campos')
      return
    }

    setCargando(true)
    const { data: session } = await supabase.auth.getUser()
    const fmId = session?.user?.id

    const { error } = await supabase.from('trabajos_mantenimiento').insert([
      {
        usuario_id: usuarioSeleccionado,
        descripcion,
        estado: 'Pendiente',
        fecha: new Date().toISOString(),
        fecha_realizacion: new Date(fecha).toISOString(),
        fm_id: fmId,
        tipo: 'checklist',
        checklist: checklistItems.map(item => ({ texto: item, hecho: false })),
        sucursal,
        direccion,
        provincia,
        localidad,
        empresa
      }
    ])

    if (error) {
      alert('Error al asignar tarea')
    } else {
      alert('Tarea asignada correctamente')
      setUsuarioSeleccionado('')
      setDescripcion('')
      setEmpresa('')
      setSucursal('')
      setDireccion('')
      setProvincia('')
      setLocalidad('')
      setChecklistItems([])
      setFecha('')
    }
    setCargando(false)
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <button
          onClick={() => navigate('/superadmin')}
          style={styles.backButton}
        >
          ← Volver
        </button>
        <h2 style={{ margin: 0 }}>Asignar Tarea</h2>
      </div>

      <div style={styles.card}>
        <input
          type="text"
          placeholder="Buscar técnico"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={styles.input}
        />
        <div>
          {usuarios
            .filter(u =>
              `${u.nombre} ${u.apellido}`.toLowerCase().includes(busqueda.toLowerCase())
            )
            .map(u => (
              <div
                key={u.id}
                onClick={() => setUsuarioSeleccionado(u.id)}
                style={{
                  ...styles.userItem,
                  backgroundColor:
                    usuarioSeleccionado === u.id ? '#2563EB' : '#fff',
                  color: usuarioSeleccionado === u.id ? '#fff' : '#000'
                }}
              >
                {u.nombre} {u.apellido}
              </div>
            ))}
        </div>

        <input
          type="text"
          placeholder="Empresa"
          value={empresa}
          onChange={e => setEmpresa(e.target.value)}
          style={styles.input}
        />
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
        <textarea
          placeholder="Descripción"
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
          style={styles.textarea}
        />

        <h4>Checklist:</h4>
        <ul style={styles.checklist}>
          {checklistItems.map((item, index) => (
            <li key={index} style={styles.checklistItem}>
              {item}
              <button
                style={styles.removeBtn}
                onClick={() =>
                  setChecklistItems(checklistItems.filter((_, i) => i !== index))
                }
              >
                x
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
            style={{ ...styles.input, flex: 1 }}
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
          {cargando ? 'Asignando...' : 'Asignar tarea'}
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
    padding: '30px'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
    width: '100%',
    maxWidth: '600px'
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
    transition: 'all 0.2s ease'
  },
  card: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '600px'
  },
  input: {
    width: '100%',
    padding: '10px',
    marginBottom: '10px',
    borderRadius: '8px',
    border: '1px solid #ccc'
  },
  textarea: {
    width: '100%',
    padding: '10px',
    minHeight: '80px',
    marginBottom: '10px',
    borderRadius: '8px',
    border: '1px solid #ccc'
  },
  userItem: {
    padding: '10px',
    marginBottom: '6px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  checklist: {
    listStyle: 'none',
    padding: 0,
    marginBottom: '10px'
  },
  checklistItem: {
    display: 'flex',
    justifyContent: 'space-between',
    background: '#f3f4f6',
    padding: '6px 10px',
    borderRadius: '6px',
    marginBottom: '6px'
  },
  removeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'red',
    cursor: 'pointer'
  },
  newItemRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '10px'
  },
  addBtn: {
    padding: '0 12px',
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  label: {
    fontWeight: 'bold',
    marginBottom: '4px',
    display: 'block'
  },
  submitBtn: {
    padding: '12px 20px',
    backgroundColor: '#1e40af',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: '100%'
  }
}
