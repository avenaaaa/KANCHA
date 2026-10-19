import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/config/prisma.js';
import { api, dbReady, inHours, northOf, origin, publishMatch, registerUser, matchPayload } from './helpers.js';

const hasDb = await dbReady();

describe.skipIf(!hasDb)('Partidos · HU-03 y HU-04 (integración)', () => {
  let token = '';

  beforeAll(async () => {
    token = (await registerUser('Organizador')).token;
  });
  afterAll(() => prisma.$disconnect());

  const nearby = (query: Record<string, string | number>) =>
    api()
      .get('/api/v1/matches/nearby')
      .query({ lat: origin.lat, lng: origin.lng, ...query })
      .set('Authorization', `Bearer ${token}`);

  it('CN-04 · publicar con fecha futura y cupos → 201 y estado OPEN', async () => {
    const res = await api().post('/api/v1/matches').set('Authorization', `Bearer ${token}`).send(matchPayload());
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: 'OPEN', slotsLeft: 1, pricePerPlayer: 6000, serviceFee: 600 });
    expect(res.body.viewer.isOrganizer).toBe(true);
  });

  it('CN-05 · publicar en el pasado → 422 MATCH_IN_PAST', async () => {
    const res = await api()
      .post('/api/v1/matches')
      .set('Authorization', `Bearer ${token}`)
      .send(matchPayload({ startsAt: inHours(-1) }));
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('MATCH_IN_PAST');
  });

  it('CN-06 · totalSlots = 0 → 422', async () => {
    const res = await api()
      .post('/api/v1/matches')
      .set('Authorization', `Bearer ${token}`)
      .send(matchPayload({ totalSlots: 0 }));
    expect(res.status).toBe(422);
  });

  it('I-03 · la ubicación se guarda como geography y se lee igual', async () => {
    const created = await publishMatch(token, northOf(1_000));
    const [row] = await prisma.$queryRaw<{ type: string }[]>`
      SELECT GeometryType(location::geometry) AS type FROM "Match" WHERE id = ${created.id}`;
    expect(row?.type).toBe('POINT');

    const detail = await api().get(`/api/v1/matches/${created.id}`).set('Authorization', `Bearer ${token}`);
    expect(detail.body.lat).toBeCloseTo(northOf(1_000).lat, 5);
  });

  it('I-03b · la hora del partido se guarda y se lee sin desfase de zona horaria', async () => {
    const startsAt = new Date(Date.now() + 26 * 3_600_000);
    startsAt.setUTCMinutes(30, 0, 0);
    const created = await publishMatch(token, { ...northOf(1_100), startsAt: startsAt.toISOString() });
    const detail = await api().get(`/api/v1/matches/${created.id}`).set('Authorization', `Bearer ${token}`);
    expect(detail.body.startsAt).toBe(startsAt.toISOString());
  });

  it('CN-07 / CN-08 · a 4,9 km aparece y a 5,1 km no, con radio de 5 km', async () => {
    const dentro = await publishMatch(token, { ...northOf(4_900), title: 'A 4,9 km' });
    const fuera = await publishMatch(token, { ...northOf(5_100), title: 'A 5,1 km' });

    const res = await nearby({ radius: 5000 });
    expect(res.status).toBe(200);
    const ids = res.body.matches.map((m: { id: string }) => m.id);
    expect(ids).toContain(dentro.id);
    expect(ids).not.toContain(fuera.id);
  });

  it('I-04 · ordena por distancia y la informa en metros', async () => {
    const res = await nearby({ radius: 20000 });
    const distancias = res.body.matches.map((m: { distanceM: number }) => m.distanceM);
    expect(distancias.length).toBeGreaterThan(1);
    expect([...distancias].sort((a, b) => a - b)).toEqual(distancias);
  });

  it('CN-09 · filtro por deporte = pádel devuelve solo pádel', async () => {
    await publishMatch(token, { ...northOf(300), sport: 'FUTBOL', title: 'Fútbol cerca' });
    const res = await nearby({ sport: 'PADEL' });
    expect(res.body.matches.length).toBeGreaterThan(0);
    expect(res.body.matches.every((m: { sport: string }) => m.sport === 'PADEL')).toBe(true);
  });

  it('CN-09b · filtro por horario: solo partidos dentro del rango', async () => {
    const tarde = await publishMatch(token, { ...northOf(200), startsAt: inHours(120), title: 'En 5 días' });
    const res = await nearby({ from: inHours(100), to: inHours(140) });
    const ids = res.body.matches.map((m: { id: string }) => m.id);
    expect(ids).toEqual([tarde.id]);
  });

  it('CN-10 · un partido lleno no aparece en el mapa', async () => {
    const lleno = await publishMatch(token, { ...northOf(150), title: 'Casi lleno' });
    await prisma.match.update({ where: { id: lleno.id }, data: { filledSlots: 4, status: 'FULL' } });
    const res = await nearby({});
    expect(res.body.matches.map((m: { id: string }) => m.id)).not.toContain(lleno.id);
  });

  it('S-04 · un intento de inyección en sport → 422 y la tabla sigue intacta', async () => {
    const antes = await prisma.match.count();
    const res = await nearby({ sport: `'; DROP TABLE "Match"; --` });
    expect(res.status).toBe(422);
    expect(await prisma.match.count()).toBe(antes);
  });

  it('HU-04 · sin partidos en el radio devuelve una lista vacía', async () => {
    const res = await api()
      .get('/api/v1/matches/nearby')
      .query({ lat: -54.8, lng: -68.3, radius: 500 })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ matches: [], count: 0 });
  });
});
