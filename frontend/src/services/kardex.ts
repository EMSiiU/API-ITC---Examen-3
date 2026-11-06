// Usamos la variable de entorno de Vite o un valor por defecto
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface KardexSubject {
  name: string ; 
  code: string | null;
  period: string | null;
  credits: number | null;
  grade: number | string; 
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
  const response = await fetch(`${API_URL}/student/kardex`, {
    credentials: 'include', // Para enviar la cookie de sesión
  });
  
  if (!response.ok) {
    throw new Error('Error al obtener el kardex');
  }
  
  const data: KardexResponse = await response.json();
  // Extraemos y devolvemos únicamente el arreglo de materias
  return data.kardex.subjects;
};