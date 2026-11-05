import { randomUUID } from 'node:crypto';

import { env } from '../../config/env.js';
import {
    loginWithSii,
    type SiiCredentials,
} from '../sii/sii.client.js';
import {
    createSession,
    type ActiveSession,
} from './session.repository.js';

function calculateExpiration(): Date {
    const millisecondsPerHour = 60 * 60 * 1000;

    return new Date(
        Date.now() + env.SESSION_TTL_HOURS * millisecondsPerHour,
    );
}

export async function authenticateWithSii(
    credentials: SiiCredentials,
): Promise<ActiveSession> {
    const siiToken = await loginWithSii(credentials);
    const sessionId = randomUUID();

    return createSession({
        id: sessionId,
        siiToken,
        expiresAt: calculateExpiration(),
    });
}