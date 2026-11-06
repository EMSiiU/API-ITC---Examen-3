import { z } from 'zod';

const sessionIdSchema = z.uuid();

export function isSessionId(value: unknown): value is string {
  return sessionIdSchema.safeParse(value).success;
}
