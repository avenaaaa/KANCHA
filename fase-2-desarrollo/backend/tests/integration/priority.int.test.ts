import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/config/prisma.js';
import { api, auth, dbReady, inHours, northOf, origin, publishMatch, registerUser, type Jugador } from './helpers.js';

const hasDb = await dbReady();

/** KAN-41: "Falta uno" destacado, contra PostGIS real. */
describe.skipIf(!hasDb)('"Falta uno" destacado · KAN-41 (integración)', () => {
  let organizador: Jugador;
  let jugador: Jugador;
  let confiable: Jugador;

  /** Reseñas de `personas` cuentas distintas, en un partido lejos del origen para no aparecer en las búsquedas. */
  async function calificadoPor(quien: Jugador, personas: number) {
    const partido = await publishMatch(organizador.token, { ...northOf(60_000), title: 'Partido de las reseñas' });
    const raters = await Promise.all(Array.from({ length: personas }, (_, i) => registerUser(`Calificador ${i + 1}`)));
    await prisma.rating.createMany({
      data: raters.map((r) => ({ matchId: partido.id, raterId: r.user.id, ratedId: quien.user.id, punctuality: 5, conduct: 5 })),
    });
  }

  beforeAll(async () => {
    organizador = await registerUser('Organizador destacado');
    jugador = await registerUser('Invitado');
    confiable = await registerUser('Invitado con honor');
    await prisma.user.update({ where: { id: confiable.user.id }, data: { honorScore: 8 } });
    await calificadoPor(confiable, 3);
  });
  afterAll(() => prisma.$disconnect());

  const destacar = (token: string, id: string) => api().patch(`/api/v1/matches/${id}/priority`).set(auth(token));
  const detalle = (token: string, id: string) => api().get(`/api/v1/matches/${id}`).set(auth(token));

  it('CN-41 · destacado: aparece primero en "Falta uno" y el invitado entra gratis (al tiro con honor 7 o más)', async () => {
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
      filledSlots: 3,
      totalCost: 24000,
      startsAt: inHours(1.5),
      title: 'Falta 1, destacado',
    });

    const antes = await detalle(organizador.token, partido.id);
    expect(antes.body.priorityOffer).toEqual({ canActivate: true, guestShare: 6000, perPlayer: 2000 });

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
    expect(lista.body.matches[0]).toMatchObject({ priority: true, slotsLeft: 1 });

    // Un novato (sin honor) queda pendiente y no ocupa el cupo: lo decide el organizador.
    const novato = await api().post(`/api/v1/matches/${partido.id}/join`).set(auth(jugador.token));
    expect([novato.status, novato.body.status]).toEqual([201, 'PENDING']);

    // Con honor 7 o más entra al tiro, aprobado y gratis.
    const union = await api().post(`/api/v1/matches/${partido.id}/join`).set(auth(confiable.token));
    expect([union.status, union.body.status]).toEqual([201, 'APPROVED']);

    const visto = await detalle(confiable.token, partido.id);
    expect(visto.body).toMatchObject({ filledSlots: 4, priority: true });
    expect(visto.body.viewer).toMatchObject({ status: 'APPROVED', amountDue: 0 });

    const pago = await api().post(`/api/v1/payments/${union.body.participationId}/init`).set(auth(confiable.token));
    expect(pago.status).toBe(409);
    expect(pago.body.error.code).toBe('NOTHING_TO_PAY');
  });

  it('CN-48 · al destacar, los confirmados reciben cuánto pone cada uno por el invitado; el organizador y los pendientes no (KAN-44)', async () => {
    const [confirmado, pendiente] = await Promise.all([registerUser('Confirmado'), registerUser('Pendiente')]);
    const partido = await publishMatch(organizador.token, {
      ...northOf(1100),
      totalSlots: 4,
      filledSlots: 2,
      totalCost: 24000,
      startsAt: inHours(1),
      title: 'Pádel con invitado',
    });
    const union = await api().post(`/api/v1/matches/${partido.id}/join`).set(auth(confirmado.token));
    await api().patch(`/api/v1/participations/${union.body.participationId}/approve`).set(auth(organizador.token));
    await api().post(`/api/v1/matches/${partido.id}/join`).set(auth(pendiente.token)); // pendiente: no ocupa cupo

    expect((await destacar(organizador.token, partido.id)).status).toBe(200);

    const cubrir = async (token: string) =>
      (await api().get('/api/v1/users/me/notifications').set(auth(token))).body.notifications.filter(
        (n: { matchId: string; kind: string }) => n.matchId === partido.id && n.kind === 'GUEST_COVER',
      );
    const [aviso] = await cubrir(confirmado.token);
    expect(aviso).toMatchObject({ title: 'Entra un invitado gratis', read: false });
    expect(aviso.body).toContain('Su cuota de $6.000 la cubren entre los 3 que ya están: $2.000 cada uno, fuera de la app.');
    expect(await cubrir(organizador.token)).toEqual([]);
    expect(await cubrir(pendiente.token)).toEqual([]);
  });

  it('CN-42 · solo el organizador, una vez, desde 2 h antes y solo si falta 1 jugador (KAN-44)', async () => {
    const listo = await publishMatch(organizador.token, { ...northOf(1500), totalSlots: 6, filledSlots: 5, startsAt: inHours(1) });
    expect((await destacar(jugador.token, listo.id)).status).toBe(403);
    expect((await destacar(organizador.token, listo.id)).status).toBe(200);
    const otraVez = await destacar(organizador.token, listo.id);
    expect([otraVez.status, otraVez.body.error.code]).toEqual([409, 'ALREADY_PRIORITY']);

    const temprano = await publishMatch(organizador.token, { ...northOf(1600), totalSlots: 6, filledSlots: 5, startsAt: inHours(3) });
    const r1 = await destacar(organizador.token, temprano.id);
    expect([r1.status, r1.body.error.code]).toEqual([409, 'PRIORITY_TOO_EARLY']);

    // Si faltan 2, no hay entrada gratis: quienes entran pagan su parte.
    const faltanDos = await publishMatch(organizador.token, { ...northOf(1700), totalSlots: 6, filledSlots: 4, startsAt: inHours(1) });
    const r2 = await destacar(organizador.token, faltanDos.id);
    expect([r2.status, r2.body.error.code]).toEqual([409, 'PRIORITY_NOT_AVAILABLE']);

    expect((await destacar(organizador.token, 'no-es-un-uuid')).status).toBe(422);
  });

  it('CN-49 · si tras destacar una cancelación deja 2 libres, quien entra paga y sale de "Falta uno"; con 1 libre vuelve a ser gratis (KAN-44)', async () => {
    const partido = await publishMatch(organizador.token, {
      ...northOf(1900),
      totalSlots: 4,
      filledSlots: 2,
      totalCost: 24000,
      startsAt: inHours(1.5),
      title: 'Destacado que pierde un jugador',
    });
    const seBaja = await registerUser('Se baja');
    const union = await api().post(`/api/v1/matches/${partido.id}/join`).set(auth(seBaja.token));
    await api().patch(`/api/v1/participations/${union.body.participationId}/approve`).set(auth(organizador.token));
    expect((await destacar(organizador.token, partido.id)).status).toBe(200);

    expect((await api().delete(`/api/v1/participations/${union.body.participationId}`).set(auth(seBaja.token))).status).toBe(200);
    expect((await detalle(organizador.token, partido.id)).body).toMatchObject({ slotsLeft: 2, priority: false });
    const urgentes = await api()
      .get('/api/v1/matches/nearby')
      .query({ lat: origin.lat, lng: origin.lng, urgent: 'true' })
      .set(auth(jugador.token));
    expect(urgentes.body.matches.map((m: { id: string }) => m.id)).not.toContain(partido.id);

    // Con honor 8 y tres calificadores no entra al tiro: no hay entrada gratis que dar. Lo aprueba el organizador y paga su parte.
    const entra = await api().post(`/api/v1/matches/${partido.id}/join`).set(auth(confiable.token));
    expect([entra.status, entra.body.status]).toEqual([201, 'PENDING']);
    await api().patch(`/api/v1/participations/${entra.body.participationId}/approve`).set(auth(organizador.token));
    expect((await detalle(confiable.token, partido.id)).body.viewer).toMatchObject({ status: 'APPROVED', amountDue: 6000 });

    // Vuelve a faltar 1: el destacado rige otra vez.
    expect((await detalle(jugador.token, partido.id)).body).toMatchObject({ slotsLeft: 1, priority: true });
  });

  it('CN-50 · honor alto con menos de 3 calificadores distintos no entra al tiro: lo aprueba el organizador (auditoría del 22-nov)', async () => {
    const inflado = await registerUser('Honor de dos cuentas');
    await prisma.user.update({ where: { id: inflado.user.id }, data: { honorScore: 10 } });
    await calificadoPor(inflado, 2);
    const partido = await publishMatch(organizador.token, {
      ...northOf(2100),
      totalSlots: 4,
      filledSlots: 3,
      startsAt: inHours(1),
      title: 'Destacado para el honor inflado',
    });
    expect((await destacar(organizador.token, partido.id)).status).toBe(200);

    const res = await api().post(`/api/v1/matches/${partido.id}/join`).set(auth(inflado.token));
    expect([res.status, res.body.status]).toEqual([201, 'PENDING']);
    expect((await detalle(organizador.token, partido.id)).body).toMatchObject({ filledSlots: 3, priority: true });
  });
});
