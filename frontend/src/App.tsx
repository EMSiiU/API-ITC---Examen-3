import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Kardex from './pages/Kardex/Kardex';
import Layout from './components/Layout/Layout';

// Componentes temporales para las páginas que faltan
const HorarioPlaceholder = () => <h1>Horario</h1>;

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<Login />} />
          
          {/* Rutas privadas */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/kardex" element={<Kardex />} />
              <Route path="/horario" element={<HorarioPlaceholder />} />
            </Route>
          </Route>
          
          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;