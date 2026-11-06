const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface ApiFetchOptions extends RequestInit {
  skipAuthRedirect?: boolean;
}

export const apiFetch = async (endpoint: string, options: ApiFetchOptions = {}): Promise<Response> => {
  const { skipAuthRedirect = false, ...fetchOptions } = options;

  // Permite pasar URLs completas o rutas relativas (/student/profile)
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...fetchOptions,
    credentials: 'include', // Incluye siempre la cookie pta_session
  });

  // Interceptor 401: Redirige al login si la sesión expiró o se destruyó en otra pestaña
  if (response.status === 401 && !skipAuthRedirect) {
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }

  return response;
};