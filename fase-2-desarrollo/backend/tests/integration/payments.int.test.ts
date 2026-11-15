import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Transbank simulado: estas pruebas nunca llaman a la pasarela real.
const webpay = vi.hoisted(() => ({
  formUrl: 'https://webpay3gint.transbank.cl/webpayserver/initTransaction',
  create: vi.fn(),
  commit: vi.fn(),
  status: vi.fn(),
  refund: vi.fn(),
}));
vi.mock('../../src/repositories/webpay.repository.js', () => ({ webpayRepository: webpay }));

import { AppError } from '../../src/utils/errors.js';
import { prisma } from '../../src/config/prisma.js';
import { api, dbReady, northOf, publishMatch, registerUser } from './helpers.js';

const hasDb = await dbReady();
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe.skipIf(!hasDb)('Pago fraccionado con Webpay · HU-08 (integración)', () => {
  let organizador = { token: '', user: { id: '', name: '' } };
  let distancia = 2_000;

  beforeAll(async () => {
    organizador = await registerUser('Organizador que cobra');
  });
  afterAll(() => prisma.$disconnect());

  beforeEach(() => {
    webpay.create.mockReset().mockImplementation(async () => ({ token: `tok-${Math.random().toString(36).slice(2)}` }));
    webpay.commit.mockReset();
    webpay.status.mockReset().mockResolvedValue({ status: 'INITIALIZED', responseCode: -1, amount: 6600, buyOrder: 'X', authorizationCode: null, cardLast4: null });
    webpay.refund.mockReset().mockResolvedValue({ type: 'REVERSED' });
  });

  const APROBADO = { status: 'AUTHORIZED', responseCode: 0, amount: 6600, buyOrder: 'X', authorizationCode: '1213', cardLast4: '6623' };
  const estado = async (participationId: string) => ({
    cupo: (await prisma.participation.findUniqueOrThrow({ where: { id: participationId } })).status,
    pago: (await prisma.payment.findUniqueOrThrow({ where: { participationId } })).status,
  });

  /** Partido de $24.000 en 4 cupos (cuota $6.000) con un jugador ya aprobado. */
  async function jugadorAprobado(filledSlots = 2) {
    distancia += 50;
    const partido = await publishMatch(organizador.token, { ...northOf(distancia), totalSlots: 4, filledSlots, totalCost: 24000 });
    const jugador = await registerUser('Jugador que paga');
    const join = await api().post(`/api/v1/matches/${partido.id}/join`).set(auth(jugador.token));
    await api().patch(`/api/v1/participations/${join.body.participationId}/approve`).set(auth(organizador.token));
    return { partido, jugador, participationId: join.body.participationId as string };
  }

  async function iniciarPago() {
    const c = await jugadorAprobado();
    const init = await api().post(`/api/v1/payments/${c.participationId}/init`).set(auth(c.jugador.token));
    const pago = await prisma.payment.findUniqueOrThrow({ where: { participationId: c.participationId } });
    return { ...c, init, pago };
  }

  it('I-06 · init cobra la cuota más el 10 % y deja el pago iniciado', async () => {
    const { jugador, init, pago } = await iniciarPago();

    expect(init.status).toBe(201);
    expect(init.body).toMatchObject({ amount: 6600, commission: 600, checkoutPath: `/payments/${pago.id}/webpay` });
    // El id de sesión es aleatorio, no el id del usuario (que es público): ver S-16.
    expect(pago.sessionId).not.toBe(jugador.user.id);
    expect(webpay.create).toHaveBeenCalledWith(
      pago.buyOrder,
      pago.sessionId,
      6600,
      expect.stringMatching(/\/api\/v1\/payments\/return$/),
    );
    expect(pago).toMatchObject({ status: 'INITIATED', amount: 6600, commission: 600 });
  });

  it('S-03 · nadie inicia el pago del cupo de otro jugador (403)', async () => {
    const { participationId } = await jugadorAprobado();
    const intruso = await registerUser('Intruso');
    const res = await api().post(`/api/v1/payments/${participationId}/init`).set(auth(intruso.token));
    expect(res.status).toBe(403);
    expect(webpay.create).not.toHaveBeenCalled();
  });

  it('HU-08 · sin la aprobación del organizador no se puede pagar (409)', async () => {
    const partido = await publishMatch(organizador.token, { ...northOf(3_000), totalCost: 24000 });
    const jugador = await registerUser('Pendiente');
    const join = await api().post(`/api/v1/matches/${partido.id}/join`).set(auth(jugador.token));
    const res = await api().post(`/api/v1/payments/${join.body.participationId}/init`).set(auth(jugador.token));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('NOT_APPROVED');
  });

  it('S-13 · la página de Webpay solo puede enviar el token a Transbank', async () => {
    const { pago } = await iniciarPago();
    const res = await api().get(`/api/v1/payments/${pago.id}/webpay`);
    expect(res.status).toBe(200);
    expect(res.text).toContain(`action="${webpay.formUrl}"`);
    expect(res.text).toContain(`value="${pago.token}"`);
    expect(res.headers['content-security-policy']).toContain('form-action https://webpay3gint.transbank.cl');
  });

  it('I-06 · pago aprobado: cupo "Confirmado y pagado" y comprobante; recargar no vuelve a cobrar', async () => {
    const { partido, jugador, participationId, pago } = await iniciarPago();
    webpay.commit.mockResolvedValue({
      status: 'AUTHORIZED',
      responseCode: 0,
      amount: 6600,
      buyOrder: pago.buyOrder,
      authorizationCode: '1213',
      cardLast4: '6623',
    });

    const res = await api().get(`/api/v1/payments/return?token_ws=${pago.token}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('Pago aprobado');
    expect(res.text).toContain('1213');
    expect((await prisma.participation.findUniqueOrThrow({ where: { id: participationId } })).status).toBe('PAID');

    const detalle = await api().get(`/api/v1/matches/${partido.id}`).set(auth(jugador.token));
    expect(detalle.body.viewer).toMatchObject({ status: 'PAID', payment: { status: 'AUTHORIZED', amount: 6600 } });

    const recarga = await api().get(`/api/v1/payments/return?token_ws=${pago.token}`);
    expect(recarga.text).toContain('Pago aprobado');
    expect(webpay.commit).toHaveBeenCalledTimes(1);
  });

  it('I-07 · CN-29 · pago rechazado: queda FAILED, el cupo se libera y el jugador puede volver a postular', async () => {
    const { partido, jugador, participationId, pago } = await iniciarPago();
    webpay.commit.mockResolvedValue({ status: 'FAILED', responseCode: -1, amount: 6600, buyOrder: pago.buyOrder, authorizationCode: null, cardLast4: null });

    const res = await api().get(`/api/v1/payments/return?token_ws=${pago.token}`);
    expect(res.text).toContain('El pago no se completó');
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: pago.id } })).status).toBe('FAILED');
    expect((await prisma.participation.findUniqueOrThrow({ where: { id: participationId } })).status).toBe('CANCELLED');
    expect((await prisma.match.findUniqueOrThrow({ where: { id: partido.id } })).filledSlots).toBe(2);

    const otraVez = await api().post(`/api/v1/matches/${partido.id}/join`).set(auth(jugador.token));
    expect(otraVez.status).toBe(201);
    expect(otraVez.body).toMatchObject({ participationId, status: 'PENDING' });
  });

  it('HU-08 · anular en Webpay (TBK_TOKEN por POST) libera el cupo sin confirmar nada', async () => {
    const { participationId, pago } = await iniciarPago();
    const res = await api()
      .post('/api/v1/payments/return')
      .type('form')
      .send({ TBK_TOKEN: pago.token ?? '', TBK_ORDEN_COMPRA: pago.buyOrder, TBK_ID_SESION: 'sesion' });

    expect(res.text).toContain('El pago no se completó');
    expect(webpay.commit).not.toHaveBeenCalled();
    expect((await prisma.participation.findUniqueOrThrow({ where: { id: participationId } })).status).toBe('CANCELLED');
  });

  it('HU-08 · si el último cupo no se paga, el partido lleno vuelve a recibir postulaciones', async () => {
    const c = await jugadorAprobado(3);
    expect((await prisma.match.findUniqueOrThrow({ where: { id: c.partido.id } })).status).toBe('FULL');
    await api().post(`/api/v1/payments/${c.participationId}/init`).set(auth(c.jugador.token));
    const pago = await prisma.payment.findUniqueOrThrow({ where: { participationId: c.participationId } });
    webpay.commit.mockResolvedValue({ status: 'FAILED', responseCode: -1, amount: 6600, buyOrder: pago.buyOrder, authorizationCode: null, cardLast4: null });

    await api().get(`/api/v1/payments/return?token_ws=${pago.token}`);
    expect(await prisma.match.findUniqueOrThrow({ where: { id: c.partido.id } })).toMatchObject({ status: 'OPEN', filledSlots: 3 });
  });

  it('I-12 · DEF-08 · cancelar con Webpay abierto cierra el pago: terminarlo después no confirma ni cobra', async () => {
    const { partido, jugador, participationId, pago } = await iniciarPago();

    const cancela = await api().delete(`/api/v1/participations/${participationId}`).set(auth(jugador.token));
    expect(cancela.status).toBe(200);
    expect(await estado(participationId)).toEqual({ cupo: 'CANCELLED', pago: 'FAILED' });

    // El jugador vuelve a la pestaña de Webpay y termina de pagar.
    const form = await api().get(`/api/v1/payments/${pago.id}/webpay`);
    expect(form.status).toBe(404);
    webpay.commit.mockResolvedValue(APROBADO);
    const vuelta = await api().get(`/api/v1/payments/return?token_ws=${pago.token}`);
    expect(vuelta.text).toContain('El pago no se completó');
    expect(webpay.commit).not.toHaveBeenCalled();
    expect(await estado(participationId)).toEqual({ cupo: 'CANCELLED', pago: 'FAILED' });
    expect((await prisma.match.findUniqueOrThrow({ where: { id: partido.id } })).filledSlots).toBe(2);
  });

  it('I-13 · DEF-08 · si el cupo se cancela mientras Transbank confirma, se devuelve todo lo cobrado', async () => {
    const { participationId, pago } = await iniciarPago();
    // La cancelación gana la carrera justo antes de registrar el pago aprobado.
    webpay.commit.mockImplementation(async () => {
      await prisma.participation.update({ where: { id: participationId }, data: { status: 'CANCELLED' } });
      return APROBADO;
    });

    const vuelta = await api().get(`/api/v1/payments/return?token_ws=${pago.token}`);
    expect(vuelta.text).toContain('El pago no se completó');
    expect(webpay.refund).toHaveBeenCalledWith(pago.token, 6600);
    expect(await estado(participationId)).toEqual({ cupo: 'CANCELLED', pago: 'REFUNDED' });
  });

  it('I-14 · DEF-10 · si la respuesta del commit se pierde, se consulta el estado y el pago queda registrado', async () => {
    const { participationId, pago } = await iniciarPago();
    webpay.commit.mockRejectedValue(new AppError(502, 'PAYMENT_GATEWAY_ERROR', 'Transbank no respondió'));
    webpay.status.mockResolvedValue(APROBADO);

    const vuelta = await api().get(`/api/v1/payments/return?token_ws=${pago.token}`);
    expect(vuelta.text).toContain('Pago aprobado');
    expect(webpay.status).toHaveBeenCalledWith(pago.token);
    expect(await estado(participationId)).toEqual({ cupo: 'PAID', pago: 'AUTHORIZED' });
  });

  it('I-14 · si Transbank tampoco responde el estado, el pago sigue iniciado y se informa 502', async () => {
    const { participationId, pago } = await iniciarPago();
    const caida = new AppError(502, 'PAYMENT_GATEWAY_ERROR', 'Transbank no respondió');
    webpay.commit.mockRejectedValue(caida);
    webpay.status.mockRejectedValue(caida);

    const vuelta = await api().get(`/api/v1/payments/return?token_ws=${pago.token}`);
    expect(vuelta.status).toBe(502);
    expect(await estado(participationId)).toEqual({ cupo: 'APPROVED', pago: 'INITIATED' });
  });

  it('I-15 · DEF-10 · reintentar un pago que Transbank ya aprobó no cobra dos veces (409 ALREADY_PAID)', async () => {
    const { jugador, participationId } = await iniciarPago();
    webpay.status.mockResolvedValue(APROBADO);
    webpay.create.mockClear();

    const otraVez = await api().post(`/api/v1/payments/${participationId}/init`).set(auth(jugador.token));
    expect(otraVez.status).toBe(409);
    expect(otraVez.body.error.code).toBe('ALREADY_PAID');
    expect(webpay.create).not.toHaveBeenCalled();
    expect(await estado(participationId)).toEqual({ cupo: 'PAID', pago: 'AUTHORIZED' });
  });

  it('I-15 · reintentar un pago que quedó sin pagar crea un cobro nuevo', async () => {
    const { jugador, participationId, pago } = await iniciarPago();
    const otraVez = await api().post(`/api/v1/payments/${participationId}/init`).set(auth(jugador.token));
    expect(otraVez.status).toBe(201);
    const nuevo = await prisma.payment.findUniqueOrThrow({ where: { participationId } });
    expect(nuevo.token).not.toBe(pago.token);
    expect(nuevo.status).toBe('INITIATED');
  });

  it('S-16 · DEF-12 · "tiempo agotado" con una orden de compra ajena y sin su id de sesión no toca el pago (404)', async () => {
    const { participationId, pago } = await iniciarPago();

    const ajeno = await api().get(`/api/v1/payments/return?TBK_ORDEN_COMPRA=${pago.buyOrder}&TBK_ID_SESION=adivinado`);
    expect(ajeno.status).toBe(404);
    const sinSesion = await api().get(`/api/v1/payments/return?TBK_ORDEN_COMPRA=${pago.buyOrder}`);
    expect(sinSesion.status).toBe(404);
    expect(await estado(participationId)).toEqual({ cupo: 'APPROVED', pago: 'INITIATED' });

    // La vuelta real de Transbank trae el id de sesión de ese pago.
    const real = await api().get(`/api/v1/payments/return?TBK_ORDEN_COMPRA=${pago.buyOrder}&TBK_ID_SESION=${pago.sessionId}`);
    expect(real.text).toContain('El pago no se completó');
    expect(await estado(participationId)).toEqual({ cupo: 'CANCELLED', pago: 'FAILED' });
  });

  it('S-05 · la vuelta de Webpay sin token se rechaza con 422', async () => {
    const res = await api().get('/api/v1/payments/return');
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('S-08 · un token_ws inventado se rechaza sin tocar ningún pago', async () => {
    const res = await api().get('/api/v1/payments/return?token_ws=token-inventado');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PAYMENT_NOT_FOUND');
    expect(webpay.commit).not.toHaveBeenCalled();
  });
});
