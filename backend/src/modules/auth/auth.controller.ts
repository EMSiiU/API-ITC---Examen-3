import type { Request, Response } from 'express';
import { z } from 'zod';

import { env } from '../../config/env.js';
import { SiiApiError } from '../sii/sii-api.error.js';
import {
    authenticateWithSii,
} from './authentication.service.js';
import {
    getAuthenticatedSession,
} from './authenticated-session.middleware.js';
import {
    revokeSession,
} from './session.repository.js';
import {
    clearSessionCookieOptions,
    sessionCookieOptions,
} from './session-cookie.js';

const loginBodySchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

function clearSessionCookie(response: Response): void {
    response.clearCookie(
        env.SESSION_COOKIE_NAME,
        clearSessionCookieOptions,
    );
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

export function getSession(
    request: Request,
    response: Response,
): void {
    getAuthenticatedSession(request);

    response.status(200).json({
        authenticated: true,
    });
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
