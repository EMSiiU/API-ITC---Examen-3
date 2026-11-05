import {
    createCipheriv,
    createDecipheriv,
    randomBytes,
} from 'node:crypto';

import { env } from '../../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const FORMAT_VERSION = 'v1';

function getEncryptionKey(): Buffer {
    const key = Buffer.from(env.SII_TOKEN_ENCRYPTION_KEY, 'base64');

    if (key.length !== 32) {
        throw new Error(
        'SII_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes.',
        );
    }

    return key;
}

export function encryptSiiToken(
    token: string,
    sessionId: string,
    ): string {
    const iv = randomBytes(IV_LENGTH);

    const cipher = createCipheriv(
        ALGORITHM,
        getEncryptionKey(),
        iv,
        { authTagLength: AUTH_TAG_LENGTH },
    );

    cipher.setAAD(Buffer.from(sessionId, 'utf8'));

    const ciphertext = Buffer.concat([
        cipher.update(token, 'utf8'),
        cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
        FORMAT_VERSION,
        iv.toString('base64url'),
        authTag.toString('base64url'),
        ciphertext.toString('base64url'),
    ].join('.');
}

export function decryptSiiToken(
    encryptedValue: string,
    sessionId: string,
    ): string {
    const [version, ivText, authTagText, ciphertextText, extra] =
        encryptedValue.split('.');

    if (
        version !== FORMAT_VERSION ||
        !ivText ||
        !authTagText ||
        !ciphertextText ||
        extra
    ) {
        throw new Error('Invalid encrypted SII token format.');
    }

    const iv = Buffer.from(ivText, 'base64url');
    const authTag = Buffer.from(authTagText, 'base64url');
    const ciphertext = Buffer.from(ciphertextText, 'base64url');

    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
        throw new Error('Invalid encrypted SII token metadata.');
    }

    const decipher = createDecipheriv(
        ALGORITHM,
        getEncryptionKey(),
        iv,
        { authTagLength: AUTH_TAG_LENGTH },
    );

    decipher.setAAD(Buffer.from(sessionId, 'utf8'));
    decipher.setAuthTag(authTag);

    return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
    ]).toString('utf8');
}