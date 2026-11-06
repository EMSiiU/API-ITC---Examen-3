import { useState, useEffect } from 'react';
import { Package, CheckCircle } from 'lucide-react';
import { getResources, reserveResource, type Resource } from '../../services/resources';
import { getStudentProfile } from '../../services/student';
import styles from './Resources.module.css';

const Resources = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reservingId, setReservingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        // Hacemos ambas peticiones en paralelo para no perder tiempo
        const [resourcesData, profileData] = await Promise.all([
          getResources(),
          getStudentProfile()
        ]);
        
        setResources(resourcesData);
        // Asumiendo que tu perfil devuelve 'controlNumber' o 'id'
        setStudentId(profileData.controlNumber); 
      } catch (err) {
        setError('No se pudo cargar la información necesaria.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  const handleReserve = async (id: string) => {
    if (!studentId) {
      setMessage({ text: 'Error de sesión: No se encontró tu número de control.', type: 'error' });
      return;
    }

    try {
      setReservingId(id);
      setMessage(null);
      
      // Le pasamos el NC real
      await reserveResource(id, studentId);
      
      setMessage({ text: '¡Recurso reservado con éxito! Tienes 3 días para recogerlo.', type: 'success' });
      setResources(prev => prev.map(res => 
        res.id === id ? { ...res, available_stock: res.available_stock - 1 } : res
      ));
    } catch (err: any) {
      setMessage({ text: err.message || 'Error al reservar el recurso.', type: 'error' });
    } finally {
      setReservingId(null);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <Package size={28} color="#3b82f6" />
          Centro de Préstamos
        </h1>
        <p className={styles.subtitle}>
          Reserva libros, equipo de laboratorio y espacios de estudio.
        </p>
      </div>

      {message && (
        <div style={{
          padding: '1rem',
          borderRadius: '8px',
          backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: message.type === 'success' ? '#166534' : '#991b1b',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: 500
        }}>
          {message.type === 'success' && <CheckCircle size={20} />}
          {message.text}
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Cargando catálogo...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : (
        <div className={styles.grid}>
          {resources.map((item) => {
            const hasStock = item.available_stock > 0;
            const isReserving = reservingId === item.id;

            return (
              <div key={item.id} className={styles.card}>
                <div className={styles.imageContainer}>
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className={styles.image} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                      <Package size={48} />
                    </div>
                  )}
                  <span className={styles.categoryBadge}>{item.category}</span>
                </div>
                
                <div className={styles.content}>
                  <h3 className={styles.name}>{item.name}</h3>
                  <p className={styles.description}>{item.description}</p>
                  
                  <div className={styles.stockInfo}>
                    <span style={{ color: '#64748b' }}>Disponibles:</span>
                    <span className={hasStock ? styles.stockAvailable : styles.stockEmpty}>
                      {item.available_stock} / {item.total_stock}
                    </span>
                  </div>

                  <button 
                    className={`${styles.reserveBtn} ${styles.btnPrimary}`}
                    disabled={!hasStock || isReserving}
                    onClick={() => handleReserve(item.id)}
                  >
                    {isReserving ? 'Reservando...' : hasStock ? 'Reservar' : 'Agotado'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Resources;