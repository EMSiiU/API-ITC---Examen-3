import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login/Login';

// Componentes temporales (los mejoraremos y separaremos pronto)
// const LoginPlaceholder = () => <div style={{ padding: '2rem' }}><h1>Login</h1><p>En construcción...</p></div>;
const DashboardPlaceholder = () => <div style={{ padding: '2rem' }}><h1>Dashboard</h1><p>Área protegida (próximamente).</p></div>;

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<Login />} />
          
          {/* Rutas privadas */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPlaceholder />} />
            {/* Aquí irán después /kardex, /horario, etc. */}
          </Route>
          
          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;