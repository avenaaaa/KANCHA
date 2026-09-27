import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './config/prisma.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`🟠 Kancha API escuchando en http://localhost:${env.PORT}/api/v1`);
});

const shutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} recibido, cerrando…`);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
