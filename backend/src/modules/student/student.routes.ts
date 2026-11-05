import { Router } from 'express';

import {
    requireAuthenticatedSession,
} from '../auth/authenticated-session.middleware.js';
import { getProfile } from './student.controller.js';

export const studentRouter = Router();

studentRouter.get(
    '/profile',
    requireAuthenticatedSession,
    getProfile,
);