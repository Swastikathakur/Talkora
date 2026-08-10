import { ZodError } from 'zod';

// Wraps a Zod schema into Express middleware. Validates the given part of
// the request (body/params/query), replaces it with the parsed+typed
// result, and short-circuits with a 400 on failure — so controllers never
// need to re-validate input themselves.
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      req[source] = schema.parse(req[source]);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: err.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }
      next(err);
    }
  };
}