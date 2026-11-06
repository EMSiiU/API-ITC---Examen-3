import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';

import { env } from './config/env.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { studentRouter } from './modules/student/student.routes.js';
import { resourcesRouter } from './modules/resources/resources.routes.js';
import { requireTrustedMutationOrigin } from './middleware/request-origin.middleware.js';
import { apiErrorHandler } from './middleware/error-handler.middleware.js';

export const app = express();

app.set('trust proxy', 1);

app.use(
  cors({
    origin: new URL(env.FRONTEND_ORIGIN).origin,
    credentials: true,
  }),
);

app.use(requireTrustedMutationOrigin);
app.use(express.json({ limit: '16kb' }));
app.use(cookieParser());

app.use('/auth', authRouter);
app.use('/student', studentRouter);
app.use('/resources', resourcesRouter);

app.get('/health', (_request, response) => {
  response.status(200).json({ status: 'ok' });
});

app.use((_request, response) => {
  response.status(404).json({ message: 'Route not found.' });
});

app.use(apiErrorHandler);
