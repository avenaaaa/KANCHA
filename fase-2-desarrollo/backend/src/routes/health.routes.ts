import { Router } from 'express';
import { prisma } from '../config/prisma.js';

export const healthRouter = Router();

/** Usado por el healthcheck de Docker y por el profesor para verificar que todo subió. */
healthRouter.get('/health', async (_req, res) => {
  let db: 'connected' | 'disconnected' = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = 'connected';
  } catch {
    db = 'disconnected';
  }

  res.status(db === 'connected' ? 200 : 503).json({
    status: db === 'connected' ? 'ok' : 'degraded',
    db,
    version: process.env['npm_package_version'] ?? '0.3.0',
    timestamp: new Date().toISOString(),
  });
});
