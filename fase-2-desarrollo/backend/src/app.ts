import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './utils/errors.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/v1', apiRouter);

  app.use((req, _res, next) => {
    next(notFound('ROUTE_NOT_FOUND', `No existe la ruta ${req.method} ${req.originalUrl}`));
  });

  app.use(errorHandler);

  return app;
}
