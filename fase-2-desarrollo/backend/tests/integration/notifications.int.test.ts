import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/config/prisma.js';
import { runSweep } from '../../src/services/notification.service.js';
import { api, auth, dbReady, inHours, northOf, origin, publishMatch, registerUser } from './helpers.js';

const hasDb = await dbReady();

/** Día (0 = domingo) y hora de un instante en Chile, como los guarda la preferencia. */
function chile(iso: string): { day: number; hour: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santiago',
    weekday: 'short',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return { day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')), hour: Number(get('hour')) };
}

const base = {
  faltaUno: false,
  nearby: false,
  nudges: false,
  sports: ['PADEL'],
  days: [0, 1, 2, 3, 4, 5, 6],
  fromHour: 0,
  toHour: 24,
  radiusKm: 5,
  ...origin,
};

const savePrefs = (token: string, v: Record<string, unknown> = {}) =>
  api().put('/api/v1/users/me/notification-preferences').set(auth(token)).send({ ...base, ...v });
const inbox = async (token: string) => (await api().get('/api/v1/users/me/notifications').set(auth(token))).body;
/** Avisos de un usuario sobre un partido. */
const about = async (token: string, matchId: string) =>
  (await inbox(token)).notifications.filter((n: { matchId: string }) => n.matchId === matchId);

/** HU-10 (KAN-16): avisos dentro de la app, contra PostGIS real. */
describe.skipIf(!hasDb)('Avisos · HU-10 (integración)', () => {
  afterAll(() => prisma.$disconnect());

  it('CN-43 · preferencias: sin guardar nada no hay avisos activos; se guardan y se validan', async () => {
    const j = await registerUser('Preferencias', 'BASQUETBOL');
    const antes = await api().get('/api/v1/users/me/notification-preferences').set(auth(j.token));
    expect(antes.body).toMatchObject({ faltaUno: false, nearby: false, nudges: false, sports: ['BASQUETBOL'], lat: null });

    const ok = await savePrefs(j.token, { faltaUno: true, sports: ['PADEL', 'FUTBOL'] });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ faltaUno: true, sports: ['PADEL', 'FUTBOL'] });
    expect(ok.body.lat).toBeCloseTo(origin.lat, 9);

    const sinUbicacion = await savePrefs(j.token, { faltaUno: true, lat: null, lng: null });
    expect(sinUbicacion.status).toBe(422);
    expect((await savePrefs(j.token, { fromHour: 22, toHour: 20 })).status).toBe(422);
    expect((await api().get('/api/v1/users/me/notifications')).status).toBe(401);
  });

  it('CN-44 · partido nuevo cerca: solo a quien lo aceptó, en su radio, deporte, día y horario', async () => {
    const organizador = await registerUser('Organizador avisos');
    const [cerca, apagado, otroDeporte, otroDia, otraHora, lejos] = await Promise.all(
      ['Cerca', 'Apagado', 'Otro deporte', 'Otro día', 'Otra hora', 'Lejos'].map((n) => registerUser(n)),
    );
    const startsAt = inHours(30);
    const { day, hour } = chile(startsAt);
    await savePrefs(cerca.token, { nearby: true });
    await savePrefs(apagado.token, { nearby: false, faltaUno: true });
    await savePrefs(otroDeporte.token, { nearby: true, sports: ['FUTBOL'] });
    await savePrefs(otroDia.token, { nearby: true, days: [0, 1, 2, 3, 4, 5, 6].filter((d) => d !== day) });
    await savePrefs(otraHora.token, { nearby: true, ...(hour < 23 ? { fromHour: hour + 1, toHour: 24 } : { fromHour: 0, toHour: hour }) });
    await savePrefs(lejos.token, { nearby: true, ...northOf(20_000) });

    const partido = await publishMatch(organizador.token, { ...northOf(1000), startsAt, title: 'Pádel nocturno' });

    const [aviso] = await about(cerca.token, partido.id);
    expect(aviso).toMatchObject({ kind: 'NEARBY_MATCH', title: 'Partido de pádel cerca', read: false });
    expect(aviso.body).toContain('Pádel nocturno');
    for (const j of [apagado, otroDeporte, otroDia, otraHora, lejos, organizador]) {
      expect(await about(j.token, partido.id)).toEqual([]);
    }
  });

  it('CN-45 · "Falta uno": el barrido avisa una sola vez, va primero en la bandeja y al destacarlo dice "entras gratis"', async () => {
    const organizador = await registerUser('Organizador urgente');
    const [suscrito, noSuscrito] = await Promise.all([registerUser('Suscrito'), registerUser('No suscrito')]);
    await savePrefs(suscrito.token, { faltaUno: true, nearby: true });
    await savePrefs(noSuscrito.token, { nearby: true });

    // Un aviso más nuevo que el "Falta uno" no le quita el primer lugar.
    const urgente = await publishMatch(organizador.token, { ...northOf(500), totalSlots: 4, filledSlots: 3, startsAt: inHours(1) });
    await runSweep();
    await runSweep(); // el segundo barrido no lo repite
    const otro = await publishMatch(organizador.token, { ...northOf(700), totalSlots: 4, filledSlots: 3, startsAt: inHours(1.5) });

    // Solo los avisos de esta prueba: la base compartida puede traer un destacado cercano de otra ejecución.
    const bandeja = (await inbox(suscrito.token)).notifications.filter((n: { matchId: string }) =>
      [urgente.id, otro.id].includes(n.matchId),
    );
    expect(bandeja.map((n: { kind: string }) => n.kind)).toEqual(['FALTA_UNO', 'NEARBY_MATCH', 'NEARBY_MATCH']);
    expect(bandeja[0]).toMatchObject({ matchId: urgente.id, title: '¡Falta uno cerca!', urgent: true });
    expect((await about(noSuscrito.token, urgente.id)).map((n: { kind: string }) => n.kind)).toEqual(['NEARBY_MATCH']);
    expect(await about(organizador.token, urgente.id)).toEqual([
      expect.objectContaining({ kind: 'PRIORITY_OFFER', title: 'Todavía te falta 1 jugador' }),
    ]);

    // Al otro se le ofrece destacarlo; destacado, su "Falta uno" se reemplaza por el de "entras gratis".
    await runSweep();
    expect((await about(organizador.token, otro.id))[0]).toMatchObject({ kind: 'PRIORITY_OFFER', title: 'Todavía te falta 1 jugador' });
    expect((await about(suscrito.token, otro.id)).map((n: { kind: string }) => n.kind)).toEqual(['FALTA_UNO', 'NEARBY_MATCH']);
    expect((await api().patch(`/api/v1/matches/${otro.id}/priority`).set(auth(organizador.token))).status).toBe(200);
    const destacado = (await about(suscrito.token, otro.id)).find((n: { kind: string }) => n.kind === 'FALTA_UNO');
    expect(destacado).toMatchObject({ title: '¡Falta uno cerca! Entras gratis', read: false, urgent: true });
    expect((await about(organizador.token, otro.id))[0]).toMatchObject({ kind: 'PRIORITY_OFFER', read: true });

    // Lleno, el "Falta uno" sin leer deja de destacarse.
    await prisma.match.update({ where: { id: urgente.id }, data: { filledSlots: 4, status: 'FULL' } });
    expect((await about(suscrito.token, urgente.id)).find((n: { kind: string }) => n.kind === 'FALTA_UNO')).toMatchObject({
      read: false,
      urgent: false,
    });

    // Leer un aviso baja el contador; el aviso de otro usuario no se puede marcar.
    const { unread } = await inbox(suscrito.token);
    const leido = await api().patch(`/api/v1/notifications/${destacado.id}/read`).set(auth(suscrito.token));
    expect(leido.body.read).toBe(true);
    expect((await inbox(suscrito.token)).unread).toBe(unread - 1);
    expect((await api().patch(`/api/v1/notifications/${destacado.id}/read`).set(auth(noSuscrito.token))).status).toBe(404);
  });

  it('CN-46 · postulaciones: el organizador sabe que alguien pide entrar y el jugador, que lo aceptaron', async () => {
    const organizador = await registerUser('Organizador postulaciones');
    const jugador = await registerUser('Postulante');
    const partido = await publishMatch(organizador.token, { ...northOf(900) });

    const union = await api().post(`/api/v1/matches/${partido.id}/join`).set(auth(jugador.token));
    expect((await about(organizador.token, partido.id))[0]).toMatchObject({ kind: 'JOIN_REQUEST', title: 'Tienes postulaciones por revisar' });

    await api().patch(`/api/v1/participations/${union.body.participationId}/approve`).set(auth(organizador.token));
    expect((await about(jugador.token, partido.id))[0]).toMatchObject({
      kind: 'JOIN_APPROVED',
      body: expect.stringContaining('Paga tu parte'),
    });
  });

  it('CN-47 · ánimo para jugar: a quien no juega hace 14 días y tiene partidos cerca, a lo más uno por semana', async () => {
    const organizador = await registerUser('Organizador ánimo');
    const [nuevo, activo] = await Promise.all([registerUser('Nunca jugó'), registerUser('Activo')]);
    await savePrefs(nuevo.token, { nudges: true, ...northOf(40_000) });
    await savePrefs(activo.token, { nudges: true, ...northOf(40_000) });
    const partido = await publishMatch(organizador.token, { ...northOf(41_000), startsAt: inHours(40) });
    await api().post(`/api/v1/matches/${partido.id}/join`).set(auth(activo.token));

    await runSweep();
    await runSweep();
    const animo = (await inbox(nuevo.token)).notifications.filter((n: { kind: string }) => n.kind === 'NUDGE');
    expect(animo).toEqual([expect.objectContaining({ title: 'Tu primer partido te espera', matchId: null })]);
    expect((await inbox(activo.token)).notifications.filter((n: { kind: string }) => n.kind === 'NUDGE')).toEqual([]);
  });
});
