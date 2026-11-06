import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, BookOpen, Calendar, LogOut } from 'lucide-react';
import styles from './Layout.module.css';

const Layout = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión', error);
      // Fallback: forzamos ir al login si falla la red
      navigate('/login');
    }
  };

  return (
    <div className={styles.layoutContainer}>
      {/* Sidebar Oscura */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          {/* Aquí puedes poner un logo pequeño del Tec */}
          <h2>SII ITC</h2>
        </div>

        <nav className={styles.navLinks}>
          <NavLink 
            to="/dashboard" 
            className={({ isActive }) => isActive ? `${styles.navItem} ${styles.activeNavItem}` : styles.navItem}
          >
            <LayoutDashboard size={20} />
            <span>Panel</span>
          </NavLink>
          
          <NavLink 
            to="/kardex" 
            className={({ isActive }) => isActive ? `${styles.navItem} ${styles.activeNavItem}` : styles.navItem}
          >
            <BookOpen size={20} />
            <span>Kardex</span>
          </NavLink>

          <NavLink 
            to="/horario" 
            className={({ isActive }) => isActive ? `${styles.navItem} ${styles.activeNavItem}` : styles.navItem}
          >
            <Calendar size={20} />
            <span>Horario</span>
          </NavLink>
        </nav>

        {/* Botón inferior */}
        <button onClick={handleLogout} className={styles.logoutButton}>
          <LogOut size={20} />
          <span>Cerrar sesión</span>
        </button>
      </aside>

      {/* Contenedor Principal donde se inyectan las páginas */}
      <main className={styles.mainContent}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;