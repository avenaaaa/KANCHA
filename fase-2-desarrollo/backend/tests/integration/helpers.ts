import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';

/**
 * Utilidades de las pruebas de integración. Corren contra la base kancha_test
 * (la crea el CI con las mismas migraciones que producción).
 *
 * Cada ejecución usa correos únicos y un punto de origen al azar en el sur de
 * Chile, lejos de los datos de La Florida, para no depender de lo que haya en
 * la base de ejecuciones anteriores.
 */

export const app = createApp();
export const api = () => request(app);

/** ¿Hay una base PostGIS disponible? Si no, las pruebas de integración se omiten. */
export async function dbReady(): Promise<boolean> {
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT PostGIS_Version()`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5_000)),
    ]);
    return true;
  } catch {
    console.warn('⚠️  Sin base de datos de pruebas (kancha_test): se omiten las pruebas de integración.');
    return false;
  }
}

export const uniqueEmail = (prefix: string) => `${prefix}-${randomUUID().slice(0, 8)}@test.kancha.cl`;

export async function registerUser(name = 'Jugador de prueba', favoriteSport = 'FUTBOL') {
  const res = await api()
    .post('/api/v1/auth/register')
    .send({ email: uniqueEmail('u'), password: 'kancha2026', name, favoriteSport });
  if (res.status !== 201) throw new Error(`No se pudo registrar: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body as { token: string; user: { id: string; name: string } };
}

/** Origen aleatorio de esta ejecución. */
export const origin = { lat: -40 - Math.random() * 4, lng: -72 + Math.random() * 2 };

/** Metros por grado de latitud a una latitud dada (fórmula del elipsoide WGS84). */
const metersPerDegLat = (lat: number) => {
  const r = (lat * Math.PI) / 180;
  return 111_132.92 - 559.82 * Math.cos(2 * r) + 1.175 * Math.cos(4 * r);
};

/** Punto a `meters` metros al norte del origen. */
export const northOf = (meters: number) => ({
  lat: origin.lat + meters / metersPerDegLat(origin.lat),
  lng: origin.lng,
});

export const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

export function matchPayload(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Pádel dobles · Falta uno',
    sport: 'PADEL',
    level: 'MEDIO',
    venueName: 'Cancha de pruebas',
    address: 'Dirección de pruebas',
    ...origin,
    startsAt: inHours(48),
    totalSlots: 4,
    filledSlots: 3,
    totalCost: 24000,
    ...overrides,
  };
}

export async function publishMatch(token: string, overrides: Record<string, unknown> = {}) {
  const res = await api()
    .post('/api/v1/matches')
    .set('Authorization', `Bearer ${token}`)
    .send(matchPayload(overrides));
  if (res.status !== 201) throw new Error(`No se pudo publicar: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body as { id: string; filledSlots: number; totalSlots: number; status: string };
}
