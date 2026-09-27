import { env } from '../config/env.js';

/**
 * Pagos fraccionados y retención por deserción (HU-08, HU-09).
 *
 * Todos los montos son enteros en CLP. El peso chileno no tiene decimales, así
 * que el entero es exacto y evita los errores de redondeo del punto flotante.
 */

export interface RefundBreakdown {
  /** Monto que vuelve al jugador. */
  refunded: number;
  /** Monto retenido, que va al recinto como compensación. */
  retained: number;
  /** True si la cancelación cayó dentro de la ventana de retención. */
  withinRetentionWindow: boolean;
}

/**
 * Cuota individual de un jugador.
 * Se redondea hacia arriba para que la suma de las cuotas nunca quede por
 * debajo del costo del arriendo: el recinto siempre cobra completo.
 */
export function calculateAmountDue(totalCost: number, totalSlots: number): number {
  if (totalSlots <= 0) throw new Error('totalSlots debe ser mayor que cero');
  if (totalCost < 0) throw new Error('totalCost no puede ser negativo');
  return Math.ceil(totalCost / totalSlots);
}

/** Comisión de la plataforma sobre una cuota individual. */
export function calculateCommission(
  amount: number,
  rate: number = env.PLATFORM_COMMISSION_RATE,
): number {
  if (amount < 0) throw new Error('amount no puede ser negativo');
  return Math.round(amount * rate);
}

/**
 * Reparto de un pago cuando el jugador cancela.
 *
 * Dentro de la ventana (por defecto 12 h antes del inicio) se retiene un
 * porcentaje; fuera de ella el reembolso es total. El límite es inclusivo hacia
 * el jugador: cancelar exactamente a las 12 h da reembolso completo.
 */
export function calculateRefund(
  amountPaid: number,
  startsAt: Date,
  now: Date = new Date(),
  windowHours: number = env.RETENTION_WINDOW_HOURS,
  retentionRate: number = env.RETENTION_RATE,
): RefundBreakdown {
  if (amountPaid < 0) throw new Error('amountPaid no puede ser negativo');

  const hoursUntilStart = (startsAt.getTime() - now.getTime()) / 3_600_000;
  const withinRetentionWindow = hoursUntilStart < windowHours;

  if (!withinRetentionWindow) {
    return { refunded: amountPaid, retained: 0, withinRetentionWindow: false };
  }

  const retained = Math.round(amountPaid * retentionRate);
  return { refunded: amountPaid - retained, retained, withinRetentionWindow: true };
}

/** Orden de compra única para Webpay. Máximo 26 caracteres según Transbank. */
export function buildBuyOrder(participationId: string, now: Date = new Date()): string {
  return `KAN${now.getTime().toString(36)}${participationId.slice(0, 6)}`.toUpperCase().slice(0, 26);
}
