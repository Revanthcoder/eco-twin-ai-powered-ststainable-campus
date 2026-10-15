/**
 * Middleware factory to validate Express requests using Zod schemas
 * @param {object} schemas - Object containing optional body, query, and params Zod schemas
 * @returns {import('express').RequestHandler}
 */
export function validateRequest({ body, query, params }) {
  return (req, res, next) => {
    try {
      if (body) {
        req.body = body.parse(req.body);
      }
      if (query) {
        req.query = query.parse(req.query);
      }
      if (params) {
        req.params = params.parse(req.params);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
