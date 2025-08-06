// src/fm/asignar-tarea.tsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AsignarTarea() {
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
    if (!usuarioSeleccionado || !descripcion || !empresa || !sucursal || !direccion || !provincia || !localidad || !fecha || checklistItems.length === 0) {
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
    <div style={{ padding: '30px', maxWidth: '600px' }}>
      <h2>Asignar Tarea</h2>

      <input type="text" placeholder="Buscar técnico" value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
      <div>
        {usuarios
          .filter(u => `${u.nombre} ${u.apellido}`.toLowerCase().includes(busqueda.toLowerCase()))
          .map((u) => (
            <div
              key={u.id}
              onClick={() => setUsuarioSeleccionado(u.id)}
              style={{
                padding: '10px',
                marginBottom: '6px',
                border: '1px solid #ccc',
                borderRadius: '8px',
                backgroundColor: usuarioSeleccionado === u.id ? '#2563EB' : '#fff',
                color: usuarioSeleccionado === u.id ? '#fff' : '#000',
                cursor: 'pointer'
              }}
            >
              {u.nombre} {u.apellido}
            </div>
          ))}
      </div>

      <input type="text" placeholder="Empresa" value={empresa} onChange={e => setEmpresa(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
      <input type="text" placeholder="Sucursal" value={sucursal} onChange={e => setSucursal(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
      <input type="text" placeholder="Dirección" value={direccion} onChange={e => setDireccion(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
      <input type="text" placeholder="Provincia" value={provincia} onChange={e => setProvincia(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
      <input type="text" placeholder="Localidad" value={localidad} onChange={e => setLocalidad(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
      <textarea placeholder="Descripción" value={descripcion} onChange={e => setDescripcion(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />

      <h4>Checklist:</h4>
      <ul>
        {checklistItems.map((item, index) => (
          <li key={index}>
            {item}{' '}
            <button onClick={() => setChecklistItems(checklistItems.filter((_, i) => i !== index))}>x</button>
          </li>
        ))}
      </ul>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <input type="text" placeholder="Nuevo ítem" value={nuevoItem} onChange={e => setNuevoItem(e.target.value)} style={{ flex: 1, padding: '10px' }} />
        <button onClick={() => {
          if (nuevoItem.trim()) {
            setChecklistItems([...checklistItems, nuevoItem.trim()])
            setNuevoItem('')
          }
        }}>+</button>
      </div>

      <label>Fecha de realización:</label>
      <input type="datetime-local" value={fecha} onChange={e => setFecha(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '20px' }} />

      <button onClick={asignarTarea} disabled={cargando} style={{ padding: '12px 20px', backgroundColor: '#1e40af', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
        {cargando ? 'Asignando...' : 'Asignar tarea'}
      </button>
    </div>
  )
}
