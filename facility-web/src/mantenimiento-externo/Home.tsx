// src/mantenimiento-externo/Home.tsx
import { useNavigate } from 'react-router-dom'

export default function MantenimientoExternoHome() {
  const navigate = useNavigate()

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>Panel de Técnicos Externos</h1>
        <p style={styles.subtitle}>¿Qué querés hacer hoy?</p>

        <div style={styles.grid}>
          <button
            style={styles.card}
            onClick={() => navigate('/mantenimiento-externo/planillas')}
          >
            <span style={{ fontSize: 32 }}>📋</span>
            <span>Planillas de Técnicos Externos</span>
          </button>
        </div>
      </div>
    </div>
  )
}

const styles: { [k: string]: React.CSSProperties } = {
  page: { backgroundColor: '#fff', borderRadius: 12, minHeight: 'calc(100vh - 70px - 48px)' },
  container: { width: '100%', maxWidth: 1000, margin: '0 auto', padding: '0 4px', fontFamily: `'Segoe UI', system-ui, -apple-system, Roboto, Arial, sans-serif` },
  title: { fontSize: '2rem', fontWeight: 700, margin: 0, color: '#1e293b' },
  subtitle: { fontSize: '1.05rem', color: '#64748b', marginTop: 6, marginBottom: 16 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 },
  card: {
    background: '#ffffff', border: '2px solid #e2e8f0', borderRadius: 16, padding: '20px 16px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, fontSize: 16,
    fontWeight: 600, color: '#1e293b', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
  },
}
