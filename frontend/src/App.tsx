import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Componentes temporales (los mejoraremos y separaremos pronto)
const LoginPlaceholder = () => <div style={{ padding: '2rem' }}><h1>Login</h1><p>En construcción...</p></div>;
const DashboardPlaceholder = () => <div style={{ padding: '2rem' }}><h1>Dashboard</h1><p>Área protegida (próximamente).</p></div>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública */}
        <Route path="/login" element={<LoginPlaceholder />} />
        
        {/* Ruta privada (la protegeremos en el paso 3) */}
        <Route path="/dashboard" element={<DashboardPlaceholder />} />
        
        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;