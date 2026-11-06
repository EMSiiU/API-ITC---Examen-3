import { Router } from 'express';
import { 
  getAllResources, 
  createReservation, 
  getMyLoans, 
  cancelMyReservation,
  getAdminLoans,
  returnResource,
  activateResource
} from './resources.controller.js';

export const resourcesRouter = Router();

resourcesRouter.get('/', getAllResources);
resourcesRouter.post('/reserve/:id', createReservation);
resourcesRouter.get('/loans/:studentId', getMyLoans);
resourcesRouter.post('/loans/:id/cancel', cancelMyReservation);

// Rutas de Administración
resourcesRouter.get('/admin/loans', getAdminLoans);
resourcesRouter.post('/admin/loans/:id/return', returnResource);
resourcesRouter.post('/admin/loans/:id/activate', activateResource);