import 'dotenv/config';
import { z } from 'zod';

/**
 * Las variables se validan al arrancar: si falta una, el proceso muere aquí
 * y no a mitad de una demo.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET debe tener al menos 16 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  API_BASE_URL: z.string().url().default('http://localhost:3000'),

  TBK_ENV: z.enum(['integration', 'production']).default('integration'),
  TBK_COMMERCE_CODE: z.string().optional(),
  TBK_API_KEY: z.string().optional(),
  TBK_RETURN_URL: z.string().url().default('http://localhost:3000/api/v1/payments/return'),

  PLATFORM_COMMISSION_RATE: z.coerce.number().min(0).max(1).default(0.1),
  RETENTION_WINDOW_HOURS: z.coerce.number().positive().default(12),
  RETENTION_RATE: z.coerce.number().min(0).max(1).default(0.5),
  RATING_WINDOW_HOURS: z.coerce.number().positive().default(48),
  HONOR_SAMPLE_SIZE: z.coerce.number().int().positive().default(20),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
