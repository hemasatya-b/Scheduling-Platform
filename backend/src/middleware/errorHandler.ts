import { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiResponse } from '../types';

/**
 * Centralised error handler. Maps known error shapes (AppError.statusCode,
 * Prisma errors, Zod errors) to the standard API envelope and HTTP status.
 * Must be registered last, after all routers.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Validation failed',
      details: err.flatten(),
    };
    res.status(400).json(response);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const response: ApiResponse<never> = { success: false, error: 'Resource already exists' };
      res.status(409).json(response);
      return;
    }
    if (err.code === 'P2025') {
      const response: ApiResponse<never> = { success: false, error: 'Resource not found' };
      res.status(404).json(response);
      return;
    }
  }

  const statusCode = typeof err?.statusCode === 'number' ? err.statusCode : 500;
  const message = statusCode === 500 ? 'Internal server error' : err?.message ?? 'Error';

  if (statusCode === 500) {
    console.error(err);
  }

  const response: ApiResponse<never> = { success: false, error: message };
  res.status(statusCode).json(response);
};
