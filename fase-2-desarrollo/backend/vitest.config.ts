import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Las pruebas unitarias no tocan la base de datos, pero config/env.ts valida
    // el entorno al importarse. Estos valores la satisfacen sin un .env real.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://kancha:kancha@localhost:5432/kancha_test',
      JWT_SECRET: 'test-secret-solo-para-pruebas',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/services/**', 'src/utils/**'],
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
    },
  },
});
