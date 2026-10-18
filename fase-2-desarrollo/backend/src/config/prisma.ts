import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

export const prisma = new PrismaClient({
  // En pruebas no se loguea: los errores esperados (por ejemplo, un UNIQUE violado
  // a propósito en CN-11) ensuciarían la salida del CI.
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : env.NODE_ENV === 'test' ? [] : ['error'],
});
