import type { RequestHandler } from 'express';

import { env } from '../config/env.js';

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
const allowedOrigin = new URL(env.FRONTEND_ORIGIN).origin;

export const requireTrustedMutationOrigin: RequestHandler = (
  request,
  response,
  next,
) => {
  if (safeMethods.has(request.method)) {
    next();
    return;
  }

  const origin = request.get('Origin');
  const referer = request.get('Referer');
  let untrusted = false;

  if (origin !== undefined) {
    // Exact comparison also rejects opaque "null" origins and lookalike domains.
    untrusted = origin !== allowedOrigin;
  } else if (referer !== undefined) {
    try {
      untrusted = new URL(referer).origin !== allowedOrigin;
    } catch {
      untrusted = true;
    }
  } else {
    // Headerless command-line/Postman clients remain supported. Browser requests
    // explicitly marked cross-site cannot use that compatibility path.
    untrusted = request.get('Sec-Fetch-Site') === 'cross-site';
  }

  if (untrusted) {
    response.status(403).json({ message: 'Request origin is not allowed.' });
    return;
  }

  next();
};
