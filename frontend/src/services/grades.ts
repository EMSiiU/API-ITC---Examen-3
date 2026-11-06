import { apiFetch } from './api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface Assessment {
  id: number;
  number: number;
  grade: number | null;
  gradeLabel: string | null;
}

export interface GradeSubject {
  groupId: number;
  name: string;
  code: string;
  group: string;
  assessments: Assessment[];
}

export const getStudentGrades = async (): Promise<GradeSubject[]> => {
  const response = await apiFetch(`${API_URL}/student/grades`);
  if (!response.ok) throw new Error('Error al obtener las calificaciones');
  const data = await response.json();
  return data.grades.periods[0]?.subjects || [];
};