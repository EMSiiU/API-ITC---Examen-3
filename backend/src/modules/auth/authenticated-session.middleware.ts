import type {
  NextFunction,
  Request,
  Response,
} from 'express';

import { env } from '../../config/env.js';
import {
  findActiveSession,
  touchSession,
  type ActiveSession,
} from './session.repository.js';
import { clearSessionCookieOptions } from './session-cookie.js';
import { isSessionId } from './session-id.js';

export interface AuthenticatedRequest extends Request {
  authSession?: ActiveSession;
}

export function getAuthenticatedSession(
  request: Request,
): ActiveSession {
  const session = (request as AuthenticatedRequest).authSession;

  if (!session) {
    throw new Error('Authenticated session is required.');
  }

  return session;
}

export async function requireAuthenticatedSession(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const sessionId = request.cookies[env.SESSION_COOKIE_NAME];

  if (!isSessionId(sessionId)) {
    response.clearCookie(
      env.SESSION_COOKIE_NAME,
      clearSessionCookieOptions,
    );

    response.status(401).json({
      message: 'Authentication is required.',
    });
    return;
  }

  try {
    const session = await findActiveSession(sessionId);

    if (!session) {
      response.clearCookie(
        env.SESSION_COOKIE_NAME,
        clearSessionCookieOptions,
      );

      response.status(401).json({
        message: 'Session not found or expired.',
      });
      return;
    }

    await touchSession(session.id);

    (request as AuthenticatedRequest).authSession = session;
    next();
  } catch {
    response.status(500).json({
      message: 'Unable to validate the session.',
    });
  }
}
