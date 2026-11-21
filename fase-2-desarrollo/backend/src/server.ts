import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './config/prisma.js';
import { startSweep } from './services/notification.service.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`🟠 Kancha API escuchando en http://localhost:${env.PORT}/api/v1`);
});

// HU-10: avisos que dependen del paso del tiempo ("Falta uno", "¿Lo destacas?", ánimo para jugar).
const stopSweep = startSweep();

/** Deja terminar las peticiones en curso (un pago a medio confirmar) antes de salir. */
const shutdown = (signal: string): void => {
  logger.info(`${signal} recibido, cerrando…`);
  stopSweep();
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
  server.closeIdleConnections();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
