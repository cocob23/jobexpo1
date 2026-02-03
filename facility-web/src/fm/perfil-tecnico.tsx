import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import './responsive.css'

dayjs.locale('es')

type Tecnico = {
  id: string
  nombre: string
  apellido: string
  empresa?: string | null
  avatar_url: string
}

type Tarea = {
  descripcion: string
  fecha_realizacion: string
}

type Planilla = {
  id: number
  usuario_id: string
  tipo: 'gestion' | 'gastos'
  periodo: string
  bucket: string
  archivo_path: string
  archivo_mimetype: string
  creado_en: string
}

const TIPO_LABEL: Record<'gestion' | 'gastos', string> = {
  gestion: 'Planilla de gestión (fin de mes)',
  gastos: 'Planilla de gastos (fin de mes)',
}

export default function PerfilTecnicoFM() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tecnico, setTecnico] = useState<Tecnico | null>(null)
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [busyPlanillas, setBusyPlanillas] = useState(false)
  const [periodo, setPeriodo] = useState<string>(() => dayjs().format('YYYY-MM'))
  const [planillasMes, setPlanillasMes] = useState<Record<'gestion' | 'gastos', Planilla[]>>({
    gestion: [],
    gastos: [],
  })

  useEffect(() => {
    if (id) { fetchDatos() } else { setLoading(false) }
  }, [id])

  useEffect(() => {
    if (id) cargarPlanillasMes(id, periodo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, periodo])

  const fetchDatos = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const { data: usuario, error: errorUsuario } = await supabase
        .from('usuarios')
        .select('id, nombre, apellido, empresa')
        .eq('id', id)
        .single()

      if (errorUsuario) {
        setError(`Error al cargar datos del técnico: ${errorUsuario.message}`)
        setLoading(false)
        return
      }
      if (!usuario) {
        setError('Técnico no encontrado')
        setLoading(false)
        return
      }

      const { data: files } = await supabase.storage.from('avatars').list(`${id}`, {
        sortBy: { column: 'created_at', order: 'desc' },
      })
      let avatar_url = ''
      if (files && files.length > 0) {
        const latestFile = files[0].name
        const path = `${id}/${latestFile}`
        const { data: avatar } = supabase.storage.from('avatars').getPublicUrl(path)
        avatar_url = avatar?.publicUrl || ''
      }

      setTecnico({
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        empresa: usuario.empresa ?? null,
        avatar_url,
      })

      const { data: tareasProximas } = await supabase
        .from('trabajos_mantenimiento')
        .select('descripcion, fecha_realizacion')
        .eq('usuario_id', id)
        .gte('fecha_realizacion', new Date().toISOString())
        .order('fecha_realizacion', { ascending: true })

      setTareas(tareasProximas || [])
      setLoading(false)
    } catch (error) {
      setError('Error al cargar los datos')
      setLoading(false)
    }
  }

  async function cargarPlanillasMes(uid: string, per: string) {
    setBusyPlanillas(true)
    try {
      const { data, error } = await supabase
        .from('planillas_ext')
        .select('*')
        .eq('usuario_id', uid)
        .eq('periodo', per)
        .order('creado_en', { ascending: false })

      if (error) throw error

      const base: Record<'gestion' | 'gastos', Planilla[]> = { gestion: [], gastos: [] }
      ;(data || []).forEach((p: Planilla) => base[p.tipo].push(p))
      setPlanillasMes(base)
    } catch (e: any) {
      alert(e.message || 'No se pudieron cargar las planillas del técnico.')
    } finally {
      setBusyPlanillas(false)
    }
  }

  // Recargar manual independiza del momento en que se haya cargado "tecnico"
  async function recargar() {
    if (busyPlanillas) return
    setBusyPlanillas(true)
    try {
      const uid = id
      if (!uid) return
      await cargarPlanillasMes(uid, periodo)
    } catch (e: any) {
      console.error(e)
      alert(e?.message || 'No se pudo recargar.')
    } finally {
      setBusyPlanillas(false)
    }
  }

  async function verPlanilla(p: Planilla) {
    try {
      const { data, error } = await supabase.storage.from(p.bucket).createSignedUrl(p.archivo_path, 60 * 5)
      if (error || !data?.signedUrl) {
        console.error('SignedUrl error:', error)
        alert('No se pudo generar el enlace.')
        return
      }
      const fileName = fileNameFromPath(p.archivo_path)
      const urlConDescarga = data.signedUrl.includes('?')
        ? `${data.signedUrl}&download=${encodeURIComponent(fileName)}`
        : `${data.signedUrl}?download=${encodeURIComponent(fileName)}`

      const w = window.open(urlConDescarga, '_blank', 'noopener,noreferrer')
      if (w) return

      // Fallback
      const a = document.createElement('a')
      a.href = urlConDescarga
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (e) {
      // Último recurso: blob
      try {
        const resp = await fetch(`/storage-proxy?b=${encodeURIComponent(p.bucket)}&p=${encodeURIComponent(p.archivo_path)}`)
        if (!resp.ok) throw new Error('fetch proxy failed')
        const blob = await resp.blob()
        const blobUrl = URL.createObjectURL(blob)
        const a2 = document.createElement('a')
        a2.href = blobUrl
        a2.download = fileNameFromPath(p.archivo_path)
        document.body.appendChild(a2)
        a2.click()
        a2.remove()
        URL.revokeObjectURL(blobUrl)
      } catch {
        alert('No se pudo abrir ni descargar el archivo.')
      }
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.headerContainer}>
        <button onClick={() => navigate('/fm/tecnicos')} style={styles.botonVolver}>
          ← Volver
        </button>
        <h1 style={styles.titulo}>Perfil del Técnico</h1>
      </div>

      {loading ? (
        <p>Cargando técnico...</p>
      ) : error ? (
        <div>
          <p style={{ color: 'red' }}>{error}</p>
          <button onClick={() => fetchDatos()}>Reintentar</button>
        </div>
      ) : tecnico ? (
        <>
          <img
            src={tecnico.avatar_url || 'https://ui-avatars.com/api/?name=User'}
            alt="avatar"
            style={styles.avatar}
          />
          <h2>{tecnico.nombre} {tecnico.apellido}</h2>
          <p>Empresa asignada: {tecnico.empresa || 'Sin asignar'}</p>

          {/* --------- Planillas del técnico (solo lectura) --------- */}
          <div style={planillasUI.wrapper}>
            <h3 style={planillasUI.title}>Planillas del técnico</h3>
            <div style={planillasUI.periodRow}>
              <label style={{ marginRight: 8, color: '#1e293b' }}>Período (YYYY-MM)</label>
              <input
                type="month"
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                style={planillasUI.monthInput}
              />
              <button
                onClick={recargar}
                disabled={busyPlanillas}
                style={planillasUI.secondaryBtn}
              >
                {busyPlanillas ? 'Actualizando…' : 'Recargar'}
              </button>
            </div>

            {(['gestion', 'gastos'] as const).map((tipo) => {
              const lista = planillasMes[tipo]
              return (
                <div key={tipo} style={planillasUI.card}>
                  <div style={planillasUI.cardHead}>
                    <div style={planillasUI.cardTitle}>
                      {TIPO_LABEL[tipo]} <span style={{ color: '#475569', fontWeight: 500 }}>({lista.length}/2)</span>
                    </div>
                  </div>

                  {lista.length === 0 ? (
                    <div style={{ ...planillasUI.meta, color: '#64748b' }}>Sin archivos para este período</div>
                  ) : (
                    <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                      {lista.map((p) => (
                        <div key={p.id} style={planillasUI.rowItem}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600 }}>{fileNameFromPath(p.archivo_path)}</span>
                            <span style={{ fontSize: 12, color: '#475569' }}>
                              {p.archivo_mimetype} • subido {dayjs(p.creado_en).format('DD/MM/YYYY HH:mm')}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              style={planillasUI.secondaryBtn}
                              onClick={() => verPlanilla(p)}
                              disabled={busyPlanillas}
                            >
                              Ver / Descargar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* --------- Próximas tareas --------- */}
          <h3>Próximas tareas</h3>
          {tareas.length === 0 ? (
            <p>Sin tareas próximas</p>
          ) : (
            tareas.map((t, i) => (
              <div key={i} style={styles.tareaCard}>
                <strong>{t.descripcion}</strong>
                <p>{dayjs(t.fecha_realizacion).format('DD/MM HH:mm')} hs</p>
              </div>
            ))
          )}
        </>
      ) : (
        <p>No se encontró el técnico</p>
      )}
    </div>
  )
}

/* Helpers */
function fileNameFromPath(p: string) {
  const parts = p.split('/')
  return parts[parts.length - 1] || p
}

/* Estilos base */
const styles: { [key: string]: React.CSSProperties } = {
  container: { maxWidth: 600, margin: 'auto', padding: 24, fontFamily: 'sans-serif' },
  avatar: { width: 130, height: 130, borderRadius: '50%', border: '3px solid #1e40af', marginBottom: 16, objectFit: 'cover' },
  tareaCard: { backgroundColor: '#f3f4f6', padding: 12, borderRadius: 8, marginBottom: 10 },
  headerContainer: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' },
  titulo: { fontSize: '2.2rem', fontWeight: 700, marginBottom: '0', color: '#1e293b', textAlign: 'center', flex: 1 },
  botonVolver: {
    backgroundColor: '#6b7280', color: 'white', border: 'none', padding: '12px 20px',
    borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
    transition: 'all 0.2s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
}

/* Estilos planillas */
const planillasUI: Record<string, React.CSSProperties> = {
  wrapper: { marginTop: 24, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 },
  periodRow: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' },
  monthInput: {
    background: '#fff',
    color: '#1e293b',
    border: '2px solid #e2e8f0',
    borderRadius: 8,
    padding: '8px 10px',
    outline: 'none',
  },
  card: {
    background: '#ffffff',
    border: '2px solid #e2e8f0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
  },
  cardHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  cardTitle: { fontSize: 16, fontWeight: 700, color: '#1e293b' },
  secondaryBtn: {
    background: '#f8fafc',
    color: '#1f2937',
    border: '2px solid #e2e8f0',
    borderRadius: 10,
    padding: '8px 14px',
    cursor: 'pointer',
  },
  meta: { marginTop: 8, fontSize: 12, color: '#475569' },
  rowItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '10px 12px',
  },
}
