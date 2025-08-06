// src/fm/FMHome.tsx
import { useNavigate } from 'react-router-dom'

export default function FMHome() {
  const navigate = useNavigate()

  const opciones = [
    { nombre: 'Ver tareas asignadas', ruta: '/fm/ver-tareas' },
    { nombre: 'Asignar tarea', ruta: '/fm/asignar-tarea' },
    { nombre: 'Aprobar trabajos', ruta: '/fm/aprobar-trabajos' },
    { nombre: 'Técnicos', ruta: '/fm/tecnicos' },
    { nombre: 'Crear técnico', ruta: '/fm/crear-tecnico' },
    { nombre: 'Perfil', ruta: '/fm/perfil' },
    { nombre: 'Tickets', ruta: '/fm/tickets' },
    { nombre: 'Cotizaciones', ruta: '/fm/cotizaciones' },
  ]

  return (
    <div style={styles.container}>
      <h1 style={styles.titulo}>Panel de la Facility Manager</h1>
      <div style={styles.grid}>
        {opciones.map((opcion, i) => (
          <button key={i} style={styles.boton} onClick={() => navigate(opcion.ruta)}>
            {opcion.nombre}
          </button>
        ))}
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '40px',
    textAlign: 'center',
  },
  titulo: {
    fontSize: '28px',
    marginBottom: '40px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
  },
  boton: {
    padding: '20px',
    borderRadius: '12px',
    backgroundColor: '#2563EB',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '16px',
    border: 'none',
    cursor: 'pointer',
  },
}
