import { Request, Response } from 'express';
import { getAvailableResources, reserveResource } from './resources.service.js';

export const getAllResources = async (req: Request, res: Response) => {
  try {
    const resources = await getAvailableResources();
    res.json(resources);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createReservation = async (req: Request, res: Response) => {
  try {
    const resourceId = req.params.id as string;
    // Fallback de studentId en caso de no tener el middleware de sesión de Emilio aún
    const studentId = req.body.studentId as string || 'ALUMNO_MOCK_123'; 

    const result = await reserveResource(studentId, resourceId);
    res.json(result);
  } catch (error: any) {
    const status = error.message.includes('stock') || error.message.includes('existe') ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
};