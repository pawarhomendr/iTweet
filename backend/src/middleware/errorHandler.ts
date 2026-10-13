import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  status?: number;
  isOperational?: boolean;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.status ?? 500;
  const message = err.isOperational ? err.message : 'An unexpected error occurred';

  if (status === 500) {
    console.error('[error]', err);
  }

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

export function createError(message: string, status: number): AppError {
  const err = new Error(message) as AppError;
  err.status = status;
  err.isOperational = true;
  return err;
}
