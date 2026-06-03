import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { AdminLayout } from './components/AdminLayout'
import { ProtectedRoute } from './components/ProtectedRoute'

import { Dashboard } from './pages/admin/Dashboard'
import { Objetos } from './pages/admin/Objetos'
import { Lideres } from './pages/admin/Lideres'
import { Fluxos } from './pages/admin/Fluxos'
import { Pesquisas } from './pages/admin/Pesquisas'
import { Builder } from './pages/admin/Builder'
import { Distribuir } from './pages/admin/Distribuir'
import { Relatorios } from './pages/admin/Relatorios'
import { Responder } from './pages/public/Responder'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota pública de login */}
        <Route path="/login" element={<Login />} />

        {/* Rota pública de preenchimento de pesquisas */}
        <Route path="/r/:token" element={<Responder />} />

        {/* Rotas Administrativas Protegidas */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="objetos" element={<Objetos />} />
          <Route path="lideres" element={<Lideres />} />
          <Route path="fluxos" element={<Fluxos />} />
          <Route path="fluxos/:id/builder" element={<Builder />} />
          <Route path="pesquisas" element={<Pesquisas />} />
          <Route path="pesquisas/:id/distribuir" element={<Distribuir />} />
          <Route path="pesquisas/:id/relatorios" element={<Relatorios />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* Redirecionamento Padrão */}
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
