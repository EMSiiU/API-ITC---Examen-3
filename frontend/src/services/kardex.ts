import { apiFetch } from './api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface KardexSubject {
  name: string; 
  code: string | null;
  period: string | null;
  credits: number | null;
  grade: number | null; 
  gradeLabel: string | null;
  evaluationDescription: string | null;
  semester: string | null;
}

export interface KardexResponse {
  kardex: {
    progressPercentage: number;
    subjects: KardexSubject[];
  };
}

export const getStudentKardex = async (): Promise<KardexSubject[]> => {
  const response = await apiFetch(`${API_URL}/student/kardex`);
  
  if (!response.ok) {
    throw new Error('Error al obtener el kardex');
  }
  
  const data: KardexResponse = await response.json();
  return data.kardex.subjects;
};