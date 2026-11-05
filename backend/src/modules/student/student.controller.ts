import type { Request, Response } from 'express';

import { env } from '../../config/env.js';
import {
    getAuthenticatedSession,
} from '../auth/authenticated-session.middleware.js';
import {
    revokeSession,
} from '../auth/session.repository.js';
import {
    clearSessionCookieOptions,
} from '../auth/session-cookie.js';
import {
    getStudentProfile,
} from '../sii/sii.client.js';
import { SiiApiError } from '../sii/sii-api.error.js';

export async function getProfile(
    request: Request,
    response: Response,
): Promise<void> {
    const session = getAuthenticatedSession(request);

    try {
        const profile = await getStudentProfile(session.siiToken);

        response.status(200).json({
        profile,
        });
    } catch (error) {
        if (error instanceof SiiApiError) {
        if (error.code === 'invalid_session') {
            await revokeSession(session.id);

            response.clearCookie(
            env.SESSION_COOKIE_NAME,
            clearSessionCookieOptions,
            );

            response.status(401).json({
            message: 'Institutional session expired.',
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
        return;
        }

        response.status(500).json({
        message: 'Unable to retrieve the student profile.',
        });
    }
}