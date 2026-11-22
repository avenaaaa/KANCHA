import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/config/prisma.js';
import { api, auth, dbReady, HORA, matchPayload, partidoJugado, publishMatch, registerUser, type Jugador } from './helpers.js';

const hasDb = await dbReady();
const DIA = 24 * HORA;

/** HU-11 (KAN-17): reportes de conducta y moderación, contra PostgreSQL real. */
describe.skipIf(!hasDb)('Moderación · HU-11 (integración)', () => {
  let admin: Jugador;

  beforeAll(async () => {
    admin = await registerUser('Administradora');
    await prisma.user.update({ where: { id: admin.user.id }, data: { role: 'ADMIN' } });
  });
  afterAll(() => prisma.$disconnect());

  const reportar = (token: string, matchId: string, body: Record<string, unknown>) =>
    api().post(`/api/v1/matches/${matchId}/reports`).set(auth(token)).send(body);
  const resolver = (token: string, id: string, body: Record<string, unknown>) =>
    api().patch(`/api/v1/admin/reports/${id}`).set(auth(token)).send(body);

  it('CN-51 · solo un compañero reporta, una vez por partido; ni a sí mismo, ni a quien no jugó, ni antes de empezar', async () => {
    const p = await partidoJugado(70_000, HORA);
    const res = await reportar(p.a.token, p.id, { reportedId: p.b.user.id, reason: 'AGRESION', comment: 'Empujó al arquero' });
    expect([res.status, res.body.status]).toEqual([201, 'PENDING']);

    const otraVez = await reportar(p.a.token, p.id, { reportedId: p.b.user.id, reason: 'OTRO' });
    expect([otraVez.status, otraVez.body.error.code]).toEqual([409, 'ALREADY_REPORTED']);
    expect((await reportar(p.a.token, p.id, { reportedId: p.a.user.id, reason: 'OTRO' })).body.error.code).toBe('SELF_REPORT');

    const ajeno = await registerUser('No jugó');
    expect((await reportar(ajeno.token, p.id, { reportedId: p.b.user.id, reason: 'OTRO' })).status).toBe(403);
    expect((await reportar(p.a.token, p.id, { reportedId: ajeno.user.id, reason: 'OTRO' })).body.error.code).toBe('REPORTED_NOT_IN_MATCH');

    const futuro = await partidoJugado(70_500, null);
    const temprano = await reportar(futuro.a.token, futuro.id, { reportedId: futuro.b.user.id, reason: 'OTRO' });
    expect([temprano.status, temprano.body.error.code]).toEqual([409, 'MATCH_NOT_STARTED']);
  });

  it('CN-52 · el administrador ve el detalle y el historial, suspende 7 días y el sancionado recibe el aviso y ya no puede postular ni publicar', async () => {
    const p = await partidoJugado(71_000, HORA);
    const viejo = await partidoJugado(71_500, 3 * DIA);
    await prisma.participation.create({ data: { matchId: viejo.id, userId: p.b.user.id, status: 'APPROVED', amountDue: 0 } });
    await reportar(viejo.a.token, viejo.id, { reportedId: p.b.user.id, reason: 'LENGUAJE' });
    const nuevo = await reportar(p.organizador.token, p.id, { reportedId: p.b.user.id, reason: 'JUEGO_SUCIO', comment: 'Patadas' });

    const lista = await api().get('/api/v1/admin/reports').set(auth(admin.token));
    expect(lista.status).toBe(200);
    expect(lista.body.reports.map((r: { id: string }) => r.id)).toContain(nuevo.body.id);

    const detalle = await api().get(`/api/v1/admin/reports/${nuevo.body.id}`).set(auth(admin.token));
    expect(detalle.body).toMatchObject({
      reason: 'JUEGO_SUCIO',
      comment: 'Patadas',
      status: 'PENDING',
      reporter: { id: p.organizador.user.id },
      reported: { id: p.b.user.id, suspendedUntil: null },
      resolution: null,
    });
    expect(detalle.body.history).toEqual([expect.objectContaining({ reason: 'LENGUAJE', status: 'PENDING' })]);

    const antes = Date.now();
    const sancion = await resolver(admin.token, nuevo.body.id, { action: 'SANCTION', note: 'Reincidente' });
    expect([sancion.status, sancion.body.status]).toEqual([200, 'SANCTIONED']);
    const hasta = new Date(sancion.body.suspendedUntil).getTime();
    expect(hasta - antes).toBeGreaterThan(7 * DIA - HORA);
    expect(hasta - antes).toBeLessThan(7 * DIA + HORA);

    // El registro: quién, cuándo y por qué, en el mismo reporte.
    const resuelto = await prisma.report.findUniqueOrThrow({ where: { id: nuevo.body.id } });
    expect(resuelto).toMatchObject({ status: 'SANCTIONED', resolvedById: admin.user.id, resolutionNote: 'Reincidente' });

    const bandeja = await api().get('/api/v1/users/me/notifications').set(auth(p.b.token));
    expect(bandeja.body.notifications).toContainEqual(
      expect.objectContaining({ kind: 'SANCTION', title: 'Tu cuenta está suspendida', body: expect.stringContaining('juego sucio') }),
    );
    expect((await api().get('/api/v1/users/me').set(auth(p.b.token))).body.suspendedUntil).toBe(sancion.body.suspendedUntil);

    const otro = await publishMatch(admin.token, { title: 'Partido abierto para el suspendido' });
    const postula = await api().post(`/api/v1/matches/${otro.id}/join`).set(auth(p.b.token));
    expect([postula.status, postula.body.error.code]).toEqual([403, 'ACCOUNT_SUSPENDED']);
    const publica = await api().post('/api/v1/matches').set(auth(p.b.token)).send(matchPayload());
    expect([publica.status, publica.body.error.code]).toEqual([403, 'ACCOUNT_SUSPENDED']);

    const dosVeces = await resolver(admin.token, nuevo.body.id, { action: 'DISMISS' });
    expect([dosVeces.status, dosVeces.body.error.code]).toEqual([409, 'REPORT_ALREADY_RESOLVED']);
  });

  it('CN-53 · descartar deja el reporte en el registro sin suspender a nadie', async () => {
    const p = await partidoJugado(72_000, HORA);
    const rep = await reportar(p.a.token, p.id, { reportedId: p.b.user.id, reason: 'OTRO' });

    const res = await resolver(admin.token, rep.body.id, { action: 'DISMISS', note: 'Sin pruebas' });
    expect(res.body).toMatchObject({ status: 'DISMISSED', suspendedUntil: null });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: p.b.user.id } })).suspendedUntil).toBeNull();
    const descartados = await api().get('/api/v1/admin/reports').query({ status: 'DISMISSED' }).set(auth(admin.token));
    expect(descartados.body.reports).toContainEqual(
      expect.objectContaining({ id: rep.body.id, resolution: expect.objectContaining({ note: 'Sin pruebas' }) }),
    );
    await expect(publishMatch(p.b.token, { title: 'Sigue jugando' })).resolves.toMatchObject({ status: 'OPEN' });
  });

  it('S-23 · un jugador que no es administrador no abre ni resuelve el panel', async () => {
    const p = await partidoJugado(73_000, HORA);
    const rep = await reportar(p.a.token, p.id, { reportedId: p.b.user.id, reason: 'OTRO' });

    expect((await api().get('/api/v1/admin/reports').set(auth(p.a.token))).status).toBe(403);
    expect((await api().get(`/api/v1/admin/reports/${rep.body.id}`).set(auth(p.a.token))).status).toBe(403);
    expect((await resolver(p.b.token, rep.body.id, { action: 'DISMISS' })).status).toBe(403);
    expect((await prisma.report.findUniqueOrThrow({ where: { id: rep.body.id } })).status).toBe('PENDING');
  });
});
