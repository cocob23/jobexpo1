// src/superadmin/perfil-tecnico.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ToastProvider'
import dayjs from 'dayjs'
import 'dayjs/locale/es'

dayjs.locale('es')

type Tecnico = {
  id: string
  nombre: string
  apellido: string
  empresa?: string | null
  avatar_url: string
  horario_llegada?: string | null
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
  const toast = useToast()
  const [tecnico, setTecnico] = useState<Tecnico | null>(null)
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Inventario asignado al técnico
  const [itemsAsignados, setItemsAsignados] = useState<Array<{ id: string; tipo: string; descripcion: string; cantidad: number }>>([])
  const [devolviendoId, setDevolviendoId] = useState<string | null>(null)

  // ---- Planillas (solo lectura para SA) ----
  const [busyPlanillas, setBusyPlanillas] = useState(false)
  const [periodo, setPeriodo] = useState<string>(() => dayjs().format('YYYY-MM'))
  const [planillasMes, setPlanillasMes] = useState<Record<'gestion' | 'gastos', Planilla | null>>({
    gestion: null,
    gastos: null,
  })

  // UI: toasts y estado de subida de documentos
  const [subiendoDoc, setSubiendoDoc] = useState<null | 'poliza' | 'acta'>(null)

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
        .select('id, nombre, apellido, horario_llegada')
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
        horario_llegada: usuario.horario_llegada || null,
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

      // Inventario asignado (estado 'entregado')
      const { data: asignado, error: invErr } = await supabase
        .from('inventario')
        .select('id, tipo, descripcion, cantidad')
        .eq('usuario_id', id)
        .eq('estado', 'entregado')
        .order('tipo', { ascending: true })
      if (invErr) throw invErr
      setItemsAsignados((asignado as any[])?.map((r) => ({ id: r.id, tipo: r.tipo, descripcion: r.descripcion, cantidad: r.cantidad ?? 0 })) || [])

      setLoading(false)
    } catch (err) {
      console.error('Error en fetchDatos:', err)
      setError('Error al cargar los datos')
      setLoading(false)
    }
  }
  async function devolverAlStock(item: { id: string; tipo: string; descripcion: string; cantidad: number }) {
    if (!id) return
    if (item.cantidad <= 0) return
    const cant = 1 // por ahora devolvemos de a 1; se puede ampliar a selector
    try {
      setDevolviendoId(item.id)
      // 1) Descontar o eliminar la fila del técnico (estado entregado)
      const nuevaCantTec = item.cantidad - cant
      if (nuevaCantTec > 0) {
        const { error: upTecErr } = await supabase
          .from('inventario')
          .update({ cantidad: nuevaCantTec })
          .eq('id', item.id)
        if (upTecErr) throw upTecErr
      } else {
        const { error: delTecErr } = await supabase
          .from('inventario')
          .delete()
          .eq('id', item.id)
        if (delTecErr) throw delTecErr
      }

      // 2) Merge al stock (usuario_id null, estado stock, mismo tipo+descripcion)
      const { data: stockRow, error: findErr } = await supabase
        .from('inventario')
        .select('id, cantidad')
        .is('usuario_id', null)
        .eq('estado', 'stock')
        .eq('tipo', item.tipo)
        .eq('descripcion', item.descripcion)
        .maybeSingle()
      if (findErr) throw findErr

      if (stockRow?.id) {
        const { error: upStockErr } = await supabase
          .from('inventario')
          .update({ cantidad: (stockRow.cantidad ?? 0) + cant })
          .eq('id', stockRow.id)
        if (upStockErr) throw upStockErr
      } else {
        const { error: insStockErr } = await supabase
          .from('inventario')
          .insert({ usuario_id: null, tipo: item.tipo, descripcion: item.descripcion, cantidad: cant, estado: 'stock' })
        if (insStockErr) throw insStockErr
      }

      // Refresh asignados
      await fetchDatos()
      alert('Devolución realizada al stock')
    } catch (e: any) {
      console.error(e)
      alert(e?.message || 'No se pudo devolver al stock')
    } finally {
      setDevolviendoId(null)
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
  toast.error('Error al descargar el archivo')
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
      toast.error('Error eliminando el archivo')
      return
    }
    const campo = tipo === 'poliza' ? 'poliza_url' : 'acta_compromiso_url'
    await supabase.from('documentos_tecnicos').update({ [campo]: null }).eq('tecnico_id', id)
    fetchDatos()
  toast.success('Archivo eliminado')
  }

  const subir = async (tipo: 'poliza' | 'acta') => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/pdf'
    input.onchange = async (e: any) => {
      const file: File | undefined = e.target.files?.[0]
      if (!file || !id) return
      try {
        setSubiendoDoc(tipo)
        const bucket = tipo === 'poliza' ? 'polizas' : 'actacompromiso'
        const path = `${id}/${tipo}.pdf`
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(path, file, {
            contentType: file.type || 'application/pdf',
            upsert: true,
          })
        if (uploadError) {
          console.error('Upload error:', uploadError)
          toast.error(`Error subiendo archivo: ${uploadError.message}`)
          return
        }

        // Obtener URL pública (asumiendo bucket público). Si es privado, migrar a signed URL persistente en DB.
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path)
        const campo = tipo === 'poliza' ? 'poliza_url' : 'acta_compromiso_url'
        // Update-or-insert para no depender de UNIQUE(tecnico_id)
        const { data: updData, error: updErr } = await supabase
          .from('documentos_tecnicos')
          .update({ [campo]: pub?.publicUrl })
          .eq('tecnico_id', id)
          .select('tecnico_id')

        if (updErr) {
          console.error('DB update error:', updErr)
          toast.error('Error al guardar la URL del archivo')
          return
        }

        if (!updData || updData.length === 0) {
          const { error: insErr } = await supabase
            .from('documentos_tecnicos')
            .insert([{ tecnico_id: id, [campo]: pub?.publicUrl }])
          if (insErr) {
            console.error('DB insert error:', insErr)
            toast.error('Error al guardar la URL del archivo')
            return
          }
        }
        toast.success('Archivo subido exitosamente')
        fetchDatos()
      } catch (err: any) {
        console.error('Unexpected upload error:', err)
        toast.error('Error inesperado al subir archivo')
      } finally {
        setSubiendoDoc(null)
      }
    }
    input.click()
  }

  return (
    <div style={styles.container}>
      {/* Toasts globales montados en App via ToastProvider */}
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

          {/* ---------- Horario de llegada ---------- */}
          <div style={styles.horarioCard}>
            <h3>Horario de llegada</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <input
                type="time"
                value={tecnico.horario_llegada || ''}
                onChange={async (e) => {
                  const val = e.target.value || null
                  setTecnico(t => t ? { ...t, horario_llegada: val } : t)
                }}
                style={styles.monthInput}
              />
              <button
                style={planillasUI.secondaryBtn}
                onClick={async () => {
                  if (!tecnico?.id) return
                  try {
                    const { error } = await supabase
                      .from('usuarios')
                      .update({ horario_llegada: tecnico.horario_llegada || null })
                      .eq('id', tecnico.id)
                    if (error) throw error
                    toast.success('Horario de llegada actualizado')
                  } catch (e: any) {
                    toast.error(e.message || 'No se pudo guardar el horario')
                  }
                }}
              >
                Guardar horario
              </button>
              {tecnico.horario_llegada && (
                <button
                  style={planillasUI.secondaryBtn}
                  onClick={async () => {
                    if (!tecnico?.id) return
                    try {
                      const { error } = await supabase
                        .from('usuarios')
                        .update({ horario_llegada: null })
                        .eq('id', tecnico.id)
                      if (error) throw error
                      setTecnico(t => t ? { ...t, horario_llegada: null } : t)
                      toast.info('Horario eliminado')
                    } catch (e: any) {
                      toast.error(e.message || 'No se pudo eliminar el horario')
                    }
                  }}
                >
                  Quitar horario
                </button>
              )}
            </div>
          </div>

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

          {/* ---------- Inventario asignado al técnico ---------- */}
          <h3>Inventario asignado</h3>
          {itemsAsignados.length === 0 ? (
            <p>Sin elementos asignados</p>
          ) : (
            <div style={invUI.table}>
              <div style={invUI.thead}>
                <div>Tipo</div>
                <div>Descripción</div>
                <div style={{ textAlign: 'right' }}>Cantidad</div>
                <div style={{ textAlign: 'right' }}>Acciones</div>
              </div>
              <div>
                {itemsAsignados.map((it) => (
                  <div key={it.id} style={invUI.tr}>
                    <div>{it.tipo}</div>
                    <div>{it.descripcion}</div>
                    <div style={{ textAlign: 'right' }}>{it.cantidad}</div>
                    <div style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => devolverAlStock(it)}
                        disabled={devolviendoId === it.id || it.cantidad <= 0}
                        style={invUI.btnReturn}
                      >
                        {devolviendoId === it.id ? 'Devolviendo…' : 'Devolver al stock'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ---------- Documentos (póliza/acta) ---------- */}
          <h3>Documentos</h3>
          <div style={styles.buttonContainer}>
            <button
              style={styles.uploadButton}
              onClick={() => subir('poliza')}
              disabled={subiendoDoc === 'poliza' || subiendoDoc === 'acta'}
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
              {subiendoDoc === 'poliza' ? '⏳ Subiendo póliza…' : '📄 Subir póliza'}
            </button>
            <button
              style={styles.uploadButton}
              onClick={() => subir('acta')}
              disabled={subiendoDoc === 'poliza' || subiendoDoc === 'acta'}
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
              {subiendoDoc === 'acta' ? '⏳ Subiendo acta…' : '📄 Subir acta'}
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
  horarioCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    border: '2px solid #e2e8f0',
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

const invUI: Record<string, React.CSSProperties> = {
  table: { border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginTop: 8 },
  thead: { display: 'grid', gridTemplateColumns: '140px 1fr 120px 160px', gap: 8, padding: 10, background: '#f1f5f9', fontWeight: 700, color: '#0f172a' },
  tr: { display: 'grid', gridTemplateColumns: '140px 1fr 120px 160px', gap: 8, padding: 10, borderTop: '1px solid #e5e7eb', alignItems: 'center' },
  btnReturn: { background: '#6b7280', color: '#fff', border: 'none', padding: '8px 10px', borderRadius: 8, cursor: 'pointer' },
}
