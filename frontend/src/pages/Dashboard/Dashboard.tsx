import { useEffect, useState } from 'react';
import { getStudentProfile, type StudentProfile } from '../../services/student';
import { getStudentKardex, type KardexSubject } from '../../services/kardex';
import { GraduationCap, Mail, Hash, Fingerprint } from 'lucide-react';
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [kardex, setKardex] = useState<KardexSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [profileData, kardexData] = await Promise.all([
          getStudentProfile(),
          getStudentKardex()
        ]);
        setProfile(profileData);
        setKardex(kardexData);
      } catch (err) {
        setError('No se pudo cargar la información del panel.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className={styles.loading}>Cargando panel principal...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!profile) return null;

  // 1. Manejo seguro de la imagen (agrega prefijo base64 si el backend manda el string puro)
  const getPhotoSrc = (base64Str?: string) => {
    if (!base64Str) return '';
    if (base64Str.startsWith('data:image')) return base64Str;
    return `data:image/jpeg;base64,${base64Str}`;
  };

  // 2. Redondear promedio a 2 decimales
  const rawAverage = profile.averages?.arithmetic;
  const formattedAverage = typeof rawAverage === 'number' 
    ? rawAverage.toFixed(2) 
    : '-';

  // Función para determinar el color del fondo
  const getAverageColorClass = (avg: number | undefined | null) => {
    if (typeof avg !== 'number') return styles.bgBlue; // Color por defecto si no hay dato
    if (avg < 70) return styles.bgRed;
    if (avg < 85) return styles.bgYellow;
    return styles.bgBlue;
  };

  // 3. Datos para la gráfica de Créditos (Total: 260)
  const totalCredits = 260;
  const accumulated = profile.academicProgress?.accumulatedCredits || 0;
  const remaining = Math.max(0, totalCredits - accumulated);
  const creditsData = [
    { name: 'Acumulados', value: accumulated, color: '#3b82f6' },
    { name: 'Faltantes', value: remaining, color: '#adb0b464' }
  ];

  // 4. Datos para la gráfica de Materias
  const passed = profile.subjects?.passed || 0;
  const failed = profile.subjects?.failed || 0;
  const subjectsData = [
    { name: 'Aprobadas', value: passed, color: '#22c55e' },
    { name: 'Reprobadas', value: failed, color: '#ef4444' }
  ];

  // NUEVO: Procesar el Top 5 de mejores materias
  const top5Subjects = [...kardex]
    .filter(sub => sub.grade !== null) // Solo procesa las que sí tienen número
    .sort((a, b) => Number(b.grade) - Number(a.grade))
    .slice(0, 5)
    .map(sub => ({
      name: sub.name.length > 25 ? sub.name.substring(0, 25) + '...' : sub.name,
      calificacion: Number(sub.grade)
    }));

  return (
    <div className={styles.dashboardContainer}>
      {/* Tarjeta de Información Personal (Ahora arriba) */}
      <div className={styles.profileCard}>
        <div className={styles.photoWrapper}>
          {profile.photoUrl ? (
            <img 
              src={getPhotoSrc(profile.photoUrl)} 
              alt="Estudiante" 
              className={styles.photo}
              onError={(e) => {
                // Fallback si la imagen está corrupta
                (e.target as HTMLImageElement).style.display = 'none';
              }} 
            />
          ) : (
            <span style={{color: '#94a3b8'}}>Sin foto</span>
          )}
        </div>
        
        <div className={styles.profileDetails}>
          <h2>{profile.name || 'Estudiante'}</h2>
          <div className={styles.careerText}>
            Estudiante del Instituto Tecnológico de Celaya
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <Fingerprint size={18} />
              <span>NC: <strong>{profile.controlNumber || '-'}</strong></span>
            </div>
            <div className={styles.infoItem}>
              <GraduationCap size={18} />
              <span>Semestre: <strong>{profile.semester || '-'}</strong></span>
            </div>
            <div className={styles.infoItem}>
              <Mail size={18} />
              <span>{profile.email || '-'}</span>
            </div>
            <div className={styles.infoItem}>
              <Hash size={18} />
              <span>Avance: <strong>{profile.academicProgress?.progressPercentage ?? '-'}%</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Gráficas y Promedio */}
      <div className={styles.statsGrid}>
        
        {/* Promedio General con color dinámico */}
        <div className={`${styles.averageCard} ${getAverageColorClass(rawAverage)}`}>
          <span className={styles.averageLabel}>Promedio General</span>
          <span className={styles.averageValue}>{formattedAverage}</span>
        </div>

        {/* Gráfica de Créditos */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Progreso de Créditos</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={creditsData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {creditsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfica de Materias */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Historial de Materias</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={subjectsData}
                cx="50%"
                cy="50%"
                innerRadius={0}
                outerRadius={80}
                dataKey="value"
                stroke="none"
              >
                {subjectsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      {top5Subjects.length > 0 && (
        <div className={styles.fullWidthCard}>
          <h3 className={styles.chartTitle}>Top 5 Mejores Materias</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart 
              data={top5Subjects} 
              layout="vertical" 
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis dataKey="name" type="category" width={180} tick={{fontSize: 12, fill: '#475569'}} />
              <Tooltip cursor={{fill: '#f8fafc'}} />
              <Bar dataKey="calificacion" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default Dashboard;