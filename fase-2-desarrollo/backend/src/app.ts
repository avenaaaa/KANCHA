import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './utils/errors.js';
import { openapi } from './docs/openapi.js';

export function createApp() {
  const app = express();

  // Detrás de un proxy (Render), la IP y el protocolo reales vienen en X-Forwarded-*.
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(helmet());
  // En la nube se limita al sitio web propio; la app nativa no usa CORS.
  app.use(cors(env.CORS_ORIGINS ? { origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()) } : undefined));
  app.use(express.json({ limit: '1mb' }));

  // Documentación navegable del contrato (DESARROLLO.md §6.4).
  app.get('/api/docs.json', (_req, res) => {
    res.json(openapi);
  });
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openapi, {
      customSiteTitle: 'Kancha API',
      swaggerOptions: { persistAuthorization: true },
    }),
  );

  app.use('/api/v1', apiRouter);

  app.use((req, _res, next) => {
    next(notFound('ROUTE_NOT_FOUND', `No existe la ruta ${req.method} ${req.originalUrl}`));
  });

  app.use(errorHandler);

  return app;
}
