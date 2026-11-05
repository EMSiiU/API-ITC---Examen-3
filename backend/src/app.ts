import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';

import { env } from './config/env.js';
import { authRouter } from './modules/auth/auth.routes.js';

export const app = express();

app.set('trust proxy', 1);

app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
  }),
);

app.use(express.json({ limit: '16kb' }));
app.use(cookieParser());

app.use('/auth', authRouter);

app.get('/health', (_request, response) => {
  response.status(200).json({ status: 'ok' });
});