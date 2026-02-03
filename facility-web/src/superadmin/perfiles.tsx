import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ToastProvider'

type Usuario = {
  id: string
  nombre: string
  apellido: string
  rol: string | null
}

const ROLES_MARCAN_LLEGADA = ['mantenimiento', 'mantenimiento-externo', 'limpieza']

export default function PerfilesSA() {
  const navigate = useNavigate()
  const toast = useToast()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [busqueda, setBusqueda] = useState('')
  const [rolFiltro, setRolFiltro] = useState<string>('todos')

  useEffect(() => {
    cargarUsuarios()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function cargarUsuarios() {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, apellido, rol')
        .order('apellido', { ascending: true })
      if (error) throw error
      setUsuarios((data || []) as Usuario[])
    } catch (e: any) {
      console.error(e)
      setError(e.message || 'No se pudieron cargar los usuarios')
      toast.error('Error cargando usuarios')
    } finally {
      setLoading(false)
    }
  }

  const usuariosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return usuarios.filter(u => {
      const byRol = rolFiltro === 'todos' ? true : u.rol === rolFiltro
      const nombre = `${u.nombre || ''} ${u.apellido || ''}`.toLowerCase()
      const byNombre = q ? nombre.includes(q) : true
      return byRol && byNombre
    })
  }, [usuarios, busqueda, rolFiltro])

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <div style={styles.headerRow}>
          <button onClick={() => navigate('/superadmin')} style={styles.botonVolver}>← Volver</button>
          <h1 style={styles.titulo}>Perfiles</h1>
        </div>

        {/* filtros */}
        <div style={styles.filtersRow}>
          <input
            type="text"
            placeholder="Buscar por nombre o apellido…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={styles.input}
          />
          <select value={rolFiltro} onChange={(e) => setRolFiltro(e.target.value)} style={styles.select}>
            <option value="todos">Todos los roles</option>
            <option value="mantenimiento">Mantenimiento</option>
            <option value="mantenimiento-externo">Mantenimiento externo</option>
            <option value="limpieza">Limpieza</option>
          </select>
          <button onClick={cargarUsuarios} style={styles.btnPrimary}>Actualizar</button>
        </div>

        {/* lista */}
        <div style={styles.list}>
          {loading ? (
            <p>Cargando perfiles…</p>
          ) : error ? (
            <p style={{ color: 'red' }}>{error}</p>
          ) : usuariosFiltrados.length === 0 ? (
            <p>No hay usuarios para ese filtro.</p>
          ) : (
            usuariosFiltrados.map(u => (
              <div key={u.id} style={styles.card} onClick={() => navigate(`/superadmin/perfil-tecnico/${u.id}`)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={styles.nombre}>{u.nombre} {u.apellido}</div>
                    <div style={styles.rol}>{u.rol || 'sin rol'}</div>
                  </div>
                  {ROLES_MARCAN_LLEGADA.includes(u.rol || '') && (
                    <span style={styles.badge}>Marca llegada</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  wrapper: { minHeight: '100vh', backgroundColor: '#f8fafc' },
  container: { maxWidth: 900, margin: '0 auto', padding: '2rem', fontFamily: `'Segoe UI', sans-serif` },
  headerRow: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' },
  titulo: { fontSize: '2rem', fontWeight: 800, margin: 0, color: '#1e293b', flex: 1, textAlign: 'center' },
  botonVolver: {
    backgroundColor: '#6b7280', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: 8, fontWeight: 700, cursor: 'pointer',
  },
  filtersRow: { display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 12, marginBottom: 16 },
  input: { border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', background: '#fff' },
  select: { border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', background: '#fff' },
  btnPrimary: { backgroundColor: '#1e40af', color: '#fff', border: 'none', padding: '10px 12px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' },
  list: { background: '#fff', borderRadius: 12, padding: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  card: { border: '2px solid #e2e8f0', borderRadius: 12, padding: '14px', marginBottom: 10, cursor: 'pointer', background: '#f8fafc' },
  nombre: { fontSize: 16, fontWeight: 800, color: '#1e40af' },
  rol: { fontSize: 12, color: '#64748b' },
  badge: { backgroundColor: '#059669', color: '#fff', padding: '4px 8px', borderRadius: 8, fontSize: 12, fontWeight: 700 },
}
