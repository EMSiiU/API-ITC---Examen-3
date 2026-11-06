import { apiFetch } from './api';

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

export interface Loan {
  id: string;
  student_id: string;
  resource_id: string;
  status: 'pending_pickup' | 'active' | 'returned' | 'overdue' | 'cancelled';
  borrow_date: string;
  due_date: string;
  resources: {
    name: string;
    image_url: string;
    category: string;
  };
}

export const getResources = async (): Promise<Resource[]> => {
  const response = await apiFetch(`${API_URL}/resources`);
  if (!response.ok) throw new Error('Error al cargar el catálogo de recursos');
  return response.json();
};

export const reserveResource = async (resourceId: string, studentId: string): Promise<any> => {
  const response = await apiFetch(`${API_URL}/resources/reserve/${resourceId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al reservar el recurso');
  }
  return response.json();
};

export const getMyLoans = async (studentId: string): Promise<Loan[]> => {
  const response = await apiFetch(`${API_URL}/resources/loans/${studentId}`);
  if (!response.ok) throw new Error('Error al cargar tus préstamos');
  return response.json();
};

export const cancelReservation = async (loanId: string, studentId: string): Promise<any> => {
  const response = await apiFetch(`${API_URL}/resources/loans/${loanId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al cancelar la reserva');
  }
  return response.json();
};

export const getAdminLoans = async (): Promise<Loan[]> => {
  const response = await apiFetch(`${API_URL}/resources/admin/loans`);
  if (!response.ok) throw new Error('Error al cargar la lista global de préstamos');
  return response.json();
};

export const markAsReturned = async (loanId: string): Promise<any> => {
  const response = await apiFetch(`${API_URL}/resources/admin/loans/${loanId}/return`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al devolver el recurso');
  }
  return response.json();
};

export const markAsActive = async (loanId: string): Promise<any> => {
  const response = await apiFetch(`${API_URL}/resources/admin/loans/${loanId}/activate`, {
    method: 'POST',
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al entregar el recurso');
  }
  return response.json();
};

export const createAdminResource = async (resourceData: any): Promise<Resource> => {
  const response = await apiFetch(`${API_URL}/resources/admin/catalog`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(resourceData),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al crear el recurso');
  }
  return response.json();
};

export const adjustResourceStock = async (id: string, delta: number): Promise<Resource> => {
  const response = await apiFetch(`${API_URL}/resources/admin/catalog/${id}/stock`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delta }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al ajustar el stock');
  }
  return response.json();
};