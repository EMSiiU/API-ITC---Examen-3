import { z } from 'zod';

import { env } from '../../config/env.js';
import { SiiApiError } from './sii-api.error.js';

const loginResponseSchema = z.object({
    token: z.string().min(1),
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

    return parsed.data.token;
}