import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/config/prisma.js';
import { HORA, api, auth, dbReady, partidoJugado, type Jugador } from './helpers.js';

const hasDb = await dbReady();

const participacion = (matchId: string, j: Jugador) =>
  prisma.participation.findUniqueOrThrow({ where: { matchId_userId: { matchId, userId: j.user.id } } });

const marcar = async (matchId: string, quien: Jugador, jugador: Jugador, attended: boolean) =>
  api()
    .patch(`/api/v1/participations/${(await participacion(matchId, jugador)).id}/attendance`)
    .set(auth(quien.token))
    .send({ attended });

describe.skipIf(!hasDb)('Asistencia al terminar el partido · KAN-30 (integración)', () => {
  afterAll(() => prisma.$disconnect());

  it('I-11 · "asistió" suma un partido jugado, recalcula el honor y se ve en la carta', async () => {
    const p = await partidoJugado(1500, HORA);

    const res = await marcar(p.id, p.organizador, p.a, true);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ attended: true, honor: { attendanceRate: 100, honorScore: 10 } });

    const carta = await api().get(`/api/v1/users/${p.a.user.id}`).set(auth(p.b.token));
    expect(carta.body).toMatchObject({ matchesPlayed: 1, attendanceRate: 100 });

    const detalle = await api().get(`/api/v1/matches/${p.id}`).set(auth(p.organizador.token));
    const fila = detalle.body.participants.find((x: { user: { id: string } }) => x.user.id === p.a.user.id);
    expect(fila.attended).toBe(true);
  });

  it('CN-30 · cerrar la asistencia dos veces → 409 y no suma dos partidos', async () => {
    const p = await partidoJugado(1550, HORA);
    await marcar(p.id, p.organizador, p.a, true);

    const otra = await marcar(p.id, p.organizador, p.a, true);
    expect(otra.status).toBe(409);
    expect(otra.body.error.code).toBe('ATTENDANCE_ALREADY_SET');

    const user = await prisma.user.findUniqueOrThrow({ where: { id: p.a.user.id } });
    expect(user.matchesPlayed).toBe(1);
  });

  it('CN-31 · "no se presentó" deja NO_SHOW, baja la asistencia y saca al jugador de las calificaciones', async () => {
    const p = await partidoJugado(1600, HORA);

    const res = await marcar(p.id, p.organizador, p.b, false);
    expect(res.status).toBe(200);
    expect(res.body.honor).toMatchObject({ attendanceRate: 0, honorScore: 0 });
    expect((await participacion(p.id, p.b)).status).toBe('NO_SHOW');

    const user = await prisma.user.findUniqueOrThrow({ where: { id: p.b.user.id } });
    expect(user.matchesPlayed).toBe(0);

    // Quien no jugó no califica ni es calificado (HU-06).
    const califica = await api()
      .post(`/api/v1/matches/${p.id}/ratings`)
      .set(auth(p.b.token))
      .send({ ratedId: p.a.user.id, punctuality: 5, conduct: 5 });
    expect(califica.status).toBe(403);
    const calificado = await api()
      .post(`/api/v1/matches/${p.id}/ratings`)
      .set(auth(p.a.token))
      .send({ ratedId: p.b.user.id, punctuality: 1, conduct: 1 });
    expect(calificado.status).toBe(422);
  });

  it('CN-32 · antes de que termine el partido → 409 MATCH_NOT_FINISHED', async () => {
    const p = await partidoJugado(1650, null);
    const res = await marcar(p.id, p.organizador, p.a, true);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('MATCH_NOT_FINISHED');
  });

  it('S-15 · un jugador no puede cerrar su propia asistencia ni la de otro (403)', async () => {
    const p = await partidoJugado(1700, HORA);
    expect((await marcar(p.id, p.a, p.a, true)).status).toBe(403);
    expect((await marcar(p.id, p.a, p.b, false)).status).toBe(403);
  });

  it('KAN-30 · el cuerpo se valida con Zod: sin "attended" o con campos extra → 422', async () => {
    const p = await partidoJugado(1750, HORA);
    const id = (await participacion(p.id, p.a)).id;
    const vacio = await api().patch(`/api/v1/participations/${id}/attendance`).set(auth(p.organizador.token)).send({});
    expect(vacio.status).toBe(422);
    const extra = await api()
      .patch(`/api/v1/participations/${id}/attendance`)
      .set(auth(p.organizador.token))
      .send({ attended: true, matchesPlayed: 99 });
    expect(extra.status).toBe(422);
  });
});
