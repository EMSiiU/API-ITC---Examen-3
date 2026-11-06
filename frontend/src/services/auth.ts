// Usamos la variable de entorno de Vite o un valor por defecto
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const authService = {
  // Función para iniciar sesión
  login: async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include', // ¡Crucial! Permite que el navegador guarde la cookie que envía el backend
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al iniciar sesión');
    }

    return response.json();
  },

  // Función para verificar si hay una sesión activa (protección de rutas)
  checkSession: async () => {
    const response = await fetch(`${API_URL}/auth/session`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // ¡Crucial! Envía la cookie guardada al backend
    });

    if (!response.ok) {
      throw new Error('No hay sesión activa');
    }

    return response.json();
  },

  // Función de Logout que destruye la cookie
  logout: async () => {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Error al cerrar sesión');
    }
  }
};