import { Router } from 'express';

import {
    requireAuthenticatedSession,
} from '../auth/authenticated-session.middleware.js';

import {
    getProfile,
    getKardex,
    getGrades,
    getSchedule,
} from './student.controller.js';

export const studentRouter = Router();

studentRouter.get(
    '/profile',
    requireAuthenticatedSession,
    getProfile,
);

studentRouter.get(
    '/kardex',
    requireAuthenticatedSession,
    getKardex,
);

studentRouter.get(
    '/grades',
    requireAuthenticatedSession,
    getGrades,
);

studentRouter.get(
    '/schedule',
    requireAuthenticatedSession,
    getSchedule,
);