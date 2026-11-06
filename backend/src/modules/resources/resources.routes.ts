import { Router } from 'express';
import { getAllResources, createReservation } from './resources.controller.js';

export const resourcesRouter = Router();

resourcesRouter.get('/', getAllResources);
resourcesRouter.post('/reserve/:id', createReservation);