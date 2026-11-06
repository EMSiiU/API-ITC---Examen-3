import { apiFetch } from './api';

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
  const response = await apiFetch(`${API_URL}/student/profile`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener el perfil');
  }

  const data = await response.json();
  return data.profile;
};