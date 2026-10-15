import { AppError } from '../utils/errors.js';
import { errorResponse } from '../utils/response.js';
import { config } from '../config/index.js';
import { ZodError } from 'zod';

export function errorHandler(err, req, res, next) {
  // If response has already sent headers, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle known AppError
  if (err instanceof AppError) {
    return errorResponse(res, err.message, err.statusCode, err.code, err.details);
  }

  // Handle Zod Schema Validation Errors
  if (err instanceof ZodError) {
    const formatted = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message
    }));
    return errorResponse(res, 'Request validation failed', 400, 'VALIDATION_ERROR', formatted);
  }

  // Handle SyntaxError (e.g. malformed JSON in body)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return errorResponse(res, 'Malformed JSON payload in request body', 400, 'MALFORMED_JSON');
  }

  // Handle Prisma Specific Errors
  if (err.code === 'P2002') {
    const target = err.meta?.target ? ` Field conflict: ${err.meta.target}` : '';
    return errorResponse(res, `A record with these unique details already exists.${target}`, 409, 'DUPLICATE_RECORD');
  }

  if (err.code === 'P2025') {
    return errorResponse(res, 'The requested database record does not exist', 404, 'RECORD_NOT_FOUND');
  }

  // Fallback for unhandled unexpected errors
  const isDev = config.NODE_ENV === 'development';
  if (isDev) {
    console.error('💥 Unhandled Exception:', err);
  }

  const message = isDev ? err.message : 'An unexpected internal server error occurred';
  const details = isDev ? { stack: err.stack } : null;

  return errorResponse(res, message, 500, 'INTERNAL_SERVER_ERROR', details);
}
