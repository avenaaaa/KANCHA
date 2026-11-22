import 'dotenv/config';
import { z } from 'zod';

/**
 * Las variables se validan al arrancar: si falta una, el proceso muere aquí
 * y no a mitad de una demo.
 */
const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    /**
     * Demo local con docker compose: carga los datos de demostración en cada arranque y
     * acepta la clave JWT de ejemplo. Nunca se activa en un despliegue real.
     */
    DEMO_MODE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    /** Saltos de proxy delante de la API: 0 en local, 1 en Render. Define la IP real del cliente (S-12). */
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    /** Orígenes web que pueden llamar a la API, separados por coma. Vacío = cualquiera (demo local y app nativa). */
    CORS_ORIGINS: z.string().optional(),
    /** S-12: contraseñas erradas por IP cada 15 minutos. */
    LOGIN_RATE_LIMIT: z.coerce.number().int().positive().default(10),
    /** S-12: cuentas nuevas por IP cada hora. */
    REGISTER_RATE_LIMIT: z.coerce.number().int().positive().default(20),
    /** S-21: partidos publicados por cuenta cada hora. */
    PUBLISH_RATE_LIMIT: z.coerce.number().int().positive().default(10),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(16, 'JWT_SECRET debe tener al menos 16 caracteres'),
    JWT_EXPIRES_IN: z.string().default('7d'),
    /** Costo de bcrypt. 12 en producción (S-07); las pruebas lo bajan para ir rápido. */
    BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
    API_BASE_URL: z.string().url().default('http://localhost:3000'),

    TBK_ENV: z.enum(['integration', 'production']).default('integration'),
    TBK_COMMERCE_CODE: z.string().optional(),
    TBK_API_KEY: z.string().optional(),
    /** Opcional: sin ella, Transbank vuelve a la misma dirección por la que la app llegó a la API (PC, red local o nube). */
    TBK_RETURN_URL: z.preprocess((v) => (v === '' ? undefined : v), z.string().url().optional()),

    PLATFORM_COMMISSION_RATE: z.coerce.number().min(0).max(1).default(0.1),
    RETENTION_WINDOW_HOURS: z.coerce.number().positive().default(12),
    RETENTION_RATE: z.coerce.number().min(0).max(1).default(0.5),
    RATING_WINDOW_HOURS: z.coerce.number().positive().default(48),
    /** KAN-37: un partido es "urgente" si le falta 1 jugador y empieza dentro de estas horas. */
    URGENT_WINDOW_HOURS: z.coerce.number().positive().default(2),
    HONOR_SAMPLE_SIZE: z.coerce.number().int().positive().default(20),
    /** HU-10: cada cuántos minutos se revisan los avisos que dependen del tiempo. 0 = apagado. */
    NOTIFY_SWEEP_MINUTES: z.coerce.number().min(0).default(5),
  })
  .superRefine((v, ctx) => {
    // Las claves de ejemplo del repositorio son públicas: en producción real firmarían tokens falsificables.
    if (v.NODE_ENV === 'production' && !v.DEMO_MODE && v.JWT_SECRET.startsWith('cambiar-esta-clave')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET es la clave de ejemplo. Define una propia (openssl rand -base64 32)',
      });
    }
    if (v.TBK_ENV === 'production' && (!v.TBK_COMMERCE_CODE || !v.TBK_API_KEY)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['TBK_COMMERCE_CODE'],
        message: 'TBK_ENV=production exige TBK_COMMERCE_CODE y TBK_API_KEY',
      });
    }
  });

/** Valida un entorno. Separada del arranque para poder probarla (U-73). */
export const parseEnv = (raw: NodeJS.ProcessEnv) => schema.safeParse(raw);

const parsed = parseEnv(process.env);

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
