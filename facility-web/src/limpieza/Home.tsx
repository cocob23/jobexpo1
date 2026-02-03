import { Link } from 'react-router-dom'

export default function LimpiezaHome() {
  return (
    <div>
      <h2>Rol: Limpieza</h2>
      <p>Seleccioná una opción:</p>
      <div style={{ display: 'grid', gap: 12 }}>
        <Link to="/limpieza/marcar-llegada" className="btn">Marcar llegada</Link>
        <Link to="/limpieza/marcar-salida" className="btn">Marcar salida</Link>
        <Link to="/limpieza/mis-llegadas" className="btn">Mis llegadas</Link>
        <Link to="/limpieza/perfil" className="btn">Perfil</Link>
      </div>
    </div>
  )
}
