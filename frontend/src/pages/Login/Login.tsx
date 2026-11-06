import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth';
import styles from './Login.module.css';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await authService.login(email, password);
      await checkAuth(); // Refresca el contexto global para que sepa que ya hay sesión
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.formSection}>
        <div className={styles.logosContainer}>
          {/* Cambia los nombres de los src si guardaste tus logos con nombres diferentes en public/ */}
          <img src="/logo-tecnm.png" alt="TecNM" className={styles.logo} />
          <img src="/logo-itc.png" alt="Tec de Celaya" className={styles.logo} />
        </div>
        
        <h1 className={styles.title}>¡Bienvenido de nuevo!</h1>
        <p className={styles.subtitle}>Ingresa tus credenciales para acceder a la plataforma</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.errorMessage}>{error}</div>}

          <div className={styles.inputGroup}>
            <label htmlFor="email">Correo electrónico</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="l12345678@celaya.tecnm.mx"
              required
              disabled={isLoading}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
            />
          </div>

          <button type="submit" className={styles.submitButton} disabled={isLoading}>
            {isLoading ? 'Iniciando sesión...' : 'Entrar'}
          </button>
        </form>
      </div>
      
      {/* Sección derecha (Oculta en móvil) */}
      <div className={styles.imageSection}></div>
    </div>
  );
};