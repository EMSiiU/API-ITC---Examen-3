import { apiFetch } from './api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const authService = {
  // Función para iniciar sesión
  login: async (email: string, password: string) => {
    const response = await apiFetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      skipAuthRedirect: true, // Evita redirección automática para mostrar error de credenciales
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al iniciar sesión');
    }

    return response.json();
  },

  // Función para verificar si hay una sesión activa (protección de rutas)
  checkSession: async () => {
    const response = await apiFetch(`${API_URL}/auth/session`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      skipAuthRedirect: true, // El router guard maneja la redirección limpia
    });

    if (!response.ok) {
      throw new Error('No hay sesión activa');
    }

    return response.json();
  },

  // Función de Logout que destruye la cookie
  logout: async () => {
    const response = await apiFetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Error al cerrar sesión');
    }
  }
};