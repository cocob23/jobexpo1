// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './auth/Login'
import SuperadminHome from './superadmin/SuperAdminHome'
import FMLayout from './fm/FMlayout'
import FMHome from './fm/FMHome'
import VerTareas from './fm/ver-tareas'
import AsignarTarea from './fm/asignar-tarea'
import CrearTecnico from './fm/crear-tecnico'
import ListaTecnicos from './fm/tecnicos'
import PerfilFM from './fm/perfil'
import PerfilTecnico from './fm/perfil-tecnico'

import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/superadmin"
          element={
            <ProtectedRoute>
              <SuperadminHome />
            </ProtectedRoute>
          }
        />

        {/* protegemos todo el layout FM */}
        <Route
          path="/fm"
          element={
            <ProtectedRoute>
              <FMLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<FMHome />} />
          <Route path="ver-tareas" element={<VerTareas />} />
          <Route path="asignar-tarea" element={<AsignarTarea />} />
          <Route path="crear-tecnico" element={<CrearTecnico />} />
          <Route path="tecnicos" element={<ListaTecnicos />} />
          <Route path="perfil" element={<PerfilFM />} />
          <Route path="perfil-tecnico" element={<PerfilTecnico />} />




        </Route>

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  )
}
