// src/superadmin/empresas-clientes.tsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoBusinessOutline,
  IoPricetagOutline,
  IoMailOutline,
  IoCallOutline,
  IoLocationOutline,
  IoTrashOutline,
  IoSearchOutline,
} from 'react-icons/io5'
import { supabase } from '../lib/supabase'

type Empresa = {
  id: string
  nombre: string
  cuit: string | null
  email: string | null
  telefono: string | null
  direccion: string | null
  localidad: string | null
  provincia: string | null
  slug: string
}

const fmtCUIT = (c: string | null) => {
  if (!c) return '—'
  const d = c.replace(/\D/g, '')
  if (d.length !== 11) return c
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`
}

export default function EmpresasClientesSA() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [list, setList] = useState<Empresa[]>([])

  // Buscador
  const [term, setTerm] = useState('')
  const [appliedTerm, setAppliedTerm] = useState('') // se aplica al tocar "Buscar"

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchEmpresas = useCallback(async () => {
    setError(null)
    const { data, error } = await supabase
      .from('empresas')
      .select('id,nombre,cuit,email,telefono,direccion,localidad,provincia,slug')
      .order('nombre', { ascending: true })
    if (error) {
      setError(error.message || 'No se pudo cargar el listado.')
    } else {
      setList(data || [])
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchEmpresas().finally(() => setLoading(false))
  }, [fetchEmpresas])

  const filtered = useMemo(() => {
    const q = appliedTerm.trim().toLowerCase()
    if (!q) return list
    return list.filter((e) => e.nombre.toLowerCase().includes(q))
  }, [list, appliedTerm])

  const onSearch = () => setAppliedTerm(term)
  const onClear = () => {
    setTerm('')
    setAppliedTerm('')
  }

  const onDelete = async (row: Empresa) => {
    const ok = window.confirm('SEGURO QUE DESEA ELIMINAR ESTA EMPRESA / CLIENTE?')
    if (!ok) return
    try {
      setDeletingId(row.id)
      const { error } = await supabase.from('empresas').delete().eq('id', row.id)
      if (error) throw error
      setList((xs) => xs.filter((e) => e.id !== row.id))
    } catch (e: any) {
      alert(e?.message || 'No se pudo eliminar la empresa.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div style={styles.page}>
      {/* Header con volver + título (centrado con slots simétricos) */}
      <div style={styles.headerRow}>
        <div style={styles.headerSlot}>
          <button
            type="button"
            onClick={() => navigate('/superadmin')}
            style={styles.backBtn}
          >
            ← Volver
          </button>
        </div>

        <h1 style={styles.title}>Empresas / Clientes</h1>

        <div style={styles.headerSlot} /> {/* slot derecho para centrar simétrico */}
      </div>

      {/* Buscador */}
      <div style={styles.searchBar}>
        <div style={styles.searchInputWrap}>
          <IoSearchOutline size={18} color="#64748b" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar por nombre…"
            style={styles.searchInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSearch()
            }}
          />
        </div>
        <div style={styles.searchBtns}>
          <button onClick={onSearch} style={styles.btnPrimary}>Buscar</button>
          <button onClick={onClear} style={styles.btnGhost}>Limpiar</button>
          <button onClick={() => fetchEmpresas()} style={styles.btnSecondary}>Actualizar</button>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <div style={{ ...styles.alert, ...styles.alertError }}>
          <span style={styles.alertErrorText}>{error}</span>
        </div>
      )}

      {/* Skeleton / Lista */}
      {loading ? (
        <div style={styles.skelWrap}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={styles.skelCard} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...styles.alert, ...styles.alertInfo }}>
          <span style={styles.alertInfoText}>
            {appliedTerm ? 'Sin resultados para ese nombre.' : 'No hay empresas cargadas.'}
          </span>
        </div>
      ) : (
        <div style={styles.grid}>
          {filtered.map((e) => (
            <div key={e.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <IoBusinessOutline size={20} color="#0F172A" />
                <div style={styles.cardTitle}>{e.nombre}</div>

                <button
                  onClick={() => onDelete(e)}
                  style={styles.trashBtn}
                  title="Eliminar"
                  disabled={deletingId === e.id}
                >
                  <IoTrashOutline size={18} />
                </button>
              </div>

              <div style={styles.row}>
                <IoPricetagOutline size={18} color="#475569" />
                <span style={styles.rowText}>CUIT: {fmtCUIT(e.cuit)}</span>
              </div>

              {!!e.email && (
                <div style={styles.row}>
                  <IoMailOutline size={18} color="#475569" />
                  <span style={styles.rowText}>{e.email}</span>
                </div>
              )}

              {!!e.telefono && (
                <div style={styles.row}>
                  <IoCallOutline size={18} color="#475569" />
                  <span style={styles.rowText}>{e.telefono}</span>
                </div>
              )}

              {(e.direccion || e.localidad || e.provincia) && (
                <div style={styles.row}>
                  <IoLocationOutline size={18} color="#475569" />
                  <span style={styles.rowText}>
                    {[e.direccion, e.localidad, e.provincia].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}

              {/* Slug en chiquito */}
              <div style={styles.slugRow}>
                <span style={styles.slugLabel}>slug</span>
                <span style={styles.slugText}>{e.slug}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const NAVBAR_HEIGHT = 70
const BACK_SLOT_WIDTH = 110

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 16,
    background: '#F8FAFC',
    minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
    boxSizing: 'border-box',
  },

  // Header centrado con botón igual al resto de pantallas
  headerRow: {
    display: 'grid',
    gridTemplateColumns: `${BACK_SLOT_WIDTH}px 1fr ${BACK_SLOT_WIDTH}px`,
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  headerSlot: { width: BACK_SLOT_WIDTH, display: 'flex', alignItems: 'center' },
  backBtn: {
    display: 'inline-block',
    height: 40,
    lineHeight: '40px',
    padding: '0 14px',
    borderRadius: 10,
    backgroundColor: '#6b7280',
    color: '#fff',
    border: 'none',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    textDecoration: 'none',
    verticalAlign: 'middle',
    boxSizing: 'border-box',
  },
  title: { margin: 0, fontSize: 20, fontWeight: 800, color: '#0F172A', textAlign: 'center' },

  // Buscador
  searchBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  searchInputWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 260,
    background: '#fff',
    border: '2px solid #e2e8f0',
    borderRadius: 12,
    padding: '10px 12px',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    background: 'transparent',
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  searchBtns: { display: 'flex', gap: 8 },

  btnPrimary: {
    background: '#2563EB',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '10px 14px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  btnSecondary: {
    background: '#0f172a',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '10px 14px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  btnGhost: {
    background: '#fff',
    color: '#0f172a',
    border: '2px solid #e2e8f0',
    borderRadius: 10,
    padding: '10px 14px',
    fontWeight: 800,
    cursor: 'pointer',
  },

  // Alertas
  alert: { borderRadius: 12, padding: '12px 14px', marginBottom: 10 },
  alertError: { backgroundColor: '#fee2e2', border: '2px solid #ef4444' },
  alertErrorText: { color: '#b91c1c', fontWeight: 700 } as React.CSSProperties,
  alertInfo: { backgroundColor: '#EFF6FF', border: '2px solid #93C5FD' },
  alertInfoText: { color: '#1e3a8a', fontWeight: 700 } as React.CSSProperties,

  // Grid y cards
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 12,
  },
  card: {
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #E5E7EB',
    padding: 12,
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  cardHeader: {
    display: 'grid',
    gridTemplateColumns: '24px 1fr 36px',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: '#0F172A',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  trashBtn: {
    justifySelf: 'end',
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '6px 8px',
    cursor: 'pointer',
  },

  row: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 },
  rowText: { color: '#0F172A' },

  // Skeleton
  skelWrap: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 12,
  },
  skelCard: {
    height: 122,
    borderRadius: 14,
    background: '#E5E7EB',
    opacity: 0.6,
  },

  // Slug
  slugRow: {
    marginTop: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    borderTop: '1px dashed #e5e7eb',
    paddingTop: 8,
  },
  slugLabel: { fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  slugText: { fontSize: 12, color: '#0f172a' },
}
