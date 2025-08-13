// src/superadmin/perfil-tecnico.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import dayjs from 'dayjs'
import 'dayjs/locale/es'

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
  bucket: string        // 'planillas_gestion' | 'planillas_gastos'
  archivo_path: string  // ej: <uid>/YYYY-MM.xlsx
  archivo_mimetype: string
  creado_en: string
}

const BUCKETS: Record<'gestion' | 'gastos', string> = {
  gestion: 'planillas_gestion',
  gastos: 'planillas_gastos',
}

const TIPO_LABEL: Record<'gestion' | 'gastos', string> = {
  gestion: 'Planilla de gestión (fin de mes)',
  gastos: 'Planilla de gastos (fin de mes)',
}

export default function PerfilTecnicoSA() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tecnico, setTecnico] = useState<Tecnico | null>(null)
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ---- Planillas (solo lectura para SA) ----
  const [busyPlanillas, setBusyPlanillas] = useState(false)
  const [periodo, setPeriodo] = useState<string>(() => dayjs().format('YYYY-MM'))
  const [planillasMes, setPlanillasMes] = useState<Record<'gestion' | 'gastos', Planilla | null>>({
    gestion: null,
    gastos: null,
  })

  useEffect(() => {
    if (id) {
      fetchDatos()
    } else {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) {
      cargarPlanillasMes(id, periodo)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, periodo])

  const fetchDatos = async () => {
    if (!id) return
    setLoading(true)
    setError(null)

    try {
      const { data: usuario, error: errorUsuario } = await supabase
        .from('usuarios')
        .select('id, nombre, apellido')
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

      // Avatar (último archivo en /avatars/<id>/)
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
        empresa: null,
        avatar_url,
      })

      const { data: tareasProximas } = await supabase
        .from('trabajos_mantenimiento')
        .select('descripcion, fecha_realizacion')
        .eq('usuario_id', id)
        .gte('fecha_realizacion', new Date().toISOString())
        .order('fecha_realizacion', { ascending: true })

      setTareas(tareasProximas || [])

      // Si en el futuro querés mostrar algo de documentos_tecnicos:
      await supabase.from('documentos_tecnicos').select('*').eq('tecnico_id', id).maybeSingle()

      setLoading(false)
    } catch (err) {
      console.error('Error en fetchDatos:', err)
      setError('Error al cargar los datos')
      setLoading(false)
    }
  }

  // ------- Planillas: carga y abrir en nueva pestaña -------
  async function cargarPlanillasMes(uid: string, per: string) {
    setBusyPlanillas(true)
    try {
      const { data, error } = await supabase
        .from('planillas_ext')
        .select('*')
        .eq('usuario_id', uid)
        .eq('periodo', per)

      if (error) throw error

      const base: Record<'gestion' | 'gastos', Planilla | null> = { gestion: null, gastos: null }
      ;(data || []).forEach((p: Planilla) => {
        base[p.tipo] = p
      })
      setPlanillasMes(base)
    } catch (e: any) {
      alert(e.message || 'No se pudieron cargar las planillas del técnico.')
    } finally {
      setBusyPlanillas(false)
    }
  }

  async function verPlanilla(p: Planilla | null) {
    if (!p) {
      alert('Todavía no hay archivo para este período.')
      return
    }
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

    // Fallback si bloquean el popup
    try {
      const a = document.createElement('a')
      a.href = urlConDescarga
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      a.remove()
      return
    } catch {
      // Último recurso: descarga por blob
      try {
        const resp = await fetch(data.signedUrl)
        const blob = await resp.blob()
        const blobUrl = URL.createObjectURL(blob)
        const a2 = document.createElement('a')
        a2.href = blobUrl
        a2.download = fileName
        document.body.appendChild(a2)
        a2.click()
        a2.remove()
        URL.revokeObjectURL(blobUrl)
      } catch (e) {
        alert('No se pudo abrir ni descargar el archivo.')
      }
    }
  }

  // ------- Documentos (póliza/acta) - tu lógica actual -------
  const descargar = async (tipo: 'poliza' | 'acta') => {
    if (!id) {
      alert('No hay ID de técnico')
      return
    }
    const bucket = tipo === 'poliza' ? 'polizas' : 'actacompromiso'
    const path = `${id}/${tipo}.pdf`

    try {
      const { data: listData, error: listError } = await supabase.storage.from(bucket).list(`${id}`)
      if (listError) {
        alert('Error al verificar archivos')
        return
      }
      const fileExists = listData?.some((file) => file.name === `${tipo}.pdf`)
      if (!fileExists) {
        alert(`No existe ${tipo === 'poliza' ? 'la póliza' : 'el acta'}`)
        return
      }
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)
      if (!urlData?.publicUrl) {
        alert('Error al generar el enlace de descarga')
        return
      }

      // Descarga por blob (y fallback a abrir en pestaña)
      try {
        const head = await fetch(urlData.publicUrl, { method: 'HEAD' })
        if (!head.ok) throw new Error(`HTTP ${head.status}`)

        const resp = await fetch(urlData.publicUrl)
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

        const blob = await resp.blob()
        if (blob.size === 0) {
          alert('El archivo descargado está vacío')
          return
        }
        const blobUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = `${tipo}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(blobUrl)
      } catch {
        window.open(urlData.publicUrl, '_blank')
      }
    } catch (error) {
      alert('Error al descargar el archivo')
    }
  }

  const eliminar = async (tipo: 'poliza' | 'acta') => {
    if (!id) return
    const confirmado = window.confirm(`¿Está seguro que desea eliminar la ${tipo}?`)
    if (!confirmado) return
    const bucket = tipo === 'poliza' ? 'polizas' : 'actacompromiso'
    const path = `${id}/${tipo}.pdf`
    const { error: errorRemove } = await supabase.storage.from(bucket).remove([path])
    if (errorRemove) {
      alert('Error eliminando el archivo')
      return
    }
    const campo = tipo === 'poliza' ? 'poliza_url' : 'acta_compromiso_url'
    await supabase.from('documentos_tecnicos').update({ [campo]: null }).eq('tecnico_id', id)
    fetchDatos()
  }

  const subir = async (tipo: 'poliza' | 'acta') => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/pdf'
    input.onchange = async (e: any) => {
      const file = e.target.files[0]
      if (!file || !id) return
      try {
        const reader = new FileReader()
        reader.onload = async (event) => {
          const result = event.target?.result
          if (!(result instanceof ArrayBuffer)) {
            alert('Error al procesar el archivo')
            return
          }
          const bucket = tipo === 'poliza' ? 'polizas' : 'actacompromiso'
          const path = `${id}/${tipo}.pdf`
          const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(path, result, { contentType: 'application/pdf', upsert: true })
          if (uploadError) {
            alert(`Error subiendo archivo: ${uploadError.message}`)
            return
          }
          const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path)
          const campo = tipo === 'poliza' ? 'poliza_url' : 'acta_compromiso_url'
          const { error: upsertError } = await supabase.from('documentos_tecnicos').upsert([
            { tecnico_id: id, [campo]: pub?.publicUrl },
          ])
          if (upsertError) {
            alert('Error al guardar la URL del archivo')
            return
          }
          alert('Archivo subido exitosamente')
          fetchDatos()
        }
        reader.onerror = () => alert('Error al leer el archivo')
        reader.readAsArrayBuffer(file)
      } catch {
        alert('Error inesperado al subir archivo')
      }
    }
    input.click()
  }

  return (
    <div style={styles.container}>
      <div style={styles.headerContainer}>
        <button onClick={() => navigate('/superadmin/tecnicos')} style={styles.botonVolver}>
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
          <h2>
            {tecnico.nombre} {tecnico.apellido}
          </h2>
          <p>Empresa asignada: {tecnico.empresa || 'Sin asignar'}</p>

          {/* ---------- Planillas del técnico (solo lectura para SA) ---------- */}
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
                onClick={() => cargarPlanillasMes(tecnico.id, periodo)}
                disabled={busyPlanillas}
                style={planillasUI.secondaryBtn}
              >
                Recargar
              </button>
            </div>

            {(['gestion', 'gastos'] as const).map((tipo) => {
              const current = planillasMes[tipo]
              return (
                <div key={tipo} style={planillasUI.card}>
                  <div style={planillasUI.cardHead}>
                    <div style={planillasUI.cardTitle}>{TIPO_LABEL[tipo]}</div>
                    <div style={planillasUI.actions}>
                      <button
                        style={{ ...planillasUI.secondaryBtn, ...(current ? {} : planillasUI.disabledBtn) }}
                        onClick={() => verPlanilla(current)}
                        disabled={!current || busyPlanillas}
                      >
                        {current ? 'Ver / Descargar' : 'Sin archivo'}
                      </button>
                    </div>
                  </div>

                  {current && (
                    <div style={planillasUI.meta}>
                      Archivo: {fileNameFromPath(current.archivo_path)} • {current.archivo_mimetype}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* ---------- Próximas tareas ---------- */}
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

          {/* ---------- Documentos (póliza/acta) ---------- */}
          <h3>Documentos</h3>
          <div style={styles.buttonContainer}>
            <button
              style={styles.uploadButton}
              onClick={() => subir('poliza')}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#1d4ed8'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#1e40af'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              📄 Subir póliza
            </button>
            <button
              style={styles.uploadButton}
              onClick={() => subir('acta')}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#1d4ed8'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#1e40af'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              📄 Subir acta
            </button>
            <button
              style={styles.downloadButton}
              onClick={() => descargar('poliza')}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#047857'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#059669'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              ⬇️ Descargar póliza
            </button>
            <button
              style={styles.downloadButton}
              onClick={() => descargar('acta')}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#047857'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#059669'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              ⬇️ Descargar acta compromiso
            </button>
            <button
              style={styles.deleteButton}
              onClick={() => eliminar('poliza')}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#b91c1c'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#dc2626'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              🗑️ Eliminar póliza
            </button>
            <button
              style={styles.deleteButton}
              onClick={() => eliminar('acta')}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#b91c1c'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#dc2626'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              🗑️ Eliminar acta
            </button>
          </div>
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

/* Estilos */
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: 600,
    margin: 'auto',
    padding: 24,
    fontFamily: 'sans-serif',
  },
  headerContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '2rem',
  },
  titulo: {
    fontSize: '2.2rem',
    fontWeight: 700,
    marginBottom: '0',
    color: '#1e293b',
    textAlign: 'center',
    flex: 1,
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
  avatar: {
    width: 130,
    height: 130,
    borderRadius: '50%',
    border: '3px solid #1e40af',
    marginBottom: 16,
    objectFit: 'cover',
  },
  tareaCard: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginTop: 16,
  },
  uploadButton: {
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    padding: '14px 20px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  downloadButton: {
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    padding: '14px 20px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '14px 20px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
}

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
  actions: { display: 'flex', gap: 8, alignItems: 'center' },
  secondaryBtn: {
    background: '#f8fafc',
    color: '#1f2937',
    border: '2px solid #e2e8f0',
    borderRadius: 10,
    padding: '8px 14px',
    cursor: 'pointer',
  },
  disabledBtn: { opacity: 0.5, cursor: 'not-allowed' },
  meta: { marginTop: 8, fontSize: 12, color: '#475569' },
}
