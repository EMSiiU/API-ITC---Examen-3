// Usamos la variable de entorno de Vite o un valor por defecto
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface Session {
  day: number;
  startTime: string;
  endTime: string;
  classroom: string;
}

export interface ScheduleSubject {
  groupId: number;
  group: string;
  name: string;
  code: string;
  shiftCode: string;
  programName: string;
  levelCode: string;
  sessions: Session[];
}

export const getStudentSchedule = async (): Promise<ScheduleSubject[]> => {
  const response = await fetch(`${API_URL}/student/schedule`, { credentials: 'include' });
  if (!response.ok) throw new Error('Error al obtener el horario');
  const data = await response.json();
  // Retornamos las materias del primer periodo (actual)
  return data.schedule.periods[0]?.subjects || [];
};