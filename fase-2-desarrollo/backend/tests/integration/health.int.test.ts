import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

// Base de datos caída: toda consulta falla. Esta suite no necesita PostgreSQL.
vi.mock('../../src/config/prisma.js', () => ({
  prisma: { $queryRaw: vi.fn().mockRejectedValue(new Error('base caída')) },
}));

import { createApp } from '../../src/app.js';

describe('Salud de la API sin base de datos (integración)', () => {
  it('I-01 · /health responde 503 y "degraded" cuando la base no contesta', async () => {
    const res = await request(createApp()).get('/api/v1/health');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'degraded', db: 'disconnected' });
  });
});
