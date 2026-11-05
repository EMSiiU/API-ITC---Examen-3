import type { Request, Response } from 'express';
import { z } from 'zod';

import { env } from '../../config/env.js';
import { SiiApiError } from '../sii/sii-api.error.js';
import {
    authenticateWithSii,
} from './authentication.service.js';
import {
    findActiveSession,
    revokeSession,
    touchSession,
} from './session.repository.js';
import { sessionCookieOptions } from './session-cookie.js';

const loginBodySchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

function clearSessionCookie(response: Response): void {
    response.clearCookie(env.SESSION_COOKIE_NAME, {
        ...sessionCookieOptions,
        maxAge: 0,
    });
}

function sendInternalError(response: Response): void {
    response.status(500).json({
        message: 'Unable to process the request.',
    });
}

function sendSiiError(
    error: SiiApiError,
    response: Response,
): void {
    if (error.code === 'invalid_credentials') {
        response.status(401).json({
        message: 'Invalid email or password.',
        });
        return;
    }

    if (error.code === 'invalid_response') {
        response.status(502).json({
        message: 'The institutional service returned an invalid response.',
        });
        return;
    }

    response.status(503).json({
        message: 'The institutional service is currently unavailable.',
    });
}

export async function login(
    request: Request,
    response: Response,
    ): Promise<void> {
    const parsedBody = loginBodySchema.safeParse(request.body);

    if (!parsedBody.success) {
        response.status(400).json({
        message: 'Email and password are required.',
        });
        return;
    }

    try {
        const session = await authenticateWithSii(parsedBody.data);

        response.cookie(
        env.SESSION_COOKIE_NAME,
        session.id,
        sessionCookieOptions,
        );

        response.status(200).json({
        authenticated: true,
        });
    } catch (error) {
        if (error instanceof SiiApiError) {
        sendSiiError(error, response);
        return;
        }

        sendInternalError(response);
    }
}

export async function getSession(
    request: Request,
    response: Response,
    ): Promise<void> {
    const sessionId = request.cookies[env.SESSION_COOKIE_NAME];

    if (typeof sessionId !== 'string' || sessionId.length === 0) {
        clearSessionCookie(response);

        response.status(401).json({
        authenticated: false,
        message: 'Session not found or expired.',
        });
        return;
    }

    try {
        const session = await findActiveSession(sessionId);

        if (!session) {
        clearSessionCookie(response);

        response.status(401).json({
            authenticated: false,
            message: 'Session not found or expired.',
        });
        return;
        }

        await touchSession(session.id);

        response.status(200).json({
        authenticated: true,
        });
    } catch {
        sendInternalError(response);
    }
}

export async function logout(
    request: Request,
    response: Response,
): Promise<void> {
    const sessionId = request.cookies[env.SESSION_COOKIE_NAME];

    try {
        if (typeof sessionId === 'string' && sessionId.length > 0) {
        await revokeSession(sessionId);
        }

        clearSessionCookie(response);
        response.status(204).send();
    } catch {
        sendInternalError(response);
    }
}