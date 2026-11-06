import { useState, useEffect, useMemo } from 'react';
import { Search, BookOpen, ArrowUpDown } from 'lucide-react';
import { getStudentKardex, type KardexSubject } from '../../services/kardex';
import styles from './Kardex.module.css';

// Columnas que se pueden orednar
type SortKey = 'name' | 'semester' | 'credits' | 'grade';

const Kardex = () => {
  const [kardex, setKardex] = useState<KardexSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // EStados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    const fetchKardex = async () => {
      try {
        setLoading(true);
        const data = await getStudentKardex();
        setKardex(data);
      } catch (err) {
        setError('No se pudo cargar el historial académico.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchKardex();
  }, []);

  // Función para manejar el clic en los encabezados
  const requestSort = (key: SortKey) => {
    let direction: 'desc' | 'asc' = 'desc'; // Por defecto es descendente al primer clic
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc'; // Si ya estaba descendente, lo invertimos
    }
    setSortConfig({ key, direction });
  };

  // Filtrado y Ordenamiento combinados y optimizados en un solo useMemo
  const processedKardex = useMemo(() => {
    // 1. Primero filtramos
    let result = kardex.filter(subject => 
      subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.period!.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 2. Luego ordenamos si hay una configuración activa
    if (sortConfig !== null) {
      result.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Manejo especial para las calificaciones nulas (como 'AC')
        if (sortConfig.key === 'grade') {
          aValue = aValue !== null ? aValue : -1;
          bValue = bValue !== null ? bValue : -1;
        }

        if (aValue! < bValue!) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue! > bValue!) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [kardex, searchTerm, sortConfig]);

  // Función para determinar el color de la calificación
  const renderGradeBadge = (grade: number | null, label: string | null) => {
    if (grade === null) return <span className={`${styles.badge} ${styles.bgGray}`}>{label || 'N/A'}</span>;
    if (grade >= 85) return <span className={`${styles.badge} ${styles.bgGreen}`}>{grade}</span>;
    if (grade >= 70) return <span className={`${styles.badge} ${styles.bgYellow}`}>{grade}</span>;
    return <span className={`${styles.badge} ${styles.bgRed}`}>{grade}</span>;
  };

  // Helper para renderizar los encabezados clickeables
  const renderSortableHeader = (label: string, sortKey: SortKey) => (
    <th className={styles.sortableHeader} onClick={() => requestSort(sortKey)}>
      <div className={styles.headerContent}>
        {label}
        <ArrowUpDown 
          className={sortConfig?.key === sortKey ? styles.sortIconActive : styles.sortIcon} 
        />
      </div>
    </th>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <BookOpen size={28} color="#3b82f6" />
          Kardex del Alumno
        </h1>
        
        <div className={styles.searchContainer}>
          <Search size={18} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Buscar por materia o periodo..." 
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.loading}>Cargando historial...</div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : processedKardex.length === 0 ? (
          <div className={styles.empty}>No se encontraron materias que coincidan con la búsqueda.</div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Periodo</th>
                  {renderSortableHeader('Materia', 'name')}
                  {renderSortableHeader('Semestre', 'semester')}
                  {renderSortableHeader('Créditos', 'credits')}
                  {renderSortableHeader('Calificación', 'grade')}
                  <th>Observación</th>
                </tr>
              </thead>
              <tbody>
                {processedKardex.map((subject, index) => (
                  <tr key={`${subject.code}-${index}`}>
                    <td>{subject.period}</td>
                    <td className={styles.subjectName}>{subject.name}</td>
                    <td>{subject.semester}</td>
                    <td>{subject.credits}</td>
                    <td>{renderGradeBadge(subject.grade, subject.gradeLabel)}</td>
                    <td>{subject.evaluationDescription}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Kardex;