import { ApiError } from '../utils/ApiError.js';
import { config } from '../config/env.js';

/**
 * 404 Not Found Middleware
 * Catches any request that didn't match any registered route
 */
export const notFound = (req, res, next) => {
  const error = new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`);
  next(error);
};

/**
 * Global Centralized Error Handling Middleware
 * Must have exactly 4 arguments: (err, req, res, next)
 */
export const errorHandler = (err, req, res, next) => {
  let error = err;

  // If the error isn't an instance of our ApiError, convert it into one
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, error?.errors || [], err.stack);
  }

  const response = {
    statusCode: error.statusCode,
    success: false,
    message: error.message,
    errors: error.errors,
    // Only reveal stack trace in development mode for debugging
    ...(config.NODE_ENV === 'development' && { stack: error.stack }),
  };

  res.status(error.statusCode).json(response);
};
