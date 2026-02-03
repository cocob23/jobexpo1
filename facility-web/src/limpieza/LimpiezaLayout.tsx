import { Outlet, NavLink } from 'react-router-dom'
import './styles.css'

export default function LimpiezaLayout() {
  return (
    <div className="layout">
      <nav className="tabs">
        <NavLink to="/limpieza" end className={({ isActive }) => isActive ? 'tab active' : 'tab'}>
          Inicio
        </NavLink>
        <NavLink to="/limpieza/marcar-llegada" className={({ isActive }) => isActive ? 'tab active' : 'tab'}>
          Marcar llegada
        </NavLink>
        <NavLink to="/limpieza/marcar-salida" className={({ isActive }) => isActive ? 'tab active' : 'tab'}>
          Marcar salida
        </NavLink>
        <NavLink to="/limpieza/mis-llegadas" className={({ isActive }) => isActive ? 'tab active' : 'tab'}>
          Mis llegadas
        </NavLink>
        <NavLink to="/limpieza/perfil" className={({ isActive }) => isActive ? 'tab active' : 'tab'}>
          Perfil
        </NavLink>
      </nav>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
