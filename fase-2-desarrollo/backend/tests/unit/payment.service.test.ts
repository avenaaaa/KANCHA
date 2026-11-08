import { describe, expect, it } from 'vitest';
import {
  buildBuyOrder,
  calculateAmountDue,
  calculateCommission,
  calculateRefund,
  decideCancellation,
  decideCheckout,
  decideRelease,
  isApproved,
} from '../../src/services/payment.service.js';

describe('calculateAmountDue', () => {
  it('divide el arriendo entre los cupos', () => {
    expect(calculateAmountDue(40000, 8)).toBe(5000);
  });

  it('redondea hacia arriba para que el recinto siempre cobre completo', () => {
    // 7 cuotas de 4286 suman 30002, nunca menos de 30000
    expect(calculateAmountDue(30000, 7)).toBe(4286);
    expect(calculateAmountDue(30000, 7) * 7).toBeGreaterThanOrEqual(30000);
  });

  it('un partido gratuito no cobra nada', () => {
    expect(calculateAmountDue(0, 10)).toBe(0);
  });

  it('rechaza cupos inválidos', () => {
    expect(() => calculateAmountDue(10000, 0)).toThrow();
    expect(() => calculateAmountDue(-1, 5)).toThrow();
  });
});

describe('calculateCommission', () => {
  it('aplica el 10% por defecto', () => {
    expect(calculateCommission(5000)).toBe(500);
  });

  it('devuelve un entero, nunca decimales', () => {
    expect(Number.isInteger(calculateCommission(4286))).toBe(true);
  });
});

describe('calculateRefund', () => {
  const inicio = new Date('2026-10-01T20:00:00Z');

  it('reembolsa el 100% si cancela con más de 12 h (HU-09)', () => {
    const r = calculateRefund(5000, inicio, new Date('2026-10-01T07:00:00Z'));
    expect(r).toEqual({ refunded: 5000, retained: 0, withinRetentionWindow: false });
  });

  it('reembolsa el 100% justo en el límite de las 12 h', () => {
    const r = calculateRefund(5000, inicio, new Date('2026-10-01T08:00:00Z'));
    expect(r.withinRetentionWindow).toBe(false);
    expect(r.refunded).toBe(5000);
  });

  it('retiene el 50% a 11 h 59 min del inicio', () => {
    const r = calculateRefund(5000, inicio, new Date('2026-10-01T08:01:00Z'));
    expect(r).toEqual({ refunded: 2500, retained: 2500, withinRetentionWindow: true });
  });

  it('lo retenido más lo reembolsado siempre suma lo pagado', () => {
    const r = calculateRefund(4287, inicio, new Date('2026-10-01T19:00:00Z'));
    expect(r.refunded + r.retained).toBe(4287);
  });
});

describe('buildBuyOrder', () => {
  it('respeta el máximo de 26 caracteres de Transbank', () => {
    const o = buildBuyOrder('3f8a1c2e-1111-2222-3333-444455556666');
    expect(o.length).toBeLessThanOrEqual(26);
  });

  it('genera órdenes distintas para participaciones distintas', () => {
    const now = new Date();
    expect(buildBuyOrder('aaaaaa-1', now)).not.toBe(buildBuyOrder('bbbbbb-2', now));
  });
});

describe('decideCheckout (HU-08)', () => {
  const now = new Date('2026-11-05T12:00:00Z');
  const cupo = { userId: 'u1', status: 'APPROVED', amountDue: 6000, match: { startsAt: new Date('2026-11-06T20:00:00Z') } };
  const code = (d: ReturnType<typeof decideCheckout>) => (d.ok ? null : d.error.code);

  it('U-57 · el jugador confirmado paga su cuota más el 10 % de servicio', () => {
    expect(decideCheckout(cupo, 'u1', now)).toEqual({ ok: true, amount: 6600, commission: 600 });
  });

  it('U-58 · nadie paga el cupo de otro (403)', () => {
    const d = decideCheckout(cupo, 'intruso', now);
    expect(d.ok ? null : d.error.statusCode).toBe(403);
  });

  it('U-59 · sin aprobar no se paga; pagado no se cobra dos veces', () => {
    expect(code(decideCheckout({ ...cupo, status: 'PENDING' }, 'u1', now))).toBe('NOT_APPROVED');
    expect(code(decideCheckout({ ...cupo, status: 'PAID' }, 'u1', now))).toBe('ALREADY_PAID');
  });

  it('U-60 · un partido que ya empezó no se paga', () => {
    expect(code(decideCheckout({ ...cupo, match: { startsAt: now } }, 'u1', now))).toBe('MATCH_STARTED');
  });

  it('U-61 · un partido gratis no pasa por Webpay', () => {
    expect(code(decideCheckout({ ...cupo, amountDue: 0 }, 'u1', now))).toBe('NOTHING_TO_PAY');
  });
});

