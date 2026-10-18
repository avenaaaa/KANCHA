import { describe, expect, it } from 'vitest';
import {
  AppError,
  badRequest,
  conflict,
  forbidden,
  notFound,
  unauthorized,
  unprocessable,
} from '../../src/utils/errors.js';

// Cierra DEF-01: utils/errors.ts no tenía pruebas y bajaba la cobertura global.
describe('utils/errors', () => {
  it.each([
    [badRequest('X', 'm'), 400],
    [unauthorized(), 401],
    [forbidden(), 403],
    [notFound('X', 'm'), 404],
    [conflict('X', 'm'), 409],
    [unprocessable('X', 'm'), 422],
  ])('U-55 · cada constructor devuelve su código HTTP (%#)', (err, status) => {
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(status);
  });

  it('U-56 · details es null cuando no se entrega', () => {
    expect(conflict('X', 'm').details).toBeNull();
  });
});
