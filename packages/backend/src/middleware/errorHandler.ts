import { FastifyError, FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = async (
  error: FastifyError & AppError,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_ERROR';

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return reply.status(400).send({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: error.errors,
    });
  }

  // Handle AppError
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      statusCode: error.statusCode,
      code: error.code || 'APP_ERROR',
      message: error.message,
    });
  }

  // Default error response
  return reply.status(statusCode).send({
    statusCode,
    code,
    message: error.message || 'Internal server error',
  });
};

// Common error creators
export const errors = {
  unauthorized: () =>
    new AppError(401, 'Unauthorized', 'UNAUTHORIZED'),
  forbidden: () =>
    new AppError(403, 'Forbidden', 'FORBIDDEN'),
  notFound: (resource: string) =>
    new AppError(404, `${resource} not found`, 'NOT_FOUND'),
  badRequest: (message: string) =>
    new AppError(400, message, 'BAD_REQUEST'),
  conflict: (message: string) =>
    new AppError(409, message, 'CONFLICT'),
  unprocessable: (message: string) =>
    new AppError(422, message, 'UNPROCESSABLE_ENTITY'),
};
