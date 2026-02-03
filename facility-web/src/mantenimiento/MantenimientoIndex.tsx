import React, { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { FaTasks, FaTicketAlt, FaBoxOpen, FaUserCircle } from 'react-icons/fa'
import './responsive.css'

type Tarea = {
  id: string
  empresa: string
  descripcion?: string
  estado?: string
  direccion?: string
  fecha_realizacion?: string
  usuario_id?: string
}

const ESTADOS = ['Pendiente', 'En progreso', 'Realizado']

export default function MantenimientoIndex() {
  const navigate = useNavigate()
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const refs = useRef(new Map<string, HTMLDivElement | null>())

  async function obtenerTareas() {
    setLoading(true)
    setError(null)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const usuarioId = userData?.user?.id
      
      if (!usuarioId) {
        throw new Error('Usuario no encontrado')
      }

      const { data, error } = await supabase
        .from('trabajos_mantenimiento')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('fecha_realizacion', { ascending: true })
      
      if (error) throw error
      setTareas((data ?? []) as Tarea[])
    } catch (e) {
      console.error(e)
      setError('No se pudieron cargar las tareas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void obtenerTareas()
  }, [])

  const grupos = useMemo(() => {
    const map = new Map<string, Tarea[]>()
    for (const e of ESTADOS) map.set(e, [])
    for (const t of tareas) {
      const key = t.estado || 'Pendiente'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return map
  }, [tareas])

  const scrollGroup = (estado: string, dir: 'left' | 'right') => {
    const el = refs.current.get(estado)
    if (!el) return
    const offset = el.clientWidth * 0.8
    el.scrollBy({ left: dir === 'right' ? offset : -offset, behavior: 'smooth' })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const css = `
  :root{ --bg:#fff; --text:#0f172a; --muted:#64748b; --accent:#1e40af; --card-bg:#f8fafc; --card-border:#e5e7eb }
  .wrapper{ max-width:1200px; margin:0 auto; padding:24px; box-sizing:border-box }
  .header{ display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:20px; flex-wrap:wrap }
  .title{ font-size:1.5rem; font-weight:700; color:var(--text); margin:0 }
  .row{ display:flex; gap:12px; overflow-x:auto; padding-bottom:6px }
  .card{ min-width:240px; max-width:320px; background:var(--card-bg); border:1px solid var(--card-border); border-radius:12px; padding:12px; cursor:pointer }
  .empty{ color:var(--muted); padding:12px 0 }
  .quickActionsGrid{ display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin:32px 0 }
  .quickActionCard{ display:flex; flex-direction:column; align-items:center; gap:12px; padding:24px; background:var(--card-bg); border:1px solid var(--card-border); border-radius:12px; cursor:pointer; transition:all 0.2s; text-align:center }
  .quickActionCard:hover{ transform:translateY(-4px); box-shadow:0 8px 24px rgba(0,0,0,0.1); background:#fff }
  .quickActionCard svg{ color:var(--accent) }
  .quickActionCard span{ font-weight:600; color:var(--text); font-size:0.95rem }
  
  /* Responsive navbar */
  @media (max-width: 768px) {
    .navbar-center { 
      display: none !important;
    }
    .navbar-left { 
      position: static !important;
    }
    .navbar-right { 
      position: static !important;
      margin-left: auto;
    }
  }
  
  @media (max-width:640px){ 
    .card{ min-width:200px } 
    .title{ font-size:1.25rem } 
    .quickActionsGrid{ grid-template-columns:1fr 1fr; gap:12px }
  }
  `

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {/* Navbar igual a la de otros roles */}
      <nav style={styles.navbar}>
        {/* Izquierda: botón Inicio */}
        <div className="navbar-left" style={styles.left}>
          <button
            style={styles.navButtonSecondary}
            onClick={() => navigate('/mantenimiento')}
            title="Ir al inicio"
          >
            Inicio
          </button>
        </div>

        {/* Centro: logo clickeable */}
        <div className="navbar-center" style={styles.center} onClick={() => navigate('/mantenimiento')} title="Inicio">
          <img src="/logo.png" alt="Logo empresa" style={styles.logo} />
        </div>

        {/* Derecha: Perfil y Cerrar sesión */}
        <div className="navbar-right" style={styles.right}>
          <button
            style={styles.navButton}
            onClick={() => navigate('/mantenimiento/perfil')}
          >
            Perfil
          </button>
          <button
            style={{ ...styles.navButton, backgroundColor: '#ef4444' }}
            onClick={handleLogout}
          >
            Cerrar sesión
          </button>
        </div>
      </nav>

      <div style={{ paddingTop: 84 }}>
        <div className="wrapper">
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h1 className="title">Mantenimiento</h1>
            <div><button onClick={() => void obtenerTareas()} style={{ cursor: 'pointer' }}>Actualizar</button></div>
          </header>

          {loading ? <div>Cargando...</div> : error ? <div style={{ color: 'red' }}>{error}</div> : (
            Array.from(grupos.entries()).map(([estado, items]) => (
              <section key={estado} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2>{estado} ({items.length})</h2>
                  <div>
                    <button onClick={() => scrollGroup(estado, 'left')} style={{ cursor: 'pointer' }}>◀</button>
                    <button onClick={() => scrollGroup(estado, 'right')} style={{ cursor: 'pointer' }}>▶</button>
                  </div>
                </div>

                {items.length === 0 ? <div className="empty">No hay tareas</div> : (
                  <div className="row" ref={(el) => { if (el) refs.current.set(estado, el) }}>
                    {items.map((t) => (
                      <article key={t.id} className="card" onClick={() => navigate(`/mantenimiento/detalle-tarea?id=${encodeURIComponent(t.id)}`)}>
                        <strong>{t.empresa}</strong>
                        <div style={{ marginTop: 8 }}>{t.descripcion}</div>
                        <div style={{ marginTop: 8, color: '#64748b', fontSize: '0.875rem' }}>{t.direccion}</div>
                        {t.fecha_realizacion && <div style={{ marginTop: 8, color: '#64748b' }}>{new Date(t.fecha_realizacion).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}hs.</div>}
                        <div style={{ 
                          marginTop: 8, 
                          fontWeight: 600,
                          color: t.estado === 'Pendiente' ? '#dc2626' : t.estado === 'Realizado' ? '#16a34a' : '#f59e0b'
                        }}>
                          {t.estado || 'Pendiente'}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            ))
          )}

          {/* Accesos rápidos a funcionalidades */}
          <div style={{ marginTop: 48, borderTop: '2px solid #e5e7eb', paddingTop: 32 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 24 }}>Accesos Rápidos</h2>
            <div className="quickActionsGrid">
              <div className="quickActionCard" onClick={() => navigate('/mantenimiento/tareas')}>
                <FaTasks size={32} />
                <span>Mis Tareas</span>
              </div>

              <div className="quickActionCard" onClick={() => navigate('/mantenimiento/tickets')}>
                <FaTicketAlt size={32} />
                <span>Tickets</span>
              </div>

              <div className="quickActionCard" onClick={() => navigate('/mantenimiento/cargar-ticket')}>
                <FaTicketAlt size={32} />
                <span>Cargar Ticket</span>
              </div>

              <div className="quickActionCard" onClick={() => navigate('/mantenimiento/inventario')}>
                <FaBoxOpen size={32} />
                <span>Inventario</span>
              </div>

              <div className="quickActionCard" onClick={() => navigate('/mantenimiento/perfil')}>
                <FaUserCircle size={32} />
                <span>Mi Perfil</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  navbar: {
    position: 'fixed',
    top: 0, left: 0, right: 0,
    height: 70,
    backgroundColor: '#e9ecf1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    zIndex: 1000,
    flexWrap: 'wrap',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  center: {
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto',
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
  },
  logo: {
    height: 45,
    objectFit: 'contain',
    display: 'block',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  navButton: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '10px 16px',
    borderRadius: 6,
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14,
  },
  navButtonSecondary: {
    backgroundColor: '#6b7280',
    color: '#fff',
    border: 'none',
    padding: '10px 16px',
    borderRadius: 6,
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14,
  },
}
