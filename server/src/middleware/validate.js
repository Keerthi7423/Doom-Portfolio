import { ApiError } from '../utils/ApiError.js';

/**
 * Higher-order middleware to validate incoming request data against a Zod schema.
 * Inspects req.body, req.query, and req.params before passing control to controllers.
 * 
 * @param {import('zod').ZodSchema} schema
 */
export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Replace request parts with sanitized & type-coerced data
    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query;
    if (parsed.params) req.params = parsed.params;

    next();
  } catch (error) {
    // Format Zod issues into a clean, human-readable array
    const formattedErrors = error.errors?.map((err) => ({
      field: err.path.join('.').replace(/^(body|query|params)\./, ''),
      message: err.message,
    })) || [{ message: error.message }];

    // Forward an operational 400 Bad Request to your central errorHandler
    next(new ApiError(400, 'Request validation failed', formattedErrors));
  }
};
