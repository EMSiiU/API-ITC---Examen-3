import type { CookieOptions } from 'express';

import { env } from '../../config/env.js';

export const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.COOKIE_SAME_SITE,
  maxAge: env.SESSION_TTL_HOURS * 60 * 60 * 1000,
  path: '/',
};
