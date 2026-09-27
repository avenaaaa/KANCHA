import { describe, expect, it } from 'vitest';
import {
  buildBuyOrder,
  calculateAmountDue,
  calculateCommission,
  calculateRefund,
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
