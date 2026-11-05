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
    getStudentKardex,
    getStudentGrades,
    getStudentSchedule,
} from '../sii/sii.client.js';
import { SiiApiError } from '../sii/sii-api.error.js';
import { ZodError } from 'zod';
import { parseStudentProfile } from './student-profile.dto.js';
import { parseStudentKardex } from './student-kardex.dto.js';
import { parseStudentGrades } from './student-grades.dto.js';
import { parseStudentSchedule } from './student-schedule.dto.js';

export async function getProfile(
    request: Request,
    response: Response,
): Promise<void> {
    const session = getAuthenticatedSession(request);

    try {
        const rawProfile = await getStudentProfile(session.siiToken);
        const profile = parseStudentProfile(rawProfile);

        response.status(200).json({profile,});
    } catch (error) {
        if (error instanceof ZodError) {
            response.status(502).json({
                message: 'The institutional service returned an invalid profile response.',
            });
            return;
        }

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

export async function getKardex(
    request: Request,
    response: Response,
): Promise<void> {
    const session = getAuthenticatedSession(request);

    try {
    const rawKardex = await getStudentKardex(session.siiToken);
    const kardex = parseStudentKardex(rawKardex);

    response.status(200).json({ kardex });
    } catch (error) {
        if (error instanceof ZodError) {
            response.status(502).json({
                message: 'The institutional service returned an invalid kardex response.',
            });
            return;
        }

        if (error instanceof SiiApiError) {
            if (error.code === 'invalid_session') {
                response.clearCookie(
                    env.SESSION_COOKIE_NAME,
                    clearSessionCookieOptions,
                );

                try {
                    await revokeSession(session.id);
                } catch {
                    response.status(500).json({
                        message: 'Unable to revoke the expired session.',
                    });
                    return;
                }

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
            message: 'Unable to retrieve the student kardex.',
        });
    }
}

export async function getGrades(
    request: Request,
    response: Response,
): Promise<void> {
    const session = getAuthenticatedSession(request);

    try {
        const rawGrades = await getStudentGrades(session.siiToken);
        const grades = parseStudentGrades(rawGrades);

        response.status(200).json({ grades });
    } catch (error) {
        if (error instanceof ZodError) {
            response.status(502).json({
                message: 'The institutional service returned an invalid grades response.',
            });
            return;
        }

        if (error instanceof SiiApiError) {
            if (error.code === 'invalid_session') {
                response.clearCookie(
                    env.SESSION_COOKIE_NAME,
                    clearSessionCookieOptions,
                );

                try {
                    await revokeSession(session.id);
                } catch {
                    response.status(500).json({
                        message: 'Unable to revoke the expired session.',
                    });
                    return;
                }

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
            message: 'Unable to retrieve the student grades.',
        });
    }
}

export async function getSchedule(
    request: Request,
    response: Response,
): Promise<void> {
    const session = getAuthenticatedSession(request);

    try {
        const rawSchedule = await getStudentSchedule(session.siiToken);
        const schedule = parseStudentSchedule(rawSchedule);

        response.status(200).json({ schedule });

    } catch (error) {
        if (error instanceof ZodError) {
            response.status(502).json({
                message: 'The institutional service returned an invalid schedule response.',
            });
            return;
        }

        if (error instanceof SiiApiError) {
            if (error.code === 'invalid_session') {
                response.clearCookie(
                    env.SESSION_COOKIE_NAME,
                    clearSessionCookieOptions,
                );

                try {
                    await revokeSession(session.id);
                } catch {
                    response.status(500).json({
                        message: 'Unable to revoke the expired session.',
                    });
                    return;
                }

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
            message: 'Unable to retrieve the student schedule.',
        });
    }
}
