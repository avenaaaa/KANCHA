import { describe, expect, it } from 'vitest';
import { parseEnv } from '../../src/config/env.js';

const base = { DATABASE_URL: 'postgresql://u:p@localhost:5432/db', JWT_SECRET: 'una-clave-propia-y-bien-larga-1234' };
const CLAVE_DE_EJEMPLO = 'cambiar-esta-clave-en-produccion-kancha';

describe('parseEnv', () => {
  it('U-73 · en producción real la clave JWT de ejemplo impide arrancar; la demo local la acepta', () => {
    const real = parseEnv({ ...base, NODE_ENV: 'production', JWT_SECRET: CLAVE_DE_EJEMPLO });
    expect(real.success).toBe(false);

    const demo = parseEnv({ ...base, NODE_ENV: 'production', JWT_SECRET: CLAVE_DE_EJEMPLO, DEMO_MODE: 'true' });
    expect(demo.success).toBe(true);

    expect(parseEnv({ ...base, NODE_ENV: 'production' }).success).toBe(true);
    expect(parseEnv({ ...base, NODE_ENV: 'development', JWT_SECRET: CLAVE_DE_EJEMPLO }).success).toBe(true);
  });

  it('U-74 · Transbank en producción exige código de comercio y llave', () => {
    expect(parseEnv({ ...base, TBK_ENV: 'production' }).success).toBe(false);
    expect(parseEnv({ ...base, TBK_ENV: 'production', TBK_COMMERCE_CODE: '597012345678', TBK_API_KEY: 'llave' }).success).toBe(true);
    expect(parseEnv({ ...base, TBK_ENV: 'integration' }).success).toBe(true);
  });

  it('U-75 · los valores por defecto: sin modo demo, sin proxy y con límite de intentos', () => {
    const r = parseEnv(base);
    expect(r.success && r.data).toMatchObject({ DEMO_MODE: false, TRUST_PROXY: 0, LOGIN_RATE_LIMIT: 10, REGISTER_RATE_LIMIT: 20 });
  });
});
