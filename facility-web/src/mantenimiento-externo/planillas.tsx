import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { supabase } from '../lib/supabase'
import { useUser } from '../hooks/useUser'

dayjs.locale('es')

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

const BUCKETS: Record<'gestion' | 'gastos', string> = {
  gestion: 'planillas_gestion',
  gastos: 'planillas_gastos',
}

// Máximo permitido por tipo y mes
const MAX_POR_TIPO = 2

function getProjectBaseUrl() {
  const anyClient = supabase as any
  if (anyClient?.restUrl) return String(anyClient.restUrl).replace('/rest/v1', '')
  if (anyClient?.storageUrl) return String(anyClient.storageUrl).replace('/storage/v1', '')
  // Para Create React App, las variables de entorno usan process.env.REACT_APP_
  if (process.env.REACT_APP_SUPABASE_URL) return process.env.REACT_APP_SUPABASE_URL as string
  return ''
}

export default function PlanillasTecnicosExternos() {
  const { user, loading } = useUser()
  const [busy, setBusy] = useState(false)
  const [subiendo, setSubiendo] = useState<'gestion' | 'gastos' | null>(null)

  // Arrays por tipo (múltiples archivos por mes, tope 2)
  const [planillasMes, setPlanillasMes] = useState<Record<'gestion' | 'gastos', Planilla[]>>({
    gestion: [],
    gastos: [],
  })

  const [periodo, setPeriodo] = useState<string>(() => dayjs().format('YYYY-MM'))
  const userId = user?.id ?? null

  useEffect(() => {
    if (!loading && userId) cargarPlanillasMes(userId, periodo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, userId, periodo])

  async function cargarPlanillasMes(uid: string, per: string) {
    setBusy(true)
    try {
      const { data, error } = await supabase
        .from('planillas_ext')
        .select('*')
        .eq('usuario_id', uid)
        .eq('periodo', per)
        .order('creado_en', { ascending: false })

      if (error) throw error

      const base: Record<'gestion' | 'gastos', Planilla[]> = { gestion: [], gastos: [] }
      ;(data || []).forEach((p: Planilla) => {
        base[p.tipo].push(p)
      })
      setPlanillasMes(base)
    } catch (e: any) {
      alert(e.message || 'No se pudieron cargar las planillas.')
    } finally {
      setBusy(false)
    }
  }

  // Recargar manual: vuelve a resolver el uid si fuera necesario
  async function recargar() {
    if (busy) return
    setBusy(true)
    try {
      let uid = userId
      if (!uid) {
        const { data } = await supabase.auth.getUser()
        uid = data.user?.id ?? null
      }
      if (!uid) {
        alert('No hay usuario autenticado.')
        return
      }
      await cargarPlanillasMes(uid, periodo)
    } catch (e: any) {
      console.error(e)
      alert(e?.message || 'No se pudo recargar.')
    } finally {
      setBusy(false)
    }
  }

  // Subida (respeta tope 2 por tipo). Permite seleccionar varios, recorta según cupo restante.
  async function onPickAndUpload(tipo: 'gestion' | 'gastos', files?: FileList | null) {
    if (!userId) {
      alert('No hay usuario autenticado.')
      return
    }
    const existentes = planillasMes[tipo].length
    const cupo = Math.max(0, MAX_POR_TIPO - existentes)

    if (!files) {
      if (cupo === 0) {
        alert('Ya alcanzaste el máximo de 2 archivos para este tipo en el mes.')
        return
      }
      document.getElementById(`file-input-${tipo}`)?.click()
      return
    }
    if (!files.length) return
    if (cupo === 0) {
      alert('Ya alcanzaste el máximo de 2 archivos para este tipo en el mes.')
      return
    }

    const seleccion = Array.from(files).slice(0, cupo)
    if (files.length > cupo) {
      alert(`Solo se subirán ${cupo} archivo(s) por alcanzar el tope de ${MAX_POR_TIPO}.`)
    }

    try {
      setSubiendo(tipo)

      const bucket = BUCKETS[tipo]
      const baseUrl = getProjectBaseUrl()
      if (!baseUrl) throw new Error('No se pudo resolver la URL del proyecto de Supabase.')

      const { data: keyData } = await supabase.auth.getSession()
      const accessToken = keyData.session?.access_token
      if (!accessToken) throw new Error('No se pudo obtener token de acceso.')

      for (let i = 0; i < seleccion.length; i++) {
        const file = seleccion[i]
        const name = file.name || `archivo-${tipo}-${i + 1}`
        const mime = file.type || guessMimeFromName(name)
        const ext = getExtension(name, mime)
        const safeName = sanitizeFilename(name.replace(/\.[^/.]+$/, ''))
        const timestamp = Date.now()

        // path único por archivo (evita reemplazo)
        const path = `${userId}/${periodo}/${timestamp}-${i + 1}-${safeName}.${ext}`

        const uploadUrl = `${baseUrl}/storage/v1/object/${bucket}/${path}`
        const bytes = await file.arrayBuffer()

        const res = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': mime,
            'x-upsert': 'true', // no pisa porque el path es único
          } as any,
          body: bytes,
        })

        if (!res.ok) {
          const txt = await res.text().catch(() => '')
          console.error('Upload error:', res.status, txt)
          throw new Error(`No se pudo subir "${name}" (HTTP ${res.status}).`)
        }

        // Insert (NO upsert): permitimos múltiples filas
        const { error: insertError } = await supabase.from('planillas_ext').insert({
          usuario_id: userId,
          tipo,
          periodo,
          bucket,
          archivo_path: path,
          archivo_mimetype: mime,
        })

        if (insertError) {
          console.error('Insert error planillas_ext:', insertError)
          alert(`"${name}" se subió pero no se pudo registrar en la base: ${insertError.message}`)
        }
      }

      await cargarPlanillasMes(userId, periodo)
      alert('Archivo(s) subido(s) correctamente.')
    } catch (e: any) {
      alert(e.message || 'Ocurrió un problema subiendo archivo(s).')
    } finally {
      setSubiendo(null)
      const el = document.getElementById(`file-input-${tipo}`) as HTMLInputElement | null
      if (el) el.value = ''
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

      // Fallback si el navegador bloquea popups
      const a = document.createElement('a')
      a.href = urlConDescarga
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch {
      // Último recurso: no tiramos a blob aquí para mantener simple
      alert('No se pudo abrir ni descargar el archivo.')
    }
  }

  if (loading) return <div style={ui.loader}>Cargando…</div>

  return (
    <div style={ui.container}>
      <h2 style={ui.title}>Planillas</h2>

      {/* Selector de período */}
      <div style={ui.periodRow}>
        <label style={{ marginRight: 8, color: '#1e293b' }}>Período (YYYY-MM)</label>
        <input
          type="month"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          style={ui.monthInput}
        />
        <button
          onClick={recargar}
          disabled={busy}
          style={ui.secondaryBtn}
        >
          {busy ? 'Actualizando…' : 'Recargar'}
        </button>
      </div>

      {(['gestion', 'gastos'] as const).map((tipo) => {
        const lista = planillasMes[tipo]
        const existentes = lista.length
        const cupo = Math.max(0, MAX_POR_TIPO - existentes)
        const disabledUpload = cupo === 0 || !!subiendo || busy

        return (
          <div key={tipo} style={ui.card}>
            <div style={ui.cardHead}>
              <div style={ui.cardTitle}>
                {TIPO_LABEL[tipo]}{' '}
                <span style={{ color: '#475569', fontWeight: 500 }}>
                  ({existentes}/{MAX_POR_TIPO})
                </span>
              </div>

              <div style={ui.actions}>
                {/* input oculto (multiple) */}
                <input
                  id={`file-input-${tipo}`}
                  type="file"
                  multiple
                  accept=".pdf,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  style={{ display: 'none' }}
                  onChange={(e) => onPickAndUpload(tipo, e.target.files)}
                />
                <button
                  title={
                    cupo === 0
                      ? 'Alcanzaste el máximo para este mes'
                      : `Podés subir hasta ${cupo} archivo(s)`
                  }
                  style={{ ...ui.primaryBtn, ...(disabledUpload ? ui.disabledBtn : {}) }}
                  onClick={() => onPickAndUpload(tipo, null)}
                  disabled={disabledUpload}
                >
                  {subiendo === tipo ? 'Subiendo…' : cupo === 0 ? 'Máximo alcanzado' : 'Subir archivo(s)'}
                </button>
              </div>
            </div>

            {/* Lista de archivos del mes para ese tipo */}
            {lista.length === 0 ? (
              <div style={{ ...ui.meta, color: '#64748b' }}>Sin archivos para este período</div>
            ) : (
              <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                {lista.map((p) => (
                  <div key={p.id} style={ui.rowItem}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600 }}>{fileNameFromPath(p.archivo_path)}</span>
                      <span style={{ fontSize: 12, color: '#475569' }}>
                        {p.archivo_mimetype} • subido {dayjs(p.creado_en).format('DD/MM/YYYY HH:mm')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={ui.secondaryBtn} onClick={() => verPlanilla(p)} disabled={busy}>
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
  )
}

/* Helpers */
function guessMimeFromName(name: string) {
  const lower = name.toLowerCase()
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.xlsx'))
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  if (lower.endsWith('.xls')) return 'application/vnd.ms-excel'
  return 'application/octet-stream'
}
function getExtension(name: string, mime: string) {
  const lower = name.toLowerCase()
  if (lower.endsWith('.pdf')) return 'pdf'
  if (lower.endsWith('.xlsx')) return 'xlsx'
  if (lower.endsWith('.xls')) return 'xls'
  if (mime === 'application/pdf') return 'pdf'
  if (mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'xlsx'
  if (mime === 'application/vnd.ms-excel') return 'xls'
  return 'bin'
}
function sanitizeFilename(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}
function fileNameFromPath(p: string) {
  const parts = p.split('/')
  return parts[parts.length - 1] || p
}

/* UI */
const ui: Record<string, React.CSSProperties> = {
  loader: { display: 'grid', placeItems: 'center', minHeight: '60vh', fontFamily: 'system-ui', color: '#1e293b' },
  container: {
    maxWidth: 980,
    margin: '0 auto',
    padding: 16,
    color: '#1e293b',
    fontFamily: `'Segoe UI', system-ui, -apple-system, Roboto, Arial, sans-serif`,
  },
  title: { margin: '8px 0 12px', fontSize: 22, color: '#1e293b' },
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
  primaryBtn: {
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    padding: '8px 14px',
    cursor: 'pointer',
  },
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
  rowItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '10px 12px',
  },
}