describe('isApproved (HU-08)', () => {
  it('U-62 · solo response_code 0 con estado AUTHORIZED es un pago aprobado', () => {
    expect(isApproved({ status: 'AUTHORIZED', responseCode: 0 })).toBe(true);
    expect(isApproved({ status: 'FAILED', responseCode: -1 })).toBe(false);
    expect(isApproved({ status: 'AUTHORIZED', responseCode: -1 })).toBe(false);
  });
});

describe('decideRelease (HU-08)', () => {
  it('U-63 · liberar un cupo reabre el partido lleno y nunca baja de cero', () => {
    expect(decideRelease({ filledSlots: 4, status: 'FULL' })).toEqual({ filledSlots: 3, status: 'OPEN' });
    expect(decideRelease({ filledSlots: 2, status: 'OPEN' })).toEqual({ filledSlots: 1, status: 'OPEN' });
    expect(decideRelease({ filledSlots: 0, status: 'OPEN' }).filledSlots).toBe(0);
  });
});

describe('decideCancellation (HU-09)', () => {
  const now = new Date('2026-11-05T12:00:00Z');
  const enHoras = (h: number) => new Date(now.getTime() + h * 3_600_000);
  const pagado = (startsAt: Date) => ({
    userId: 'u1',
    status: 'PAID',
    match: { startsAt },
    payment: { status: 'AUTHORIZED', amount: 6600 },
  });
  const code = (d: ReturnType<typeof decideCancellation>) => (d.ok ? null : d.error.code);

  it('U-64 · nadie cancela el cupo de otro (403)', () => {
    const d = decideCancellation(pagado(enHoras(48)), 'intruso', now);
    expect(d.ok ? null : d.error.statusCode).toBe(403);
  });

  it('U-65 · no se cancela dos veces ni un partido que ya empezó', () => {
    expect(code(decideCancellation({ ...pagado(enHoras(48)), status: 'CANCELLED' }, 'u1', now))).toBe('NOT_CANCELLABLE');
    expect(code(decideCancellation(pagado(now), 'u1', now))).toBe('MATCH_STARTED');
  });

  it('U-66 · una postulación pendiente no ocupaba cupo; una aprobada sin pagar lo libera sin reembolso', () => {
    const base = { userId: 'u1', match: { startsAt: enHoras(48) }, payment: null };
    expect(decideCancellation({ ...base, status: 'PENDING' }, 'u1', now)).toEqual({ ok: true, releasesSlot: false, refund: null });
    expect(decideCancellation({ ...base, status: 'APPROVED' }, 'u1', now)).toEqual({ ok: true, releasesSlot: true, refund: null });
  });

  it('U-67 · cancelar con 12 h o más devuelve el 100 % y no retiene nada', () => {
    const d = decideCancellation(pagado(enHoras(12)), 'u1', now);
    expect(d.ok && d.refund).toMatchObject({ refunded: 6600, retained: 0, platformCommission: 0, venueAmount: 0 });
  });

  it('U-68 · a menos de 12 h se retiene el 50 %: el recinto recibe lo retenido menos la comisión de Kancha', () => {
    const d = decideCancellation(pagado(enHoras(11.99)), 'u1', now);
    expect(d.ok && d.refund).toEqual({
      refunded: 3300,
      retained: 3300,
      withinRetentionWindow: true,
      platformCommission: 330,
      venueAmount: 2970,
    });
  });
});
