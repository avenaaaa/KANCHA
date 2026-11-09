import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/config/prisma.js';
import { HORA, MIN, api, auth, dbReady, partidoJugado, registerUser, type Jugador } from './helpers.js';

const hasDb = await dbReady();

const calificar = (matchId: string, quien: Jugador, a: Jugador, nota = { punctuality: 5, conduct: 5 }) =>
  api()
    .post(`/api/v1/matches/${matchId}/ratings`)
    .set(auth(quien.token))
    .send({ ratedId: a.user.id, ...nota });

describe.skipIf(!hasDb)('Calificaciones y honor · HU-06, HU-07 (integración)', () => {
  afterAll(() => prisma.$disconnect());

  it('I-09 · calificar recalcula el honor del compañero y se ve en su carta pública', async () => {
    const p = await partidoJugado(1000, HORA);

    const res = await calificar(p.id, p.a, p.b);
    expect(res.status).toBe(201);
    expect(res.body.honor).toMatchObject({ punctualityRate: 100, fairPlayRate: 100, honorScore: 10 });

    const carta = await api().get(`/api/v1/users/${p.b.user.id}`).set(auth(p.a.token));
    expect(carta.body.honorScore).toBe(10);
    expect(carta.body.email).toBeUndefined();
  });

  it('HU-06 · el organizador también califica y es calificado', async () => {
    const p = await partidoJugado(1050, HORA);
    expect((await calificar(p.id, p.organizador, p.a)).status).toBe(201);
    expect((await calificar(p.id, p.a, p.organizador)).status).toBe(201);
  });

  it('CN-17 · calificar dos veces al mismo compañero → 409 ALREADY_RATED', async () => {
    const p = await partidoJugado(1100, HORA);
    await calificar(p.id, p.a, p.b);
    const res = await calificar(p.id, p.a, p.b, { punctuality: 1, conduct: 1 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_RATED');
    expect(await prisma.rating.count({ where: { matchId: p.id, raterId: p.a.user.id } })).toBe(1);
  });

  it('CN-13 · a las 47 h 59 min de terminado todavía se puede calificar', async () => {
    const p = await partidoJugado(1150, 47 * HORA + 59 * MIN);
    expect((await calificar(p.id, p.a, p.b)).status).toBe(201);
  });

  it('CN-14 · a las 48 h 01 min → 409 RATING_WINDOW_CLOSED y el partido se archiva', async () => {
    const p = await partidoJugado(1200, 48 * HORA + MIN);
    const res = await calificar(p.id, p.a, p.b);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('RATING_WINDOW_CLOSED');
    const partido = await prisma.match.findUniqueOrThrow({ where: { id: p.id } });
    expect(partido.status).toBe('ARCHIVED');
  });

  it('CN-15 · un partido que no ha terminado → 409 MATCH_NOT_FINISHED', async () => {
    const p = await partidoJugado(1250, null);
    const res = await calificar(p.id, p.a, p.b);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('MATCH_NOT_FINISHED');
  });

  it('CN-16 · una nota 6 se rechaza en la API (422) y también en la base (CHECK)', async () => {
    const p = await partidoJugado(1300, HORA);
    const res = await calificar(p.id, p.a, p.b, { punctuality: 6, conduct: 5 });
    expect(res.status).toBe(422);

    await expect(
      prisma.rating.create({
        data: { matchId: p.id, raterId: p.a.user.id, ratedId: p.b.user.id, punctuality: 6, conduct: 5 },
      }),
    ).rejects.toThrow(/Rating_punctuality_check|check constraint/i);
  });

  it('S-14 · quien no jugó no califica (403) y nadie se califica a sí mismo (422)', async () => {
    const p = await partidoJugado(1350, HORA);
    const intruso = await registerUser('Intruso');

    const ajeno = await calificar(p.id, intruso, p.a);
    expect(ajeno.status).toBe(403);

    const yo = await calificar(p.id, p.a, p.a);
    expect(yo.status).toBe(422);
    expect(yo.body.error.code).toBe('SELF_RATING');

    const aFuera = await calificar(p.id, p.a, intruso);
    expect(aFuera.status).toBe(422);
    expect(aFuera.body.error.code).toBe('RATED_NOT_IN_MATCH');
  });

  it('HU-07 · dos reseñas simultáneas al mismo jugador no se pisan: su honor promedia ambas', async () => {
    const p = await partidoJugado(1400, HORA);
    const res = await Promise.all([
      calificar(p.id, p.organizador, p.b, { punctuality: 5, conduct: 5 }),
      calificar(p.id, p.a, p.b, { punctuality: 1, conduct: 1 }),
    ]);
    expect(res.map((r) => r.status)).toEqual([201, 201]);

    const b = await prisma.user.findUniqueOrThrow({ where: { id: p.b.user.id } });
    expect(Number(b.honorScore)).toBe(5);
  });

  it('HU-06 · pendientes lista a los compañeros que faltan por calificar', async () => {
    const p = await partidoJugado(1450, HORA);

    const antes = await api().get(`/api/v1/matches/${p.id}/ratings/pending`).set(auth(p.a.token));
    expect(antes.status).toBe(200);
    expect(antes.body.window).toBe('OPEN');
    expect(antes.body.pending.map((m: { userId: string }) => m.userId).sort()).toEqual(
      [p.organizador.user.id, p.b.user.id].sort(),
    );

    await calificar(p.id, p.a, p.b);
    const despues = await api().get(`/api/v1/matches/${p.id}/ratings/pending`).set(auth(p.a.token));
    expect(despues.body.pending.map((m: { userId: string }) => m.userId)).toEqual([p.organizador.user.id]);

    const detalle = await api().get(`/api/v1/matches/${p.id}`).set(auth(p.a.token));
    expect(detalle.body.ratingWindow).toBe('OPEN');
  });
});
