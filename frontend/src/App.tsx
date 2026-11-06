import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login/Login';
import Layout from './components/Layout/Layout';

// Componentes temporales para las páginas que faltan
const DashboardPlaceholder = () => <h1>Bienvenido al Panel (Cargando datos...)</h1>;
const KardexPlaceholder = () => <h1>Kardex</h1>;
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
              <Route path="/dashboard" element={<DashboardPlaceholder />} />
              <Route path="/kardex" element={<KardexPlaceholder />} />
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