import { useState, useEffect } from 'react';
import { Package, CheckCircle, List, CalendarClock, ShieldAlert, Plus } from 'lucide-react';
import { 
  getResources, reserveResource, getMyLoans, cancelReservation,
  getAdminLoans, markAsReturned, markAsActive,
  createAdminResource, adjustResourceStock,
  type Resource, type Loan 
} from '../../services/resources';
import { getStudentProfile } from '../../services/student';
import styles from './Resources.module.css';

const ADMIN_CONTROL_NUMBER = import.meta.env.VITE_ADMIN_CONTROL_NUMBER;

const Resources = () => {
  // Estados Generales
  const [activeTab, setActiveTab] = useState<'catalogo' | 'mis_prestamos'>('catalogo');
  const [adminTab, setAdminTab] = useState<'inventario' | 'prestamos'>('prestamos');
  const [resources, setResources] = useState<Resource[]>([]);
  const [myLoans, setMyLoans] = useState<Loan[]>([]);
  const [adminLoans, setAdminLoans] = useState<Loan[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reservingId, setReservingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  
  // Estados del Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', category: 'Laboratorio', total_stock: 1, image_url: '' });

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
          const [allLoans, catalogData] = await Promise.all([ getAdminLoans(), getResources() ]);
          setAdminLoans(allLoans);
          setResources(catalogData);
        } else {
          const [resourcesData, loansData] = await Promise.all([ getResources(), getMyLoans(currentId) ]);
          setResources(resourcesData);
          setMyLoans(loansData);
        }
      } catch (err) {
        setError('No se pudo cargar la información necesaria.');
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  // --- FUNCIONES DEL ALUMNO ---
  const handleReserve = async (id: string) => {
    if (!studentId) return showMsg('Error: No se encontró tu número de control.', 'error');
    try {
      setReservingId(id);
      await reserveResource(id, studentId);
      setResources(prev => prev.map(res => res.id === id ? { ...res, available_stock: res.available_stock - 1 } : res));
      const updatedLoans = await getMyLoans(studentId);
      setMyLoans(updatedLoans);
      showMsg('¡Recurso reservado con éxito!');
    } catch (err: any) {
      showMsg(err.message || 'Error al reservar.', 'error');
    } finally {
      setReservingId(null);
    }
  };

  const handleCancel = async (loanId: string) => {
    if (!studentId || !window.confirm('¿Deseas cancelar esta reserva?')) return;
    try {
      await cancelReservation(loanId, studentId);
      const [resData, loansData] = await Promise.all([ getResources(), getMyLoans(studentId) ]);
      setResources(resData);
      setMyLoans(loansData);
      showMsg('Reserva cancelada. Inventario actualizado.');
    } catch (err: any) {
      showMsg(err.message, 'error');
    }
  };

  // --- FUNCIONES DEL ADMIN (PRÉSTAMOS) ---
  const handleReturn = async (loanId: string) => {
    if (!window.confirm('¿Confirmar que se entregó el equipo físicamente?')) return;
    try {
      await markAsReturned(loanId);
      const [allLoans, catalogData] = await Promise.all([ getAdminLoans(), getResources() ]);
      setAdminLoans(allLoans);
      setResources(catalogData); // Refrescamos catálogo por si el admin está en la otra pestaña
      showMsg('Equipo devuelto. Inventario actualizado.');
    } catch (err: any) { showMsg(err.message, 'error'); }
  };

  const handleActivate = async (loanId: string) => {
    try {
      await markAsActive(loanId);
      setAdminLoans(await getAdminLoans());
      showMsg('Equipo entregado. Préstamo activo.');
    } catch (err: any) { showMsg(err.message, 'error'); }
  };

  // --- FUNCIONES DEL ADMIN (CATÁLOGO) ---
  const handleStockChange = async (id: string, delta: number) => {
    try {
      const updatedItem = await adjustResourceStock(id, delta);
      // Aquí actualizamos React al instante sin recargar la página
      setResources(prev => prev.map(item => item.id === id ? updatedItem : item));
    } catch (err: any) {
      showMsg(err.message, 'error');
    }
  };

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newItem = await createAdminResource(formData);
      setResources(prev => [newItem, ...prev]); // Lo agregamos al inicio de la lista local
      setIsModalOpen(false);
      setFormData({ name: '', description: '', category: 'Laboratorio', total_stock: 1, image_url: '' });
      showMsg('Recurso agregado al catálogo exitosamente.');
    } catch (err: any) {
      showMsg(err.message, 'error');
    }
  };

  // --- RENDERIZADORES ---
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = { pending_pickup: 'Por recoger', active: 'En préstamo', returned: 'Devuelto', overdue: 'Atrasado', cancelled: 'Cancelado' };
    return labels[status] || status;
  };

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

  const renderCatalog = () => (
    <div className={styles.grid}>
      {resources.map((item) => (
        <div key={item.id} className={styles.card}>
          <div className={styles.imageContainer}>
            {item.image_url ? <img src={item.image_url} alt={item.name} className={styles.image} /> : <Package size={48} color="#94a3b8" />}
            <span className={styles.categoryBadge}>{item.category}</span>
          </div>
          <div className={styles.content}>
            <h3 className={styles.name}>{item.name}</h3>
            <p className={styles.description}>{item.description}</p>
            
            <div className={styles.stockInfo} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Disp: </span>
                <strong style={{ color: item.available_stock > 0 ? '#10b981' : '#ef4444' }}>{item.available_stock} / {item.total_stock}</strong>
              </div>
              
              {/* Controles exclusivos para el Administrador */}
              {isAdmin && (
                <div className={styles.stockControls}>
                  <button className={styles.btnStock} onClick={() => handleStockChange(item.id, -1)} title="Quitar 1 al stock">-</button>
                  <button className={styles.btnStock} onClick={() => handleStockChange(item.id, 1)} title="Añadir 1 al stock">+</button>
                </div>
              )}
            </div>

            {/* Botón de reservar exclusivo para el Alumno */}
            {!isAdmin && (
              <button 
                className={`${styles.reserveBtn} ${styles.btnPrimary}`}
                disabled={item.available_stock <= 0 || reservingId === item.id}
                onClick={() => handleReserve(item.id)}
              >
                {reservingId === item.id ? 'Reservando...' : item.available_stock > 0 ? 'Reservar' : 'Agotado'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  

  const renderAdminTable = () => (
    <div className={styles.adminContainer}>
      <table className={styles.adminTable}>
        <thead>
          <tr>
            <th>ID Alumno</th><th>Recurso</th><th>Fecha</th><th>Estado</th><th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {adminLoans.map(loan => (
            <tr key={loan.id}>
              <td><strong>{loan.student_id}</strong></td>
              <td>{loan.resources?.name} <br/><small style={{color: '#64748b'}}>{loan.resources?.category}</small></td>
              <td>{new Date(loan.borrow_date).toLocaleDateString()}</td>
              <td><span className={`${styles.statusBadge} ${styles[`status_${loan.status}`]}`}>{getStatusLabel(loan.status)}</span></td>
              <td>
                {loan.status === 'pending_pickup' && <button className={styles.btnActivate} onClick={() => handleActivate(loan.id)}>Entregar</button>}
                {(loan.status === 'active' || loan.status === 'overdue') && <button className={styles.btnReturn} onClick={() => handleReturn(loan.id)}>Devolver</button>}
              </td>
            </tr>
          ))}
          {adminLoans.length === 0 && <tr><td colSpan={5} style={{textAlign: 'center'}}>No hay préstamos activos.</td></tr>}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className={styles.title}>
              {isAdmin ? <ShieldAlert size={28} color="#10b981" /> : <Package size={28} color="#3b82f6" />}
              {isAdmin ? 'Panel de Administración' : 'Centro de Préstamos'}
            </h1>
            <p className={styles.subtitle}>{isAdmin ? 'Gestiona el inventario y las entregas.' : 'Reserva equipo y consulta tus préstamos activos.'}</p>
          </div>
          {isAdmin && adminTab === 'inventario' && (
            <button className={styles.btnAddResource} onClick={() => setIsModalOpen(true)}>
              <Plus size={18} /> Nuevo Recurso
            </button>
          )}
        </div>
        
        {/* Pestañas */}
        <div className={styles.tabs}>
          {isAdmin ? (
            <>
              <button className={`${styles.tabBtn} ${adminTab === 'prestamos' ? styles.tabActive : ''}`} onClick={() => setAdminTab('prestamos')}><CalendarClock size={18} /> Préstamos Globales</button>
              <button className={`${styles.tabBtn} ${adminTab === 'inventario' ? styles.tabActive : ''}`} onClick={() => setAdminTab('inventario')}><List size={18} /> Inventario</button>
            </>
          ) : (
            <>
              <button className={`${styles.tabBtn} ${activeTab === 'catalogo' ? styles.tabActive : ''}`} onClick={() => setActiveTab('catalogo')}><List size={18} /> Catálogo</button>
              <button className={`${styles.tabBtn} ${activeTab === 'mis_prestamos' ? styles.tabActive : ''}`} onClick={() => setActiveTab('mis_prestamos')}><CalendarClock size={18} /> Mis Préstamos</button>
            </>
          )}
        </div>
      </div>

      {message && (
        <div style={{ padding: '1rem', borderRadius: '8px', marginBottom: '1rem', backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2', color: message.type === 'success' ? '#166534' : '#991b1b', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
          {message.type === 'success' && <CheckCircle size={20} />} {message.text}
        </div>
      )}

      {loading ? <div className={styles.loading}>Cargando información...</div> : error ? <div className={styles.error}>{error}</div> : 
        isAdmin ? (adminTab === 'prestamos' ? renderAdminTable() : renderCatalog()) : 
        (activeTab === 'catalogo' ? renderCatalog() : renderMyLoans())
      }

      {/* MODAL DE CREACIÓN */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Agregar Nuevo Recurso</h3>
            <form onSubmit={handleCreateResource}>
              <div className={styles.formGroup}>
                <label>Nombre del artículo</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej. Osciloscopio Digital" />
              </div>
              <div className={styles.formGroup}>
                <label>Descripción corta</label>
                <textarea required rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div style={{display: 'flex', gap: '1rem'}}>
                <div className={styles.formGroup} style={{flex: 1}}>
                  <label>Categoría</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option value="Laboratorio">Laboratorio</option>
                    <option value="Biblioteca">Biblioteca</option>
                    <option value="Cubículos">Cubículos</option>
                    <option value="Deportes">Deportes</option>
                  </select>
                </div>
                <div className={styles.formGroup} style={{flex: 1}}>
                  <label>Stock Inicial</label>
                  <input required type="number" min="1" value={formData.total_stock} onChange={e => setFormData({...formData, total_stock: Number(e.target.value)})} />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>URL de la Imagen (Internet)</label>
                <input required type="url" value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} placeholder="https://..." />
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{padding: '0.5rem 1rem', border: 'none', background: 'transparent', cursor: 'pointer'}}>Cancelar</button>
                <button type="submit" style={{padding: '0.5rem 1rem', border: 'none', background: '#3b82f6', color: 'white', borderRadius: '6px', cursor: 'pointer'}}>Guardar Recurso</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Resources;