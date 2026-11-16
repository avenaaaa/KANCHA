import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
// El error inesperado se registra en el log; aquí no hace falta ensuciar la salida de las pruebas.
vi.mock('../../src/config/logger.js', () => ({ logger: { error: vi.fn() } }));

import { errorHandler } from '../../src/middlewares/errorHandler.js';
import { conflict } from '../../src/utils/errors.js';

/** Respuesta mínima de Express: guarda el código y el cuerpo que el manejador escribe. */
function respond(err: unknown) {
  const out = { status: 0, body: {} as { error: { code: string; message: string; details: unknown } } };
  const res = {
    status(code: number) {
      out.status = code;
      return res;
    },
    json(body: typeof out.body) {
      out.body = body;
      return res;
    },
  } as unknown as Response;
  errorHandler(err, {} as Request, res, vi.fn());
  return out;
}

describe('errorHandler · formato único de error (DESARROLLO.md §5.1)', () => {
  it('U-76 · un error de negocio sale con su código HTTP y su código de error', () => {
    expect(respond(conflict('MATCH_FULL', 'Sin cupos'))).toEqual({
      status: 409,
      body: { error: { code: 'MATCH_FULL', message: 'Sin cupos', details: null } },
    });
  });

  it('U-77 · un error de Zod sale como 422 VALIDATION_ERROR', () => {
    const r = respond(new ZodError([{ code: 'custom', path: ['email'], message: 'Correo inválido' }]));
    expect(r.status).toBe(422);
    expect(r.body.error).toMatchObject({ code: 'VALIDATION_ERROR', details: { email: ['Correo inválido'] } });
  });

  it('U-78 · un error inesperado sale como 500 genérico, sin filtrar el mensaje interno', () => {
    const r = respond(new Error('password=secreto en la consulta SQL'));
    expect(r.status).toBe(500);
    expect(r.body.error).toEqual({ code: 'INTERNAL_ERROR', message: 'Error interno del servidor', details: null });
    expect(JSON.stringify(r.body)).not.toContain('secreto');
  });
});
