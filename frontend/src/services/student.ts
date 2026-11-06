// Usamos la variable de entorno de Vite o un valor por defecto
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface StudentProfile {
  controlNumber: string | null;
  name: string | null;
  email: string | null;
  semester: number | null;
  photoUrl: string | null;
  academicProgress: {
    accumulatedCredits: number | null;
    complementaryCredits: number | null;
    progressPercentage: number | null;
    progressWhileEnrolledPercentage: number | null;
  } | null;
  averages: {
    weighted: number | null;
    arithmetic: number | null;
  } | null;
  subjects: {
    taken: number | null;
    passed: number | null;
    failed: number | null;
    failedNotAccredited: number | null;
    failedFirstAttempt: number | null;
    failedSecondAttempt: number | null;
  } | null;
}

export const getStudentProfile = async (): Promise<StudentProfile> => {
  const response = await fetch(`${API_URL}/student/profile`, {
    method: 'GET',
    credentials: 'include', // Crucial para enviar la cookie de sesión
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('No autorizado');
    }
    throw new Error('Error al obtener el perfil');
  }

  const data = await response.json();
  return data.profile;
};