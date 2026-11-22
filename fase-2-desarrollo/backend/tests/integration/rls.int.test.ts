import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/config/prisma.js';
import { dbReady } from './helpers.js';

const hasDb = await dbReady();

describe.skipIf(!hasDb)('Tablas cerradas a la Data API de Supabase · S-22 (integración)', () => {
  afterAll(() => prisma.$disconnect());

  it('S-22 · toda tabla de la app tiene RLS activo, también las que se agreguen después', async () => {
    const sinRls = await prisma.$queryRaw<{ relname: string }[]>`
      SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
        AND c.relname NOT IN ('_prisma_migrations', 'spatial_ref_sys')`;
    expect(sinRls.map((t) => t.relname)).toEqual([]);
  });
});
