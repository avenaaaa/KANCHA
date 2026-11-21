import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/config/prisma.js';
import { api, auth, dbReady, inHours, northOf, origin, publishMatch, registerUser, type Jugador } from './helpers.js';

const hasDb = await dbReady();

/** KAN-41: "Falta uno" destacado, contra PostGIS real. */
describe.skipIf(!hasDb)('"Falta uno" destacado · KAN-41 (integración)', () => {
  let organizador: Jugador;
  let jugador: Jugador;
  let confiable: Jugador;

  beforeAll(async () => {
    organizador = await registerUser('Organizador destacado');
    jugador = await registerUser('Invitado');
    confiable = await registerUser('Invitado con honor');
    await prisma.user.update({ where: { id: confiable.user.id }, data: { honorScore: 8 } });
  });
  afterAll(() => prisma.$disconnect());

  const destacar = (token: string, id: string) => api().patch(`/api/v1/matches/${id}/priority`).set(auth(token));
  const detalle = (token: string, id: string) => api().get(`/api/v1/matches/${id}`).set(auth(token));

  it('CN-41 · destacado: aparece primero en "Falta uno" aunque le falten dos, y el invitado entra gratis (al tiro con honor 7 o más)', async () => {
    const urgente = await publishMatch(organizador.token, {
      ...northOf(300),
      totalSlots: 4,
      filledSlots: 3,
      startsAt: inHours(1),
      title: 'Falta 1, sin destacar',
    });
    const partido = await publishMatch(organizador.token, {
      ...northOf(900),
      totalSlots: 4,
      filledSlots: 2,
      totalCost: 24000,
      startsAt: inHours(1.5),
      title: 'Faltan 2, destacado',
    });

    const antes = await detalle(organizador.token, partido.id);
    expect(antes.body.priorityOffer).toEqual({ canActivate: true, guestShare: 6000, perPlayer: 3000 });

    const res = await destacar(organizador.token, partido.id);
    expect(res.status).toBe(200);
    expect(res.body.matchId).toBe(partido.id);

    const lista = await api()
      .get('/api/v1/matches/nearby')
      .query({ lat: origin.lat, lng: origin.lng, urgent: 'true' })
      .set(auth(jugador.token));
    const ids = lista.body.matches.map((m: { id: string }) => m.id);
    expect(ids).toContain(urgente.id);
    expect(ids[0]).toBe(partido.id); // más lejos, pero destacado: va primero
    expect(lista.body.matches[0]).toMatchObject({ priority: true, slotsLeft: 2 });

    // Con honor 7 o más entra al tiro, aprobado y gratis.
    const union = await api().post(`/api/v1/matches/${partido.id}/join`).set(auth(confiable.token));
    expect(union.status).toBe(201);
    expect(union.body.status).toBe('APPROVED');

    // Un novato (sin honor) queda pendiente: lo confirma el organizador, y también entra gratis.
    const novato = await api().post(`/api/v1/matches/${partido.id}/join`).set(auth(jugador.token));
    expect([novato.status, novato.body.status]).toEqual([201, 'PENDING']);
    const ok = await api().patch(`/api/v1/participations/${novato.body.participationId}/approve`).set(auth(organizador.token));
    expect(ok.status).toBe(200);

    const visto = await detalle(jugador.token, partido.id);
    expect(visto.body).toMatchObject({ filledSlots: 4, priority: true });
    expect(visto.body.viewer).toMatchObject({ status: 'APPROVED', amountDue: 0 });

    const pago = await api().post(`/api/v1/payments/${novato.body.participationId}/init`).set(auth(jugador.token));
    expect(pago.status).toBe(409);
    expect(pago.body.error.code).toBe('NOTHING_TO_PAY');
  });

  it('CN-42 · solo el organizador, una vez, desde 2 h antes y con 1 o 2 jugadores faltantes', async () => {
    const listo = await publishMatch(organizador.token, { ...northOf(1500), totalSlots: 6, filledSlots: 5, startsAt: inHours(1) });
    expect((await destacar(jugador.token, listo.id)).status).toBe(403);
    expect((await destacar(organizador.token, listo.id)).status).toBe(200);
    const otraVez = await destacar(organizador.token, listo.id);
    expect([otraVez.status, otraVez.body.error.code]).toEqual([409, 'ALREADY_PRIORITY']);

    const temprano = await publishMatch(organizador.token, { ...northOf(1600), totalSlots: 6, filledSlots: 5, startsAt: inHours(3) });
    const r1 = await destacar(organizador.token, temprano.id);
    expect([r1.status, r1.body.error.code]).toEqual([409, 'PRIORITY_TOO_EARLY']);

    const faltanTres = await publishMatch(organizador.token, { ...northOf(1700), totalSlots: 6, filledSlots: 3, startsAt: inHours(1) });
    const r2 = await destacar(organizador.token, faltanTres.id);
    expect([r2.status, r2.body.error.code]).toEqual([409, 'PRIORITY_NOT_AVAILABLE']);

    expect((await destacar(organizador.token, 'no-es-un-uuid')).status).toBe(422);
  });
});
