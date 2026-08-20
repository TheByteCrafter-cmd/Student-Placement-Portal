import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error internally for debugging
  console.error(`[Error Log] ${req.method} ${req.originalUrl}:`, err?.message || err);

  const statusCode = typeof err.status === 'number' ? err.status : 500;
  
  // Clean public response payload omitting stack traces and sensitive connection strings
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.publicMessage || err.message || 'An unexpected error occurred on the server.',
    },
  });
}
