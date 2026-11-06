import { useState, useEffect } from 'react';
import { Package, CheckCircle, List, CalendarClock } from 'lucide-react';
import { getResources, reserveResource, getMyLoans, type Resource, type Loan } from '../../services/resources';
import { getStudentProfile } from '../../services/student';
import styles from './Resources.module.css';

const Resources = () => {
  const [activeTab, setActiveTab] = useState<'catalogo' | 'mis_prestamos'>('catalogo');
  const [resources, setResources] = useState<Resource[]>([]);
  const [myLoans, setMyLoans] = useState<Loan[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reservingId, setReservingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const profileData = await getStudentProfile();
        const currentId = profileData.controlNumber as string;
        setStudentId(currentId);

        // Cargamos catálogo y préstamos en paralelo
        const [resourcesData, loansData] = await Promise.all([
          getResources(),
          getMyLoans(currentId)
        ]);
        
        setResources(resourcesData);
        setMyLoans(loansData);
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
    if (!studentId) return setMessage({ text: 'Error: No se encontró tu número de control.', type: 'error' });

    try {
      setReservingId(id);
      setMessage(null);
      const result = await reserveResource(id, studentId);
      
      setMessage({ text: '¡Recurso reservado con éxito!', type: 'success' });
      
      // 1. Actualizamos el stock en el catálogo
      setResources(prev => prev.map(res => 
        res.id === id ? { ...res, available_stock: res.available_stock - 1 } : res
      ));
      
      // 2. Agregamos el nuevo préstamo a la lista (asumiendo que el backend nos devuelve el loan creado)
      // Para que se vea bonito, recargamos la lista de préstamos para traer la info completa con los JOINs
      const updatedLoans = await getMyLoans(studentId);
      setMyLoans(updatedLoans);

    } catch (err: any) {
      setMessage({ text: err.message || 'Error al reservar.', type: 'error' });
    } finally {
      setReservingId(null);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending_pickup: 'Por recoger',
      active: 'En préstamo',
      returned: 'Devuelto',
      overdue: 'Atrasado'
    };
    return labels[status] || status;
  };

  const renderCatalog = () => (
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
  );

  const renderMyLoans = () => {
    if (myLoans.length === 0) {
      return <div className={styles.loading}>No tienes préstamos ni reservas activas.</div>;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {myLoans.map(loan => (
          <div key={loan.id} className={styles.loanCard}>
            <div className={styles.loanImage}>
              {loan.resources?.image_url ? (
                <img src={loan.resources.image_url} alt={loan.resources.name} />
              ) : <Package size={32} color="#94a3b8" />}
            </div>
            <div className={styles.loanContent}>
              <div className={styles.loanHeader}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{loan.resources?.category}</div>
                  <h3 className={styles.name}>{loan.resources?.name}</h3>
                </div>
                <span className={`${styles.statusBadge} ${styles[`status_${loan.status}`]}`}>
                  {getStatusLabel(loan.status)}
                </span>
              </div>
              <div className={styles.dateInfo}>
                <span><strong>Fecha de reserva:</strong> {new Date(loan.borrow_date).toLocaleDateString()}</span>
                <span style={{ color: loan.status === 'overdue' ? '#991b1b' : 'inherit' }}>
                  <strong>Devolver antes del:</strong> {new Date(loan.due_date).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <Package size={28} color="#3b82f6" />
          Centro de Préstamos
        </h1>
        <p className={styles.subtitle}>Reserva equipo y consulta tus préstamos activos.</p>
        
        <div className={styles.tabs}>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'catalogo' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('catalogo')}
          >
            <List size={18} /> Catálogo
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'mis_prestamos' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('mis_prestamos')}
          >
            <CalendarClock size={18} /> Mis Préstamos
          </button>
        </div>
      </div>

      {message && (
        <div style={{
          padding: '1rem', borderRadius: '8px',
          backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: message.type === 'success' ? '#166534' : '#991b1b',
          display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500
        }}>
          {message.type === 'success' && <CheckCircle size={20} />}
          {message.text}
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Cargando información...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : activeTab === 'catalogo' ? (
        renderCatalog()
      ) : (
        renderMyLoans()
      )}
    </div>
  );
};

export default Resources;