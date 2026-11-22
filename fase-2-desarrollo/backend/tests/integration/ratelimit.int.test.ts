import { afterAll, describe, expect, it, vi } from 'vitest';

// Antes de cargar la app: esta suite usa su propio límite (la general lo deja altísimo).
vi.hoisted(() => {
  process.env['LOGIN_RATE_LIMIT'] = '3';
  process.env['PUBLISH_RATE_LIMIT'] = '2';
});

import { prisma } from '../../src/config/prisma.js';
import { api, auth, dbReady, matchPayload, publishMatch, registerUser, uniqueEmail } from './helpers.js';

const hasDb = await dbReady();

describe.skipIf(!hasDb)('Límites de peticiones · S-12 y S-21 (integración)', () => {
  afterAll(() => prisma.$disconnect());

  it('S-12 · entrar bien no consume intentos; a la cuarta contraseña errada responde 429', async () => {
    const email = uniqueEmail('s12');
    await api().post('/api/v1/auth/register').send({ email, password: 'kancha2026', name: 'Dueño', favoriteSport: 'FUTBOL' });
    const login = (password: string) => api().post('/api/v1/auth/login').send({ email, password });

    // Cinco ingresos correctos seguidos (una demo que cambia de cuenta): ninguno cuenta.
    for (let i = 0; i < 5; i++) expect((await login('kancha2026')).status).toBe(200);

    for (let i = 0; i < 3; i++) expect((await login('clave-errada')).status).toBe(401);

    const bloqueado = await login('clave-errada');
    expect(bloqueado.status).toBe(429);
    expect(bloqueado.body.error.code).toBe('TOO_MANY_REQUESTS');
    // Bloqueada la IP, ni siquiera la contraseña correcta entra hasta que pase la ventana.
    expect((await login('kancha2026')).status).toBe(429);
  });

  it('S-12 · el bloqueo no afecta al resto de la API', async () => {
    const otro = await registerUser('Otro usuario');
    const res = await api().get('/api/v1/users/me').set('Authorization', `Bearer ${otro.token}`);
    expect(res.status).toBe(200);
  });

  it('S-21 · al tercer partido en una hora responde 429, y el límite es por cuenta, no por IP', async () => {
    const spammer = await registerUser('Publica en ráfaga');
    await publishMatch(spammer.token);
    await publishMatch(spammer.token);

    const tercero = await api().post('/api/v1/matches').set(auth(spammer.token)).send(matchPayload());
    expect(tercero.status).toBe(429);
    expect(tercero.body.error.code).toBe('TOO_MANY_REQUESTS');

    // Misma IP, otra cuenta: puede publicar.
    const otro = await registerUser('Organizador normal');
    await expect(publishMatch(otro.token)).resolves.toMatchObject({ status: 'OPEN' });
  });
});
