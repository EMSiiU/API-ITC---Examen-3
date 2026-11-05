import { z } from 'zod';

import { env } from '../../config/env.js';
import { SiiApiError } from './sii-api.error.js';

const loginResponseSchema = z.object({
    status: z.literal(200),
    flag: z.literal('success'),
    message: z.object({
        login: z.object({
        token: z.string().min(1),
        }),
    }),
});

export interface SiiCredentials {
    email: string;
    password: string;
}

function siiUrl(path: string): URL {
    return new URL(path, env.SII_API_BASE_URL);
}

export async function loginWithSii(
    credentials: SiiCredentials,
): Promise<string> {
    let response: Response;

    try {
        response = await fetch(siiUrl('/api/login'), {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        signal: AbortSignal.timeout(env.SII_REQUEST_TIMEOUT_MS),
        });
    } catch {
        throw new SiiApiError(
        'unavailable',
        'The institutional service is unavailable.',
        );
    }

    if (response.status === 401 || response.status === 422) {
        throw new SiiApiError(
        'invalid_credentials',
        'Invalid institutional credentials.',
        );
    }

    if (!response.ok) {
        throw new SiiApiError(
        'unavailable',
        'The institutional service could not process the request.',
        );
    }

    const body: unknown = await response.json().catch(() => null);
    const parsed = loginResponseSchema.safeParse(body);

    if (!parsed.success) {
        throw new SiiApiError(
        'invalid_response',
        'The institutional service returned an unexpected response.',
        );
    }

    return parsed.data.message.login.token;
}

export async function getStudentProfile(
    siiToken: string,
): Promise<unknown> {
    let response: Response;

    try {
        response = await fetch(siiUrl('/api/movil/estudiante'), {
        headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${siiToken}`,
        },
        signal: AbortSignal.timeout(env.SII_REQUEST_TIMEOUT_MS),
        });
    } catch {
        throw new SiiApiError(
        'unavailable',
        'The institutional service is unavailable.',
        );
    }

    if (response.status === 401 || response.status === 403) {
        throw new SiiApiError(
        'invalid_session',
        'The institutional session is no longer valid.',
        );
    }

    if (!response.ok) {
        throw new SiiApiError(
        'unavailable',
        'The institutional service could not process the request.',
        );
    }

    const profile: unknown = await response.json().catch(() => null);

    if (profile === null) {
        throw new SiiApiError(
        'invalid_response',
        'The institutional service returned an invalid response.',
        );
    }

    return profile;
}

// Funcion que recibe token y obtiene el kardex del alumno
export async function getStudentKardex(
    siiToken: string,
): Promise<unknown> {
    let response: Response;

    try {
        response = await fetch(
            siiUrl('/api/movil/estudiante/kardex'),
            {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${siiToken}`,
                },
                signal: AbortSignal.timeout(
                    env.SII_REQUEST_TIMEOUT_MS,
                ),
            },
        );
    } catch {
        throw new SiiApiError(
            'unavailable',
            'The institutional service is unavailable.',
        );
    }

    if (response.status === 401 || response.status === 403) {
        throw new SiiApiError(
            'invalid_session',
            'The institutional session is no longer valid.',
        );
    }

    if (!response.ok) {
        throw new SiiApiError(
            'unavailable',
            'The institutional service could not process the request.',
        );
    }

    const kardex: unknown = await response.json().catch(() => null);

    if (kardex === null) {
        throw new SiiApiError(
            'invalid_response',
            'The institutional service returned an invalid response.',
        );
    }

    return kardex;
}

// Funcion que devuelve las calif del alumno
export async function getStudentGrades(
    siiToken: string,
): Promise<unknown> {
    let response: Response;

    try {
        response = await fetch(
            siiUrl('/api/movil/estudiante/calificaciones'),
            {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${siiToken}`,
                },
                signal: AbortSignal.timeout(
                    env.SII_REQUEST_TIMEOUT_MS,
                ),
            },
        );
    } catch {
        throw new SiiApiError(
            'unavailable',
            'The institutional service is unavailable.',
        );
    }

    if (response.status === 401 || response.status === 403) {
        throw new SiiApiError(
            'invalid_session',
            'The institutional session is no longer valid.',
        );
    }

    if (!response.ok) {
        throw new SiiApiError(
            'unavailable',
            'The institutional service could not process the request.',
        );
    }

    const grades: unknown = await response.json().catch(() => null);

    if (grades === null) {
        throw new SiiApiError(
            'invalid_response',
            'The institutional service returned an invalid response.',
        );
    }

    return grades;
}

//Funcion que devuelve el horario
export async function getStudentSchedule(
    siiToken: string,
): Promise<unknown> {
    let response: Response;

    try {
        response = await fetch(
            siiUrl('/api/movil/estudiante/horarios'),
            {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${siiToken}`,
                },
                signal: AbortSignal.timeout(
                    env.SII_REQUEST_TIMEOUT_MS,
                ),
            },
        );
    } catch {
        throw new SiiApiError(
            'unavailable',
            'The institutional service is unavailable.',
        );
    }

    if (response.status === 401 || response.status === 403) {
        throw new SiiApiError(
            'invalid_session',
            'The institutional session is no longer valid.',
        );
    }

    if (!response.ok) {
        throw new SiiApiError(
            'unavailable',
            'The institutional service could not process the request.',
        );
    }

    const schedule: unknown = await response.json().catch(() => null);

    if (schedule === null) {
        throw new SiiApiError(
            'invalid_response',
            'The institutional service returned an invalid response.',
        );
    }

    return schedule;
}