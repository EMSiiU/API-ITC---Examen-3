// Usamos la variable de entorno de Vite o un valor por defecto
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface Resource {
  id: string;
  name: string;
  category: string;
  description: string;
  total_stock: number;
  available_stock: number;
  image_url: string;
}

export const getResources = async (): Promise<Resource[]> => {
  const response = await fetch(`${API_URL}/resources`, { credentials: 'include' });
  if (!response.ok) throw new Error('Error al cargar el catálogo de recursos');
  return response.json();
};

export const reserveResource = async (resourceId: string, studentId: string): Promise<any> => {
  const response = await fetch(`${API_URL}/resources/reserve/${resourceId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId }), 
    credentials: 'include'
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al reservar el recurso');
  }
  return response.json();
};