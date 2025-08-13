// src/mantenimiento-externo/planillas.tsx
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

function getProjectBaseUrl() {
  const anyClient = supabase as any
  if (anyClient?.restUrl) return String(anyClient.restUrl).replace('/rest/v1', '')
  if (anyClient?.storageUrl) return String(anyClient.storageUrl).replace('/storage/v1', '')
  // @ts-ignore
  if (import.meta?.env?.VITE_SUPABASE_URL) return import.meta.env.VITE_SUPABASE_URL as string
  return ''
}

export default function PlanillasTecnicosExternos() {
  const { user, loading } = useUser()
  const [busy, setBusy] = useState(false)
  const [subiendo, setSubiendo] = useState<'gestion' | 'gastos' | null>(null)
  const [planillasMes, setPlanillasMes] = useState<Record<'gestion'|'gastos', Planilla | null>>({
    gestion: null, gastos: null
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

      if (error) throw error

      const base: Record<'gestion'|'gastos', Planilla | null> = { gestion: null, gastos: null }
      ;(data || []).forEach((p: Planilla) => { base[p.tipo] = p })
      setPlanillasMes(base)
    } catch (e: any) {
      alert(e.message || 'No se pudieron cargar las planillas.')
    } finally {
      setBusy(false)
    }
  }

  async function onPickAndUpload(tipo: 'gestion'|'gastos', file?: File | null) {
    if (!userId) { alert('No hay usuario autenticado.'); return }
    if (!file) { document.getElementById(`file-input-${tipo}`)?.click(); return }

    try {
      setSubiendo(tipo)

      const name = file.name || `archivo-${tipo}`
      const mime = file.type || guessMimeFromName(name)
      const ext = getExtension(name, mime)
      const bucket = BUCKETS[tipo]
      const path = `${userId}/${periodo}.${ext}`

      const baseUrl = getProjectBaseUrl()
      if (!baseUrl) throw new Error('No se pudo resolver la URL del proyecto de Supabase.')
      const uploadUrl = `${baseUrl}/storage/v1/object/${bucket}/${path}`

      const { data: keyData } = await supabase.auth.getSession()
      const accessToken = keyData.session?.access_token
      if (!accessToken) throw new Error('No se pudo obtener token de acceso.')

      const bytes = await file.arrayBuffer()

      const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': mime,
          'x-upsert': 'true',
        } as any,
        body: bytes,
      })

      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        console.error('Upload error:', res.status, txt)
        throw new Error(`No se pudo subir el archivo (HTTP ${res.status}).`)
      }

      const { error: upsertError } = await supabase
        .from('planillas_ext')
        .upsert({
          usuario_id: userId,
          tipo,
          periodo,
          bucket,
          archivo_path: path,
          archivo_mimetype: mime,
        }, { onConflict: 'usuario_id,tipo,periodo' })

      if (upsertError) {
        console.error('Upsert error planillas_ext:', upsertError)
        alert('El archivo se subió pero no se pudo registrar en la base.')
      } else {
        await cargarPlanillasMes(userId, periodo)
        alert('Archivo subido correctamente.')
      }
    } catch (e: any) {
      alert(e.message || 'Ocurrió un problema subiendo el archivo.')
    } finally {
      setSubiendo(null)
      const el = document.getElementById(`file-input-${tipo}`) as HTMLInputElement | null
      if (el) el.value = ''
    }
  }

  // Abre en otra pestaña; si es bloqueado, usa <a target="_blank">; y como último recurso, descarga por blob
  async function verPlanilla(p: Planilla | null) {
    if (!p) { alert('Todavía no hay archivo para este período.'); return }

    const { data, error } = await supabase
      .storage
      .from(p.bucket)
      .createSignedUrl(p.archivo_path, 60 * 5)

    if (error || !data?.signedUrl) {
      console.error('SignedUrl error:', error)
      alert('No se pudo generar el enlace.')
      return
    }

    const fileName = fileNameFromPath(p.archivo_path)
    const urlConDescarga = data.signedUrl.includes('?')
      ? `${data.signedUrl}&download=${encodeURIComponent(fileName)}`
      : `${data.signedUrl}?download=${encodeURIComponent(fileName)}`

    // 1) Intento principal: abrir con window.open en nueva pestaña
    const w = window.open(urlConDescarga, '_blank', 'noopener,noreferrer')
    if (w) return

    // 2) Fallback: <a target="_blank">
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
      // 3) Último recurso: descarga por blob
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

  async function rescanStorageYRegistrar() {
    if (!userId) return
    setBusy(true)
    try {
      for (const tipo of ['gestion', 'gastos'] as const) {
        const bucket = BUCKETS[tipo]
        const prefix = `${userId}/`
        const { data: list, error } = await supabase.storage.from(bucket).list(prefix)
        if (error) continue

        const match = (list || []).find(f => f.name.startsWith(`${periodo}.`))
        if (!match) continue

        const path = `${prefix}${match.name}`
        if (!planillasMes[tipo]) {
          const mime = guessMimeFromName(match.name)
          await supabase.from('planillas_ext').upsert({
            usuario_id: userId,
            tipo,
            periodo,
            bucket,
            archivo_path: path,
            archivo_mimetype: mime,
          }, { onConflict: 'usuario_id,tipo,periodo' })
        }
      }
      await cargarPlanillasMes(userId, periodo)
      alert('Escaneo completado.')
    } catch (e: any) {
      alert(e.message || 'Error al escanear Storage.')
    } finally {
      setBusy(false)
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
        <button onClick={() => cargarPlanillasMes(userId!, periodo)} disabled={busy} style={ui.secondaryBtn}>
          Recargar
        </button>
        <button onClick={rescanStorageYRegistrar} disabled={busy} style={ui.outlineBtn}>
          Re-scan Storage y registrar
        </button>
      </div>

      {(['gestion','gastos'] as const).map((tipo) => {
        const current = planillasMes[tipo]
        return (
          <div key={tipo} style={ui.card}>
            <div style={ui.cardHead}>
              <div style={ui.cardTitle}>{TIPO_LABEL[tipo]}</div>
              <div style={ui.actions}>
                <input
                  id={`file-input-${tipo}`}
                  type="file"
                  accept=".pdf,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  style={{ display: 'none' }}
                  onChange={e => onPickAndUpload(tipo, e.target.files?.[0] || null)}
                />
                <button
                  style={ui.primaryBtn}
                  onClick={() => onPickAndUpload(tipo)}
                  disabled={!!subiendo || busy}
                >
                  {subiendo === tipo ? 'Subiendo…' : 'Subir / Reemplazar'}
                </button>
                <button
                  style={{ ...ui.secondaryBtn, ...(current ? {} : ui.disabledBtn) }}
                  onClick={() => verPlanilla(current)}
                  disabled={!current || busy}
                >
                  {current ? 'Ver / Descargar' : 'Sin archivo'}
                </button>
              </div>
            </div>

            {current && (
              <div style={ui.meta}>
                Archivo: {fileNameFromPath(current.archivo_path)} • {current.archivo_mimetype}
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
  if (lower.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
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
function fileNameFromPath(p: string) {
  const parts = p.split('/')
  return parts[parts.length - 1] || p
}

/* UI (estética clara como FM) */
const ui: Record<string, React.CSSProperties> = {
  loader: { display: 'grid', placeItems: 'center', minHeight: '60vh', fontFamily: 'system-ui', color: '#1e293b' },
  container: {
    maxWidth: 980, margin: '0 auto', padding: 16,
    color: '#1e293b',
    fontFamily: `'Segoe UI', system-ui, -apple-system, Roboto, Arial, sans-serif`,
  },
  title: { margin: '8px 0 12px', fontSize: 22, color: '#1e293b' },
  periodRow: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' },
  monthInput: {
    background: '#fff', color: '#1e293b',
    border: '2px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', outline: 'none',
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
    background: '#2563eb', color: 'white',
    border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
  },
  secondaryBtn: {
    background: '#f8fafc', color: '#1f2937',
    border: '2px solid #e2e8f0', borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
  },
  outlineBtn: {
    background: 'transparent', color: '#334155',
    border: '2px solid #334155', borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
  },
  disabledBtn: { opacity: 0.5, cursor: 'not-allowed' },
  meta: { marginTop: 8, fontSize: 12, color: '#475569' },
}
