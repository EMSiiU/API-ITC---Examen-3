import { Router } from 'express';

import {
    getSession,
    login,
    logout,
} from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/login', login);
authRouter.get('/session', getSession);
authRouter.post('/logout', logout);