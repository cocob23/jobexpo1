// src/fm/FMLayout.tsx
import { Outlet } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'

export default function FMLayout() {
  return (
    <ProtectedRoute>
      <div style={{ padding: 24 }}>
        {/* acá podés meter navbar lateral, topbar, etc */}
        <Outlet />
      </div>
    </ProtectedRoute>
  )
}