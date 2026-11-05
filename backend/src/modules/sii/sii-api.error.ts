export type SiiApiErrorCode =
    | 'invalid_credentials'
    | 'unavailable'
    | 'invalid_response';

export class SiiApiError extends Error {
    constructor(
        public readonly code: SiiApiErrorCode,
        message: string,
    ) {
        super(message);
        this.name = 'SiiApiError';
    }
}