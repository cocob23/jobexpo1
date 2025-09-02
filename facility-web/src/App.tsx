// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

// Login
import Login from './auth/Login'

// FM
import FMLayout from './fm/FMlayout'
import FMHome from './fm/FMHome'
import VerTareasFM from './fm/ver-tareas'
import AsignarTareaFM from './fm/asignar-tarea'
import CrearTecnicoFM from './fm/crear-tecnico'
import ListaTecnicosFM from './fm/tecnicos'
import PerfilFM from './fm/perfil'
import PerfilTecnicoFM from './fm/perfil-tecnico'
import DetalleTareaFM from './fm/detalle-tarea-fm'
import LlegadasFM from './fm/llegadas'
import TicketsFM from './fm/tickets'
import CotizacionesFM from './fm/cotizaciones'
import CrearEmpresaFM from './fm/crear-empresa'


// Superadmin
import SuperadminLayout from './superadmin/SuperadminLayout'
import SuperadminHome from './superadmin/SuperAdminHome'
import CrearUsuarioSA from './superadmin/crear-usuario'
import TecnicosSA from './superadmin/tecnicos'
import TicketsSA from './superadmin/tickets'
import PerfilSuperadmin from './superadmin/perfil'
import PerfilTecnicoSA from './superadmin/perfil-tecnico'
import AsignarTareaSA from './superadmin/asignar-tarea'
import VerTareasSA from './superadmin/ver-tareas'
import LlegadasSA from './superadmin/llegadas'
import CotizacionesSuperadmin from './superadmin/cotizaciones'
import DetalleTareaSA from './superadmin/detalle-tarea' // ⬅️ agregado
import CrearEmpresaSA from './superadmin/crear-empresa'


// Mantenimiento Externo
import TecnicosExternosLayout from './mantenimiento-externo/TecnicosExternosLayout'
import PlanillasTecnicosExternos from './mantenimiento-externo/planillas'
import MantenimientoExternoHome from './mantenimiento-externo/Home'
import PerfilExterno from './mantenimiento-externo/perfil' // ⬅️ nuevo

// Utils
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />

        {/* RUTAS SUPERADMIN */}
        <Route
          path="/superadmin"
          element={
            <ProtectedRoute>
              <SuperadminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<SuperadminHome />} />
          <Route path="crear-usuario" element={<CrearUsuarioSA />} />
          <Route path="tecnicos" element={<TecnicosSA />} />
          <Route path="asignar-tarea" element={<AsignarTareaSA />} />
          <Route path="ver-tareas" element={<VerTareasSA />} />
          <Route path="detalle-tarea/:id" element={<DetalleTareaSA />} /> {/* ⬅️ agregado */}
          <Route path="tickets" element={<TicketsSA />} />
          <Route path="perfil" element={<PerfilSuperadmin />} />
          <Route path="perfil-tecnico/:id" element={<PerfilTecnicoSA />} />
          <Route path="llegadas" element={<LlegadasSA />} />
          <Route path="cotizaciones" element={<CotizacionesSuperadmin />} />
          <Route path="empresas/nueva" element={<CrearEmpresaSA />} />   {/* ⬅️ NUEVA */}

        </Route>

        {/* RUTAS FM */}
        <Route
          path="/fm"
          element={
            <ProtectedRoute>
              <FMLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<FMHome />} />
          <Route path="ver-tareas" element={<VerTareasFM />} />
          <Route path="asignar-tarea" element={<AsignarTareaFM />} />
          <Route path="crear-tecnico" element={<CrearTecnicoFM />} />
          <Route path="tecnicos" element={<ListaTecnicosFM />} />
          <Route path="perfil" element={<PerfilFM />} />
          <Route path="perfil-tecnico/:id" element={<PerfilTecnicoFM />} />
          <Route path="detalle-tarea/:id" element={<DetalleTareaFM />} />
          <Route path="llegadas" element={<LlegadasFM />} />
          <Route path="tickets" element={<TicketsFM />} />
          <Route path="cotizaciones" element={<CotizacionesFM />} />
          <Route path="empresas/nueva" element={<CrearEmpresaFM />} />   {/* ⬅️ NUEVA */}

        </Route>

        {/* RUTAS MANTENIMIENTO EXTERNO (con navbar/layout) */}
        <Route
          path="/mantenimiento-externo"
          element={
            <ProtectedRoute>
              <TecnicosExternosLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<MantenimientoExternoHome />} />
          <Route path="planillas" element={<PlanillasTecnicosExternos />} />
          <Route path="perfil" element={<PerfilExterno />} /> {/* ⬅️ nuevo */}
        </Route>

        {/* Redirección de la ruta vieja */}
        <Route path="/tecnicos-externos" element={<Navigate to="/mantenimiento-externo" replace />} />

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  )
}
