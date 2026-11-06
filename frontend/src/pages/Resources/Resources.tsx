import { useState, useEffect } from 'react';
import { Package, CheckCircle, List, CalendarClock, ShieldAlert } from 'lucide-react';
import { 
  getResources, reserveResource, getMyLoans, cancelReservation,
  getAdminLoans, markAsReturned, markAsActive, type Resource, type Loan 
} from '../../services/resources';
import { getStudentProfile } from '../../services/student';
import styles from './Resources.module.css';

const ADMIN_CONTROL_NUMBER = import.meta.env.VITE_ADMIN_CONTROL_NUMBER;

const Resources = () => {
  const [activeTab, setActiveTab] = useState<'catalogo' | 'mis_prestamos'>('catalogo');
  const [resources, setResources] = useState<Resource[]>([]);
  const [myLoans, setMyLoans] = useState<Loan[]>([]);
  const [adminLoans, setAdminLoans] = useState<Loan[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
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
        
        const isUserAdmin = currentId === ADMIN_CONTROL_NUMBER;
        setIsAdmin(isUserAdmin);

        if (isUserAdmin) {
          // Si es admin, solo cargamos la lista global
          const allLoans = await getAdminLoans();
          setAdminLoans(allLoans);
        } else {
          // Si es alumno, cargamos su catálogo y sus préstamos
          const [resourcesData, loansData] = await Promise.all([
            getResources(),
            getMyLoans(currentId)
          ]);
          setResources(resourcesData);
          setMyLoans(loansData);
        }
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

  const handleCancel = async (loanId: string) => {
  if (!studentId) return;
  if (!window.confirm('¿Estás seguro de que deseas cancelar esta reserva?')) return;

  try {
    setMessage(null);
    await cancelReservation(loanId, studentId);
    
    setMessage({ text: 'Reserva cancelada. El inventario ha sido actualizado.', type: 'success' });
    
    // Recargar datos para tener los stocks correctos y la vista actualizada
    const [resourcesData, loansData] = await Promise.all([
      getResources(),
      getMyLoans(studentId)
    ]);
    setResources(resourcesData);
    setMyLoans(loansData);
  } catch (err: any) {
    setMessage({ text: err.message || 'Error al cancelar.', type: 'error' });
  } finally {
    setTimeout(() => setMessage(null), 5000);
  }
};

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending_pickup: 'Por recoger',
      active: 'En préstamo',
      returned: 'Devuelto',
      overdue: 'Atrasado',
      cancelled: 'Cancelado'
    };
    return labels[status] || status;
  };

  const handleReturn = async (loanId: string) => {
    if (!window.confirm('¿Confirmar que el alumno entregó el equipo físicamente?')) return;
    
    try {
      setMessage(null);
      await markAsReturned(loanId);
      setMessage({ text: 'Equipo marcado como devuelto. Inventario actualizado.', type: 'success' });
      
      // Recargar la tabla del admin
      const allLoans = await getAdminLoans();
      setAdminLoans(allLoans);
    } catch (err: any) {
      setMessage({ text: err.message || 'Error al procesar la devolución.', type: 'error' });
    } finally {
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleActivate = async (loanId: string) => {
    try {
      setMessage(null);
      await markAsActive(loanId);
      setMessage({ text: 'Equipo entregado. Préstamo activo.', type: 'success' });
      const allLoans = await getAdminLoans();
      setAdminLoans(allLoans);
    } catch (err: any) {
      setMessage({ text: err.message || 'Error al procesar la entrega.', type: 'error' });
    } finally {
      setTimeout(() => setMessage(null), 5000);
    }
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
              {loan.status === 'pending_pickup' && (
                <button 
                  onClick={() => handleCancel(loan.id)}
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.5rem',
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem'
                  }}
                >
                  Cancelar Reserva
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAdminPanel = () => (
    <div className={styles.adminContainer}>
      <table className={styles.adminTable}>
        <thead>
          <tr>
            <th>ID Alumno</th>
            <th>Recurso</th>
            <th>Fecha Préstamo</th>
            <th>Estado</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {adminLoans.map(loan => (
            <tr key={loan.id}>
              <td><strong>{loan.student_id}</strong></td>
              <td>{loan.resources?.name} <br/><small style={{color: '#64748b'}}>{loan.resources?.category}</small></td>
              <td>{new Date(loan.borrow_date).toLocaleDateString()}</td>
              <td>
                <span className={`${styles.statusBadge} ${styles[`status_${loan.status}`]}`}>
                  {getStatusLabel(loan.status)}
                </span>
              </td>
              <td>
                {loan.status === 'pending_pickup' && (
                  <button 
                    className={styles.btnActivate}
                    onClick={() => handleActivate(loan.id)}
                  >
                    Entregar Equipo
                  </button>
                )}
                {(loan.status === 'active' || loan.status === 'overdue') && (
                  <button 
                    className={styles.btnReturn}
                    onClick={() => handleReturn(loan.id)}
                  >
                    Marcar Devuelto
                  </button>
                )}
              </td>
            </tr>
          ))}
          {adminLoans.length === 0 && (
            <tr><td colSpan={5} style={{textAlign: 'center'}}>No hay préstamos registrados.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {isAdmin ? <ShieldAlert size={28} color="#10b981" /> : <Package size={28} color="#3b82f6" />}
          {isAdmin ? 'Panel de Administración de Recursos' : 'Centro de Préstamos'}
        </h1>
        <p className={styles.subtitle}>
          {isAdmin ? 'Gestiona las entregas y devoluciones de toda la escuela.' : 'Reserva equipo y consulta tus préstamos activos.'}
        </p>
        
        {!isAdmin && (
          <div className={styles.tabs}>
            <button className={`${styles.tabBtn} ${activeTab === 'catalogo' ? styles.tabActive : ''}`} onClick={() => setActiveTab('catalogo')}>
              <List size={18} /> Catálogo
            </button>
            <button className={`${styles.tabBtn} ${activeTab === 'mis_prestamos' ? styles.tabActive : ''}`} onClick={() => setActiveTab('mis_prestamos')}>
              <CalendarClock size={18} /> Mis Préstamos
            </button>
          </div>
        )}
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
      ) : isAdmin ? (
        renderAdminPanel()
      ) : activeTab === 'catalogo' ? (
        renderCatalog()
      ) : (
        renderMyLoans()
      )}
    </div>
  );
};

export default Resources;