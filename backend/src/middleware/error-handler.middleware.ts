import type { ErrorRequestHandler } from 'express';

function parserErrorType(error: unknown): unknown {
  if (typeof error === 'object' && error !== null && 'type' in error) {
    return error.type;
  }
  return undefined;
}

export const apiErrorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  next,
) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  const type = parserErrorType(error);
  if (type === 'entity.parse.failed') {
    response.status(400).json({ message: 'Invalid JSON request body.' });
    return;
  }
  if (type === 'entity.too.large') {
    response.status(413).json({ message: 'Request body is too large.' });
    return;
  }

  response.status(500).json({ message: 'Unable to process the request.' });
};
