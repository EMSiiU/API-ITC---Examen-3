import { Router } from 'express';
import { getAllResources, createReservation, getMyLoans } from './resources.controller.js';

export const resourcesRouter = Router();

resourcesRouter.get('/', getAllResources);
resourcesRouter.post('/reserve/:id', createReservation);
resourcesRouter.get('/loans/:studentId', getMyLoans);