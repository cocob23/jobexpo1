// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from './components/ToastProvider'

// Login & Recuperación
import Login from './auth/Login'
import Recuperar from './auth/Recuperar'
import VerificarCodigo from './auth/VerificarCodigo'
import NuevaPassword from './auth/NuevaPassword'

// FM
import FMLayout from './fm/FMLayout'
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
import RecorridosFM from './fm/recorridos'

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
import CrearCotizacionSuperadmin from './superadmin/crear-cotizacion'
import DetalleTareaSA from './superadmin/detalle-tarea'
import CrearEmpresaSA from './superadmin/crear-empresa'
import EmpresasClientesSA from './superadmin/empresas-clientes'
import InventarioSA from './superadmin/inventario'
import PerfilesSA from './superadmin/perfiles'
import RecorridosAdmin from './superadmin/recorridos'

// Mantenimiento Externo
import TecnicosExternosLayout from './mantenimiento-externo/TecnicosExternosLayout'
import PlanillasTecnicosExternos from './mantenimiento-externo/planillas'
import MantenimientoExternoHome from './mantenimiento-externo/Home'
import PerfilExterno from './mantenimiento-externo/perfil'

// Mantenimiento (interno)
import MantenimientoIndex from './mantenimiento/MantenimientoIndex'
import TareasMantenimiento from './mantenimiento/Tareas'
import PerfilMantenimiento from './mantenimiento/Perfil'
import Inventario from './mantenimiento/Inventario'
import DetalleTareaMantenimiento from './mantenimiento/DetalleTareaMantenimiento'
import TicketsPrincipal from './mantenimiento/Tickets'
import CargarTicket from './mantenimiento/CargarTicket'

// Limpieza (nuevo rol web)
import LimpiezaLayout from './limpieza/LimpiezaLayout'
import LimpiezaHome from './limpieza/Home'
import LimpiezaMarcarLlegada from './limpieza/MarcarLlegada'
import LimpiezaMarcarSalida from './limpieza/MarcarSalida'
import LimpiezaMisLlegadas from './limpieza/MisLlegadas'
import LimpiezaPerfil from './limpieza/Perfil'
// Utils
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
        <Route path="/" element={<Navigate to="/login" />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/recuperar" element={<Recuperar />} />
        <Route path="/verificar-codigo" element={<VerificarCodigo />} />
        <Route path="/nueva-password" element={<NuevaPassword />} />

        {/* SUPERADMIN */}
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
          <Route path="detalle-tarea/:id" element={<DetalleTareaSA />} />
          <Route path="tickets" element={<TicketsSA />} />
          <Route path="perfil" element={<PerfilSuperadmin />} />
          <Route path="perfiles" element={<PerfilesSA />} />
          <Route path="perfil-tecnico/:id" element={<PerfilTecnicoSA />} />
          <Route path="llegadas" element={<LlegadasSA />} />
          <Route path="cotizaciones" element={<CotizacionesSuperadmin />} />
          <Route path="cotizaciones/crear" element={<CrearCotizacionSuperadmin />} />
          <Route path="empresas/nueva" element={<CrearEmpresaSA />} />
          <Route path="empresas-clientes" element={<EmpresasClientesSA />} />
          <Route path="inventario" element={<InventarioSA />} />
          <Route path="recorridos" element={<RecorridosAdmin />} />
        </Route>

        {/* FM */}
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
          <Route path="empresas/nueva" element={<CrearEmpresaFM />} />
          <Route path="recorridos" element={<RecorridosFM />} />
        </Route>

        {/* MANTENIMIENTO EXTERNO */}
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
          <Route path="perfil" element={<PerfilExterno />} />
        </Route>

        {/* LIMPIEZA */}
        <Route
          path="/limpieza"
          element={
            <ProtectedRoute>
              <LimpiezaLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<LimpiezaHome />} />
          <Route path="marcar-llegada" element={<LimpiezaMarcarLlegada />} />
          <Route path="marcar-salida" element={<LimpiezaMarcarSalida />} />
          <Route path="mis-llegadas" element={<LimpiezaMisLlegadas />} />
          <Route path="perfil" element={<LimpiezaPerfil />} />
        </Route>

        {/* Redirección de la ruta vieja */}
        <Route path="/tecnicos-externos" element={<Navigate to="/mantenimiento-externo" replace />} />

        {/* fallback */}
        <Route path="/mantenimiento" element={
          <ProtectedRoute>
            <MantenimientoIndex />
          </ProtectedRoute>
        } />
        <Route path="/mantenimiento/tareas" element={
          <ProtectedRoute>
            <TareasMantenimiento />
          </ProtectedRoute>
        } />
        <Route path="/mantenimiento/perfil" element={
          <ProtectedRoute>
            <PerfilMantenimiento />
          </ProtectedRoute>
        } />
        <Route path="/mantenimiento/inventario" element={
          <ProtectedRoute>
            <Inventario />
          </ProtectedRoute>
        } />
        <Route path="/mantenimiento/tickets" element={
          <ProtectedRoute>
            <TicketsPrincipal />
          </ProtectedRoute>
        } />
        <Route path="/mantenimiento/cargar-ticket" element={
          <ProtectedRoute>
            <CargarTicket />
          </ProtectedRoute>
        } />
        <Route path="/mantenimiento/detalle-tarea" element={
          <ProtectedRoute>
            <DetalleTareaMantenimiento />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </ToastProvider>
  )
}
