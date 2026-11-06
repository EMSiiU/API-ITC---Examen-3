// frontend/src/components/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Verificando sesión...</div>;
  }

  // Si no está autenticado, lo mandamos al login, como exige el PDF
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si está autenticado, renderiza la ruta hija (ej. Dashboard)
  return <Outlet />;
};