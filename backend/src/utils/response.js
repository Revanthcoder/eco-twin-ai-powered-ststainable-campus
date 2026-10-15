/**
 * Send standard success JSON response
 * @param {import('express').Response} res
 * @param {any} data - Response payload
 * @param {number} statusCode - HTTP status code (default 200)
 * @param {object} meta - Pagination, timestamps, calculation assumptions, etc.
 */
export function successResponse(res, data = {}, statusCode = 200, meta = {}) {
  return res.status(statusCode).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  });
}

/**
 * Send standard error JSON response
 * @param {import('express').Response} res
 * @param {string} message - Human-readable error message
 * @param {number} statusCode - HTTP status code
 * @param {string} code - Machine-readable error code
 * @param {any} details - Additional error details
 */
export function errorResponse(res, message = 'An error occurred', statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details = null) {
  const payload = {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {})
    }
  };
  return res.status(statusCode).json(payload);
}
