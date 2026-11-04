import 'dotenv/config';

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
  SESSION_COOKIE_NAME: z.string().min(1).default('pta_session'),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(8),
  COOKIE_SAME_SITE: z.enum(['lax', 'none']).default('lax'),
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

const raw = parsed.data;
const cookieSecure = raw.COOKIE_SECURE
  ? raw.COOKIE_SECURE === 'true'
  : raw.NODE_ENV === 'production';

if (raw.COOKIE_SAME_SITE === 'none' && !cookieSecure) {
  throw new Error('COOKIE_SAME_SITE=none requires COOKIE_SECURE=true.');
}

if (raw.NODE_ENV === 'production' && !cookieSecure) {
  throw new Error('Production cookies must use COOKIE_SECURE=true.');
}

export const env = {
  ...raw,
  cookieSecure,
};
