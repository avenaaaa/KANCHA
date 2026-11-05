import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Transbank simulado: estas pruebas nunca llaman a la pasarela real.
const webpay = vi.hoisted(() => ({
  formUrl: 'https://webpay3gint.transbank.cl/webpayserver/initTransaction',
  create: vi.fn(),
  commit: vi.fn(),
  refund: vi.fn(),
}));
vi.mock('../../src/repositories/webpay.repository.js', () => ({ webpayRepository: webpay }));

import { AppError } from '../../src/utils/errors.js';
import { prisma } from '../../src/config/prisma.js';
import { api, dbReady, inHours, northOf, publishMatch, registerUser } from './helpers.js';

const hasDb = await dbReady();
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe.skipIf(!hasDb)('Cancelación y retención · HU-09 (integración)', () => {
  let organizador = { token: '', user: { id: '', name: '' } };
  let distancia = 5_000;

  beforeAll(async () => {
    organizador = await registerUser('Organizador que retiene');
  });
  afterAll(() => prisma.$disconnect());

  beforeEach(() => {
    webpay.create.mockReset().mockImplementation(async () => ({ token: `tok-${Math.random().toString(36).slice(2)}` }));
    webpay.commit.mockReset().mockImplementation(async () => ({
      status: 'AUTHORIZED',
      responseCode: 0,
      amount: 6600,
      buyOrder: 'X',
      authorizationCode: '1213',
      cardLast4: '6623',
    }));
    webpay.refund.mockReset().mockResolvedValue({ type: 'NULLIFIED' });
  });

  /** Partido de $24.000 en 4 cupos (cuota $6.000 + $600 de servicio) con un jugador aprobado. */
  async function cupo(startsInHours: number, pagar: boolean) {
    distancia += 50;
    const partido = await publishMatch(organizador.token, {
      ...northOf(distancia),
      startsAt: inHours(startsInHours),
      totalSlots: 4,
      filledSlots: 2,
      totalCost: 24000,
    });
    const jugador = await registerUser('Jugador que cancela');
    const join = await api().post(`/api/v1/matches/${partido.id}/join`).set(auth(jugador.token));
    const participationId = join.body.participationId as string;
    await api().patch(`/api/v1/participations/${participationId}/approve`).set(auth(organizador.token));
    if (pagar) {
      await api().post(`/api/v1/payments/${participationId}/init`).set(auth(jugador.token));
      const pago = await prisma.payment.findUniqueOrThrow({ where: { participationId } });
      await api().get(`/api/v1/payments/return?token_ws=${pago.token}`);
    }
    return { partido, jugador, participationId };
  }

  const cancelar = (participationId: string, token: string) =>
    api().delete(`/api/v1/participations/${participationId}`).set(auth(token));

  it('I-08 · CN-27 · cancelar a 6 h: retiene el 50 %, reembolsa el resto y el recinto recibe lo retenido menos la comisión', async () => {
    const { partido, jugador, participationId } = await cupo(6, true);
    const detalle = await api().get(`/api/v1/matches/${partido.id}`).set(auth(jugador.token));
    expect(detalle.body.viewer.refundIfCancelled).toMatchObject({ refunded: 3300, retained: 3300, withinRetentionWindow: true });

    const res = await cancelar(participationId, jugador.token);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'CANCELLED',
      refund: { refunded: 3300, retained: 3300, platformCommission: 330, venueAmount: 2970, withinRetentionWindow: true },
    });

    const pago = await prisma.payment.findUniqueOrThrow({ where: { participationId } });
    expect(webpay.refund).toHaveBeenCalledWith(pago.token, 3300);
    expect(pago).toMatchObject({ status: 'RETAINED', retained: 3300, commission: 330 });
    expect((await prisma.participation.findUniqueOrThrow({ where: { id: participationId } })).status).toBe('CANCELLED');
    expect((await prisma.match.findUniqueOrThrow({ where: { id: partido.id } })).filledSlots).toBe(2);
  });

  it('CN-26 · cancelar con 48 h devuelve el 100 % y no retiene nada', async () => {
    const { jugador, participationId } = await cupo(48, true);
    const res = await cancelar(participationId, jugador.token);
    expect(res.body.refund).toMatchObject({ refunded: 6600, retained: 0, withinRetentionWindow: false });
    expect(await prisma.payment.findUniqueOrThrow({ where: { participationId } })).toMatchObject({ status: 'REFUNDED', retained: 0 });
  });

  it('HU-09 · un cupo aprobado sin pagar se libera sin pasar por Transbank', async () => {
    const { partido, jugador, participationId } = await cupo(48, false);
    const res = await cancelar(participationId, jugador.token);
    expect(res.body).toMatchObject({ status: 'CANCELLED', refund: null });
    expect(webpay.refund).not.toHaveBeenCalled();
    expect((await prisma.match.findUniqueOrThrow({ where: { id: partido.id } })).filledSlots).toBe(2);
  });

  it('HU-09 · retirar una postulación pendiente no cambia los cupos', async () => {
    distancia += 50;
    const partido = await publishMatch(organizador.token, { ...northOf(distancia), totalSlots: 4, filledSlots: 2 });
    const jugador = await registerUser('Se arrepiente');
    const join = await api().post(`/api/v1/matches/${partido.id}/join`).set(auth(jugador.token));
    const res = await cancelar(join.body.participationId, jugador.token);
    expect(res.status).toBe(200);
    expect((await prisma.match.findUniqueOrThrow({ where: { id: partido.id } })).filledSlots).toBe(2);
  });

  it('S-03 · nadie cancela el cupo de otro jugador (403)', async () => {
    const { participationId } = await cupo(48, true);
    const intruso = await registerUser('Intruso');
    const res = await cancelar(participationId, intruso.token);
    expect(res.status).toBe(403);
    expect(webpay.refund).not.toHaveBeenCalled();
  });

  it('HU-09 · dos cancelaciones simultáneas reembolsan una sola vez', async () => {
    const { jugador, participationId } = await cupo(6, true);
    const [a, b] = await Promise.all([cancelar(participationId, jugador.token), cancelar(participationId, jugador.token)]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    expect(webpay.refund).toHaveBeenCalledTimes(1);
  });

  it('HU-09 · si Transbank no reembolsa, el cupo y el pago quedan como estaban (502)', async () => {
    const { jugador, participationId } = await cupo(6, true);
    webpay.refund.mockRejectedValueOnce(new AppError(502, 'PAYMENT_GATEWAY_ERROR', 'Transbank no respondió'));
    const res = await cancelar(participationId, jugador.token);
    expect(res.status).toBe(502);
    expect((await prisma.participation.findUniqueOrThrow({ where: { id: participationId } })).status).toBe('PAID');
    expect((await prisma.payment.findUniqueOrThrow({ where: { participationId } })).status).toBe('AUTHORIZED');
  });
});
