import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Global error handler middleware
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Log the error
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle errors with statusCode and error code
  if (err.statusCode && err.code) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
  }

  // Default error response
  return res.status(500).json({
    error: 'Internal server error'
  });
}

export function notFoundHandler(req: Request, res: Response) {
  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
  });

  res.status(404).json({
    error: 'Route not found',
    path: req.path,
  });
}

// Async error wrapper to catch errors in async route handlers
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
