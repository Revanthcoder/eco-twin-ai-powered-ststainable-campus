export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', id = null) {
    const msg = id ? `${resource} with id '${id}' was not found` : `${resource} not found`;
    super(msg, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 410 || 401, 'UNAUTHORIZED');
    this.statusCode = 401;
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden: Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists or conflict occurred') {
    super(message, 409, 'CONFLICT');
  }
}

export class ExternalServiceError extends AppError {
  constructor(service = 'External Service', message = 'Service unavailable or timed out', details = null) {
    super(`[${service}] ${message}`, 503, 'EXTERNAL_SERVICE_ERROR', details);
  }
}
