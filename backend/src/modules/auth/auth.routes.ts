import { Router } from 'express';

import {
    getSession,
    login,
    logout,
} from './auth.controller.js';
import {
    requireAuthenticatedSession,
} from './authenticated-session.middleware.js';

export const authRouter = Router();

authRouter.post('/login', login);
authRouter.get(
    '/session',
    requireAuthenticatedSession,
    getSession,
);
authRouter.post('/logout', logout);
