import { supabase } from '../../lib/supabase.js';
import {
    decryptSiiToken,
    encryptSiiToken,
} from './token-crypto.js';

export interface ActiveSession {
    id: string;
    studentIdentifier: string | null;
    siiToken: string;
    createdAt: Date;
    expiresAt: Date;
    lastSeenAt: Date;
}

interface SessionRow {
    id: string;
    sii_token_ciphertext: string;
    student_identifier: string | null;
    created_at: string;
    expires_at: string;
    last_seen_at: string;
}

function toActiveSession(row: SessionRow): ActiveSession {
    return {
        id: row.id,
        studentIdentifier: row.student_identifier,
        siiToken: decryptSiiToken(row.sii_token_ciphertext, row.id),
        createdAt: new Date(row.created_at),
        expiresAt: new Date(row.expires_at),
        lastSeenAt: new Date(row.last_seen_at),
    };
}

export async function createSession(input: {
    id: string;
    siiToken: string;
    studentIdentifier?: string | null;
    expiresAt: Date;
    }): Promise<ActiveSession> {
    const { data, error } = await supabase
        .from('app_sessions')
        .insert({
        id: input.id,
        sii_token_ciphertext: encryptSiiToken(input.siiToken, input.id),
        student_identifier: input.studentIdentifier ?? null,
        expires_at: input.expiresAt.toISOString(),
        })
        .select(
        'id, sii_token_ciphertext, student_identifier, created_at, expires_at, last_seen_at',
        )
        .single();

    if (error) {
        throw new Error('Could not create session.');
    }

    return toActiveSession(data);
}

export async function findActiveSession(
    sessionId: string,
    ): Promise<ActiveSession | null> {
    const { data, error } = await supabase
        .from('app_sessions')
        .select(
        'id, sii_token_ciphertext, student_identifier, created_at, expires_at, last_seen_at',
        )
        .eq('id', sessionId)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

    if (error) {
        throw new Error('Could not retrieve session.');
    }

    return data ? toActiveSession(data) : null;
}

export async function touchSession(sessionId: string): Promise<void> {
    const { error } = await supabase
        .from('app_sessions')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', sessionId)
        .is('revoked_at', null);

    if (error) {
        throw new Error('Could not update session activity.');
    }
}

export async function revokeSession(sessionId: string): Promise<void> {
    const { error } = await supabase
        .from('app_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', sessionId)
        .is('revoked_at', null);

    if (error) {
        throw new Error('Could not revoke session.');
    }
}