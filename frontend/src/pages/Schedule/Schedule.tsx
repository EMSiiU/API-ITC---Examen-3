import { useState, useEffect, useMemo } from 'react';
import { Calendar, LayoutGrid, LayoutList } from 'lucide-react';
import { getStudentSchedule, type ScheduleSubject } from '../../services/schedule';
import { getStudentGrades, type GradeSubject } from '../../services/grades';
import styles from './Schedule.module.css';

const DAYS_MAP: Record<number, string> = {
  1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado'
};

const Schedule = () => {
  const [schedule, setSchedule] = useState<ScheduleSubject[]>([]);
  const [grades, setGrades] = useState<GradeSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'agenda' | 'materias'>('agenda');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Disparamos ambas peticiones en paralelo
        const [scheduleData, gradesData] = await Promise.all([
          getStudentSchedule(),
          getStudentGrades()
        ]);
        setSchedule(scheduleData);
        setGrades(gradesData);
      } catch (err) {
        setError('No se pudo cargar la información del horario.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Prepara los datos para la Agenda (agrupados por día)
  const agendaByDay = useMemo(() => {
    const days: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    
    schedule.forEach(subject => {
      subject.sessions.forEach(session => {
        if (days[session.day]) {
          days[session.day].push({
            ...session,
            subjectName: subject.name,
            code: subject.code
          });
        }
      });
    });

    // Ordenar sesiones por hora de inicio en cada día
    Object.keys(days).forEach(day => {
      days[Number(day)].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    return days;
  }, [schedule]);

  const renderAgenda = () => (
    <div className={styles.agendaGrid}>
      {[1, 2, 3, 4, 5].map(day => (
        <div key={day} className={styles.dayColumn}>
          <div className={styles.dayTitle}>{DAYS_MAP[day]}</div>
          {agendaByDay[day].length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>Libre</div>
          ) : (
            agendaByDay[day].map((session, idx) => (
              <div key={idx} className={styles.classBlock}>
                <span className={styles.classTime}>{session.startTime} - {session.endTime}</span>
                <span className={styles.className}>{session.subjectName}</span>
                <span className={styles.classRoom}>Aula: {session.classroom}</span>
              </div>
            ))
          )}
        </div>
      ))}
    </div>
  );

  const renderCards = () => (
    <div className={styles.cardsGrid}>
      {schedule.map(subject => {
        // Buscamos las calificaciones que coincidan con el groupId
        const subjectGrades = grades.find(g => g.groupId === subject.groupId);

        return (
          <div key={subject.groupId} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardCode}>{subject.code}</span>
              <h3 className={styles.cardTitle}>{subject.name}</h3>
              <span className={styles.cardGroup}>Grupo: {subject.group}</span>
            </div>
            
            <div className={styles.cardBody}>
              <div className={styles.sessionList}>
                {subject.sessions.map((sess, idx) => (
                  <div key={idx} className={styles.sessionItem}>
                    <strong>{DAYS_MAP[sess.day]}</strong>
                    <span>{sess.startTime} - {sess.endTime} ({sess.classroom})</span>
                  </div>
                ))}
              </div>

              {subjectGrades && subjectGrades.assessments.length > 0 && (
                <div className={styles.gradesSection}>
                  <div className={styles.gradesTitle}>Calificaciones Parciales</div>
                  <div className={styles.gradesRow}>
                    {subjectGrades.assessments.map(assessment => {
                      const val = assessment.grade;
                      const valClass = val === null ? styles.valRed : (val >= 85 ? styles.valGreen : (val >= 70 ? styles.valYellow : styles.valRed));
                      
                      return (
                        <div key={assessment.id} className={styles.gradeBadge}>
                          <span className={styles.gradeNumber}>C{assessment.number}</span>
                          <span className={`${styles.gradeValue} ${valClass}`}>
                            {val !== null ? val : '-'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <Calendar size={28} color="#3b82f6" />
          Carga Académica
        </h1>
        
        <div className={styles.tabs}>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'agenda' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('agenda')}
          >
            <LayoutGrid size={18} /> Semanal
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'materias' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('materias')}
          >
            <LayoutList size={18} /> Materias
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Cargando carga académica...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : activeTab === 'agenda' ? renderAgenda() : renderCards()}
    </div>
  );
};

export default Schedule;