import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { logger } from '../config/logger.js';

/** Forma única de error para toda la API. Ver DESARROLLO.md §5.1. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Los datos enviados no son válidos',
        details: err.flatten().fieldErrors,
      },
    });
    return;
  }

  logger.error({ err }, 'Error no controlado');
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor', details: null },
  });
}
