/**
 * Todo error de negocio sale por aquí para que el errorHandler pueda
 * producir siempre la misma forma de respuesta.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details: unknown = null,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (code: string, message: string, details?: unknown) =>
  new AppError(400, code, message, details);
export const unauthorized = (message = 'No autenticado') =>
  new AppError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'No autorizado') => new AppError(403, 'FORBIDDEN', message);
export const notFound = (code: string, message: string) => new AppError(404, code, message);
export const conflict = (code: string, message: string) => new AppError(409, code, message);
export const unprocessable = (code: string, message: string, details?: unknown) =>
  new AppError(422, code, message, details);
