import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseAdmin } from '../lib/supabase'

const rolesDisponibles = ['limpieza', 'mantenimiento', 'mantenimiento-externo', 'fm', 'superadmin', 'comercial']

export default function CrearUsuario() {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState('limpieza')
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mostrarPass, setMostrarPass] = useState<boolean>(false)

  // Panel de administración: listado y búsqueda/eliminación
  const [usuarios, setUsuarios] = useState<Array<{ id: string; nombre: string | null; apellido: string | null; email: string | null; rol: string | null }>>([])
  const [q, setQ] = useState('')
  const usuariosFiltrados = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return usuarios
    return usuarios.filter((u) => {
      const nom = (u.nombre ?? '').toLowerCase()
      const ape = (u.apellido ?? '').toLowerCase()
      const em = (u.email ?? '').toLowerCase()
      const r = (u.rol ?? '').toLowerCase()
      return nom.includes(query) || ape.includes(query) || em.includes(query) || r.includes(query)
    })
  }, [usuarios, q])

  useEffect(() => {
    cargarUsuarios()
  }, [])

  async function cargarUsuarios() {
    const { data, error } = await supabaseAdmin
      .from('usuarios')
      .select('id, nombre, apellido, email, rol')
      .order('apellido', { ascending: true })
    if (!error && data) setUsuarios(data as any)
  }

  const crearUsuario = async () => {
    if (!email || !password || !nombre || !apellido || !rol) {
      setMensaje('Completá todos los campos')
      return
    }

    setCargando(true)
    setMensaje('')

    // Debug: verificar que supabaseAdmin esté disponible
    console.log('supabaseAdmin disponible:', !!supabaseAdmin)
    console.log('supabaseAdmin.auth disponible:', !!supabaseAdmin?.auth)

    try {
      const emailLimpio = email.trim().toLowerCase()

      // Usar admin.createUser para crear usuario directamente sin confirmación
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: emailLimpio,
        password,
        email_confirm: true,
      })

      if (authError) {
        console.error('Error en auth.admin.createUser:', authError)
        setMensaje(`Error al crear usuario: ${authError.message}`)
        return
      }

      const userId = authUser.user?.id
      if (!userId) {
        setMensaje('Error: No se pudo obtener el ID del usuario creado')
        return
      }

      // Insertar en la tabla usuarios
      const { error: insertError } = await supabaseAdmin.from('usuarios').insert({
        id: userId,
        email: emailLimpio,
        nombre,
        apellido,
        rol,
      })

      if (insertError) {
        console.error('Error al insertar en usuarios:', insertError)
        setMensaje(`Error al guardar en tabla usuarios: ${insertError.message}`)
      } else {
        setMensaje('Usuario creado con éxito ✅')
        setNombre('')
        setApellido('')
        setEmail('')
        setPassword('')
        setRol('limpieza')
      }
    } catch (error) {
      console.error('Error inesperado:', error)
      setMensaje(`Error inesperado: ${error}`)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.adminGrid}>
        <div style={styles.contenedor}>
        <div style={styles.headerContainer}>
          <button onClick={() => navigate('/superadmin')} style={styles.botonVolver}>
            ← Volver
          </button>
          <h2 style={styles.titulo}>Administrar Usuarios</h2>
        </div>

        <input
          placeholder="Nombre"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          style={styles.input}
          onFocus={(e) => {
            e.target.style.borderColor = '#1e40af'
            e.target.style.boxShadow = '0 0 0 3px rgba(30, 64, 175, 0.1)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e2e8f0'
            e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
          }}
        />
        <input
          placeholder="Apellido"
          value={apellido}
          onChange={e => setApellido(e.target.value)}
          style={styles.input}
          onFocus={(e) => {
            e.target.style.borderColor = '#1e40af'
            e.target.style.boxShadow = '0 0 0 3px rgba(30, 64, 175, 0.1)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e2e8f0'
            e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
          }}
        />
        <input
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={styles.input}
          onFocus={(e) => {
            e.target.style.borderColor = '#1e40af'
            e.target.style.boxShadow = '0 0 0 3px rgba(30, 64, 175, 0.1)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e2e8f0'
            e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
          }}
        />
        <div style={styles.inputRow}>
          <input
            placeholder="Contraseña"
            type={mostrarPass ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={styles.input}
            onFocus={(e) => {
              e.target.style.borderColor = '#1e40af'
              e.target.style.boxShadow = '0 0 0 3px rgba(30, 64, 175, 0.1)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e2e8f0'
              e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
            }}
          />
          <button
            type="button"
            onClick={() => setMostrarPass((v: boolean) => !v)}
            title={mostrarPass ? 'Ocultar contraseña' : 'Ver contraseña'}
            style={styles.eyeBtnSolid}
          >
            {mostrarPass ? 'Ocultar' : 'Ver'}
          </button>
        </div>

        <div style={styles.rolesContainer}>
          <label style={styles.label}>Seleccioná un rol:</label>
          <div style={styles.rolesGrid}>
            {rolesDisponibles.map((r) => (
              <button
                key={r}
                onClick={() => setRol(r)}
                style={{
                  ...styles.rolBoton,
                  ...(rol === r ? styles.rolSeleccionado : {})
                }}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={crearUsuario}
          style={styles.boton}
          disabled={cargando}
          onMouseOver={(e) => {
            if (!cargando) {
              e.currentTarget.style.backgroundColor = '#1d4ed8'
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
            }
          }}
          onMouseOut={(e) => {
            if (!cargando) {
              e.currentTarget.style.backgroundColor = '#1e40af'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
            }
          }}
        >
          {cargando ? 'Creando...' : '➕ Crear Usuario'}
        </button>

        {mensaje && (
          <p style={mensaje.includes('✅') ? styles.mensajeExito : styles.mensajeError}>
            {mensaje}
          </p>
        )}
        </div>

        {/* Panel derecho: listado y eliminación */}
        <div style={styles.panelListado}>
          <h3 style={styles.panelTitulo}>Usuarios existentes</h3>
          <input
            placeholder="Buscar por nombre, apellido, email o rol"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={styles.input}
          />
          <div style={styles.listadoBox}>
            {usuariosFiltrados.map((u) => (
              <div key={u.id} style={styles.usuarioRow}>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{`${u.apellido ?? ''} ${u.nombre ?? ''}`.trim() || (u.email ?? '')}</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>{u.email}</div>
                  <div style={{ color: '#334155', fontSize: 12 }}>Rol: {u.rol}</div>
                </div>
                <button
                  style={styles.btnDelete}
                  onClick={async () => {
                    const ok = window.confirm(`¿Eliminar usuario ${u.email}?`)
                    if (!ok) return
                    const { error } = await supabaseAdmin.from('usuarios').delete().eq('id', u.id)
                    if (!error) setUsuarios((prev) => prev.filter((x) => x.id !== u.id))
                  }}
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  wrapper: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  adminGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    padding: '16px',
  },
  contenedor: {
    maxWidth: '500px',
    margin: '0',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    fontFamily: `'Segoe UI', sans-serif`,
  },
  titulo: {
    fontSize: '2.2rem',
    fontWeight: 700,
    marginBottom: '0',
    color: '#1e293b',
    textAlign: 'center',
    flex: 1,
  },
  input: {
    padding: '16px 20px',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    fontSize: '16px',
    transition: 'all 0.2s ease',
    backgroundColor: 'white',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  inputRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  eyeBtnSolid: {
    padding: '10px 12px',
    borderRadius: '10px',
    border: '2px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  label: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
  },
  rolesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  rolesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '10px',
  },
  rolBoton: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '2px solid #2563EB',
    backgroundColor: '#fff',
    color: '#2563EB',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textTransform: 'capitalize',
  },
  rolSeleccionado: {
    backgroundColor: '#2563EB',
    color: '#fff',
  },
  boton: {
    padding: '16px 24px',
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  mensajeExito: {
    color: '#059669',
    backgroundColor: '#d1fae5',
    padding: '16px',
    borderRadius: '12px',
    textAlign: 'center',
    fontWeight: '600',
    border: '2px solid #10b981',
  },
  mensajeError: {
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    padding: '16px',
    borderRadius: '12px',
    textAlign: 'center',
    fontWeight: '600',
    border: '2px solid #ef4444',
  },
  headerContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem',
  },
  botonVolver: {
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  panelListado: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px',
  },
  panelTitulo: { margin: 0, marginBottom: '8px', fontSize: '18px', fontWeight: 700, color: '#0f172a' },
  listadoBox: { border: '1px solid #e5e7eb', borderRadius: '10px', maxHeight: '540px', overflow: 'auto', background: '#fff' },
  usuarioRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #e5e7eb' },
  btnDelete: { backgroundColor: '#7f1d1d', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
}
