import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/config/prisma.js';
import { api, dbReady, northOf, publishMatch, registerUser } from './helpers.js';

const hasDb = await dbReady();

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe.skipIf(!hasDb)('Postulaciones · HU-05 (integración)', () => {
  let organizador = { token: '', user: { id: '', name: '' } };

  beforeAll(async () => {
    organizador = await registerUser('Organizador');
  });
  afterAll(() => prisma.$disconnect());

  it('HU-05 · postular deja la participación en PENDING', async () => {
    const partido = await publishMatch(organizador.token, northOf(400));
    const jugador = await registerUser('Agente libre');

    const res = await api().post(`/api/v1/matches/${partido.id}/join`).set(auth(jugador.token));
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING');

    const detalle = await api().get(`/api/v1/matches/${partido.id}`).set(auth(jugador.token));
    expect(detalle.body.viewer).toMatchObject({ isOrganizer: false, status: 'PENDING' });
  });

  it('CN-11 · postular dos veces al mismo partido → 409 ALREADY_JOINED', async () => {
    const partido = await publishMatch(organizador.token, northOf(450));
    const jugador = await registerUser('Insistente');
    await api().post(`/api/v1/matches/${partido.id}/join`).set(auth(jugador.token));
    const res = await api().post(`/api/v1/matches/${partido.id}/join`).set(auth(jugador.token));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_JOINED');
  });

  it('HU-05 · el organizador no puede postular a su propio partido', async () => {
    const partido = await publishMatch(organizador.token, northOf(500));
    const res = await api().post(`/api/v1/matches/${partido.id}/join`).set(auth(organizador.token));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('OWN_MATCH');
  });

  it('S-02 · aprobar una postulación de un partido ajeno → 403', async () => {
    const partido = await publishMatch(organizador.token, northOf(550));
    const jugador = await registerUser('Jugador');
    const intruso = await registerUser('Intruso');
    const join = await api().post(`/api/v1/matches/${partido.id}/join`).set(auth(jugador.token));

    const res = await api().patch(`/api/v1/participations/${join.body.participationId}/approve`).set(auth(intruso.token));
    expect(res.status).toBe(403);
  });

  it('HU-05 · al aprobar, el cupo pasa a confirmado y se congela la cuota', async () => {
    const partido = await publishMatch(organizador.token, { ...northOf(600), totalSlots: 10, filledSlots: 6, totalCost: 30000 });
    const jugador = await registerUser('Aprobado');
    const join = await api().post(`/api/v1/matches/${partido.id}/join`).set(auth(jugador.token));

    const res = await api().patch(`/api/v1/participations/${join.body.participationId}/approve`).set(auth(organizador.token));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'APPROVED', amountDue: 3000 });

    const detalle = await api().get(`/api/v1/matches/${partido.id}`).set(auth(jugador.token));
    expect(detalle.body).toMatchObject({ filledSlots: 7, status: 'OPEN' });
    expect(detalle.body.viewer.status).toBe('APPROVED');
  });

  it('CN-12 / I-05 · dos aprobaciones simultáneas del último cupo: solo una gana', async () => {
    const partido = await publishMatch(organizador.token, { ...northOf(700), totalSlots: 4, filledSlots: 3 });
    const a = await registerUser('Rápido');
    const b = await registerUser('También rápido');
    const ja = await api().post(`/api/v1/matches/${partido.id}/join`).set(auth(a.token));
    const jb = await api().post(`/api/v1/matches/${partido.id}/join`).set(auth(b.token));

    const resultados = await Promise.all([
      api().patch(`/api/v1/participations/${ja.body.participationId}/approve`).set(auth(organizador.token)),
      api().patch(`/api/v1/participations/${jb.body.participationId}/approve`).set(auth(organizador.token)),
    ]);
    expect(resultados.map((r) => r.status).sort()).toEqual([200, 409]);

    const fila = await prisma.match.findUnique({ where: { id: partido.id }, select: { filledSlots: true, status: true } });
    expect(fila).toEqual({ filledSlots: 4, status: 'FULL' });

    const aprobadas = await prisma.participation.count({ where: { matchId: partido.id, status: 'APPROVED' } });
    expect(aprobadas).toBe(1);
  });

  it('HU-05 · con el partido lleno, postular → 409 MATCH_FULL', async () => {
    const partido = await publishMatch(organizador.token, { ...northOf(800), totalSlots: 2, filledSlots: 1 });
    const a = await registerUser('Último');
    const join = await api().post(`/api/v1/matches/${partido.id}/join`).set(auth(a.token));
    await api().patch(`/api/v1/participations/${join.body.participationId}/approve`).set(auth(organizador.token));

    const tarde = await registerUser('Llegó tarde');
    const res = await api().post(`/api/v1/matches/${partido.id}/join`).set(auth(tarde.token));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('MATCH_FULL');
  });

  it('Mis partidos · el organizador ve cuántas postulaciones tiene pendientes', async () => {
    const partido = await publishMatch(organizador.token, northOf(900));
    const jugador = await registerUser('Pendiente');
    await api().post(`/api/v1/matches/${partido.id}/join`).set(auth(jugador.token));

    const res = await api().get('/api/v1/users/me/matches').set(auth(organizador.token));
    const mio = res.body.matches.find((m: { id: string }) => m.id === partido.id);
    expect(mio).toMatchObject({ role: 'ORGANIZER', pendingCount: 1 });

    const delJugador = await api().get('/api/v1/users/me/matches').set(auth(jugador.token));
    expect(delJugador.body.matches.find((m: { id: string }) => m.id === partido.id)).toMatchObject({
      role: 'PLAYER',
      myStatus: 'PENDING',
    });
  });
});
