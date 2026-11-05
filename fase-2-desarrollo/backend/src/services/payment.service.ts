import type { MatchStatus } from '@prisma/client';
import { env } from '../config/env.js';
import {
  participationRepository,
  type ApprovalTx,
  type LockedMatch,
} from '../repositories/participation.repository.js';
import { paymentRepository, type PaymentWithMatch } from '../repositories/payment.repository.js';
import { webpayRepository, type WebpayCommit } from '../repositories/webpay.repository.js';
import { AppError, conflict, forbidden, notFound } from '../utils/errors.js';
import type { WebpayReturn } from '../schemas/payment.schema.js';

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

export type CheckoutDecision =
  | { ok: true; amount: number; commission: number }
  | { ok: false; error: AppError };

/**
 * HU-08: ¿puede este jugador pagar su cupo, y cuánto?
 * Paga la cuota congelada al aprobarlo más la comisión de Kancha, igual que la
 * app se lo anuncia ("$X por jugador · más $Y de servicio Kancha").
 */
export function decideCheckout(
  p: { userId: string; status: string; amountDue: number; match: { startsAt: Date } },
  userId: string,
  now: Date = new Date(),
): CheckoutDecision {
  if (p.userId !== userId) return { ok: false, error: forbidden('Solo puedes pagar tu propio cupo') };
  if (p.status === 'PAID') return { ok: false, error: conflict('ALREADY_PAID', 'Tu cupo ya está pagado') };
  if (p.status !== 'APPROVED') {
    return { ok: false, error: conflict('NOT_APPROVED', 'El organizador aún no confirma tu cupo') };
  }
  if (new Date(p.match.startsAt).getTime() <= now.getTime()) {
    return { ok: false, error: conflict('MATCH_STARTED', 'El partido ya comenzó') };
  }
  if (p.amountDue <= 0) return { ok: false, error: conflict('NOTHING_TO_PAY', 'Este partido es gratis') };
  const commission = calculateCommission(p.amountDue);
  return { ok: true, amount: p.amountDue + commission, commission };
}

/** Liberar un cupo: uno menos ocupado y, si el partido estaba lleno, vuelve a recibir postulaciones. */
export function decideRelease(match: Pick<LockedMatch, 'filledSlots' | 'status'>): {
  filledSlots: number;
  status: MatchStatus;
} {
  return {
    filledSlots: Math.max(0, match.filledSlots - 1),
    status: match.status === 'FULL' ? 'OPEN' : (match.status as MatchStatus),
  };
}

/** Con el partido ya bloqueado: la participación pasa a CANCELLED y el partido queda con un cupo menos. */
async function releaseLockedSlot(tx: ApprovalTx, participationId: string, match: LockedMatch): Promise<void> {
  const next = decideRelease(match);
  await tx.markParticipation(participationId, 'CANCELLED');
  await tx.updateSlots(match.id, next.filledSlots, next.status);
}

/**
 * Si el pago falla, queda FAILED y el cupo se libera para otro jugador
 * (DESARROLLO.md §9). Mismo bloqueo de fila que la aprobación (HU-05).
 */
function releaseUnpaidSlot(participationId: string, paymentId: string): Promise<void> {
  return participationRepository.inApprovalTransaction(async (tx) => {
    await tx.markPayment(paymentId, { status: 'FAILED' });
    const p = await tx.findParticipation(participationId);
    if (p?.status !== 'APPROVED') return;
    const match = await tx.lockMatch(p.matchId);
    if (match) await releaseLockedSlot(tx, participationId, match);
  });
}

/** Reparto de una cancelación pagada (HU-09): lo retenido va al recinto, menos la comisión de Kancha. */
export interface CancellationRefund extends RefundBreakdown {
  platformCommission: number;
  venueAmount: number;
}

export type CancellationDecision =
  | { ok: true; releasesSlot: boolean; refund: CancellationRefund | null }
  | { ok: false; error: AppError };

/**
 * HU-09: ¿puede cancelar, libera un cupo y cuánto se devuelve?
 * Una postulación PENDING no ocupaba cupo; APPROVED y PAID sí. Solo un cupo
 * pagado tiene reembolso, según la ventana de 12 h de calculateRefund.
 */
export function decideCancellation(
  p: { userId: string; status: string; match: { startsAt: Date }; payment: { status: string; amount: number } | null },
  userId: string,
  now: Date = new Date(),
): CancellationDecision {
  if (p.userId !== userId) return { ok: false, error: forbidden('Solo puedes cancelar tu propio cupo') };
  if (!['PENDING', 'APPROVED', 'PAID'].includes(p.status)) {
    return { ok: false, error: conflict('NOT_CANCELLABLE', 'Este cupo ya está cancelado') };
  }
  if (new Date(p.match.startsAt).getTime() <= now.getTime()) {
    return { ok: false, error: conflict('MATCH_STARTED', 'El partido ya comenzó') };
  }
  if (p.status !== 'PAID' || p.payment?.status !== 'AUTHORIZED') {
    return { ok: true, releasesSlot: p.status !== 'PENDING', refund: null };
  }
  const split = calculateRefund(p.payment.amount, p.match.startsAt, now);
  const platformCommission = calculateCommission(split.retained);
  return {
    ok: true,
    releasesSlot: true,
    refund: { ...split, platformCommission, venueAmount: split.retained - platformCommission },
  };
}

/**
 * HU-09: el jugador cancela su cupo. Todo ocurre con el partido bloqueado: una
 * segunda cancelación simultánea espera, relee el cupo ya cancelado y recibe 409,
 * así nunca se reembolsa dos veces. Si Transbank falla, la transacción se revierte.
 */
export function cancelParticipation(
  participationId: string,
  userId: string,
  now: Date = new Date(),
): Promise<{ status: 'CANCELLED'; refund: CancellationRefund | null }> {
  return participationRepository.inApprovalTransaction(async (tx) => {
    const p = await paymentRepository.findForCancellation(participationId);
    if (!p) throw notFound('PARTICIPATION_NOT_FOUND', 'La postulación no existe');
    const match = await tx.lockMatch(p.matchId);
    const current = await tx.findParticipation(participationId);

    const decision = decideCancellation({ ...p, status: current?.status ?? p.status }, userId, now);
    if (!decision.ok) throw decision.error;

    const { refund } = decision;
    if (refund && p.payment) {
      if (refund.refunded > 0 && p.payment.token) await webpayRepository.refund(p.payment.token, refund.refunded);
      await tx.markPayment(p.payment.id, {
        status: refund.retained > 0 ? 'RETAINED' : 'REFUNDED',
        retained: refund.retained,
        commission: refund.platformCommission,
      });
    }
    if (decision.releasesSlot && match) await releaseLockedSlot(tx, participationId, match);
    else await tx.markParticipation(participationId, 'CANCELLED');
    return { status: 'CANCELLED' as const, refund };
  });
}

/** Transbank aprueba solo con response_code 0 y estado AUTHORIZED. */
export const isApproved = (c: Pick<WebpayCommit, 'status' | 'responseCode'>): boolean =>
  c.responseCode === 0 && c.status === 'AUTHORIZED';

/** Paso 1: crea la transacción en Webpay y deja el pago INITIATED. */
export async function startPayment(
  participationId: string,
  userId: string,
  returnUrl: string,
  now: Date = new Date(),
): Promise<{ paymentId: string; amount: number; commission: number }> {
  const p = await paymentRepository.findForCheckout(participationId);
  if (!p) throw notFound('PARTICIPATION_NOT_FOUND', 'La postulación no existe');

  const decision = decideCheckout(p, userId, now);
  if (!decision.ok) throw decision.error;

  const buyOrder = buildBuyOrder(participationId, now);
  const { token } = await webpayRepository.create(buyOrder, userId, decision.amount, returnUrl);
  const payment = await paymentRepository.upsertInitiated({
    participationId,
    amount: decision.amount,
    commission: decision.commission,
    buyOrder,
    sessionId: userId,
    token,
  });
  return { paymentId: payment.id, amount: decision.amount, commission: decision.commission };
}

/** Paso 2: datos del formulario que lleva al jugador a Webpay. Solo mientras el pago está iniciado. */
export async function getCheckoutForm(paymentId: string): Promise<{ formUrl: string; token: string; amount: number }> {
  const payment = await paymentRepository.findById(paymentId);
  if (!payment || payment.status !== 'INITIATED' || !payment.token) {
    throw notFound('PAYMENT_NOT_FOUND', 'Este pago ya no está disponible');
  }
  return { formUrl: webpayRepository.formUrl, token: payment.token, amount: payment.amount };
}

export interface PaymentResult {
  approved: boolean;
  matchId: string;
  matchTitle: string;
  amount: number;
  buyOrder: string;
  authorizationCode: string | null;
  cardLast4: string | null;
  at: Date | null;
}

const toResult = (p: PaymentWithMatch, approved: boolean, commit: WebpayCommit | null, at: Date | null): PaymentResult => ({
  approved,
  matchId: p.participation.match.id,
  matchTitle: p.participation.match.title,
  amount: p.amount,
  buyOrder: p.buyOrder,
  authorizationCode: commit?.authorizationCode ?? null,
  cardLast4: commit?.cardLast4 ?? null,
  at,
});

/**
 * Paso 3: Transbank devuelve al jugador. Con token_ws solo, el pago se confirma
 * (commit). Con TBK_TOKEN el jugador lo anuló; con solo TBK_ORDEN_COMPRA se
 * agotó el tiempo. Si no se aprueba, el cupo se libera para otro jugador.
 */
export async function finishPayment(input: WebpayReturn, now: Date = new Date()): Promise<PaymentResult> {
  if (input.token_ws && !input.TBK_TOKEN) {
    const payment = await paymentRepository.findByToken(input.token_ws);
    if (!payment) throw notFound('PAYMENT_NOT_FOUND', 'No encontramos este pago');
    // Recargar la página de vuelta no vuelve a confirmar: el commit se hace una sola vez.
    if (payment.status !== 'INITIATED') {
      return toResult(payment, payment.status === 'AUTHORIZED', null, payment.authorizedAt);
    }

    const commit = await webpayRepository.commit(input.token_ws);
    if (isApproved(commit)) {
      await paymentRepository.markAuthorized(payment, now);
      return toResult(payment, true, commit, now);
    }
    await releaseUnpaidSlot(payment.participationId, payment.id);
    return toResult(payment, false, commit, null);
  }

  const payment = input.TBK_ORDEN_COMPRA
    ? await paymentRepository.findByBuyOrder(input.TBK_ORDEN_COMPRA)
    : await paymentRepository.findByToken(input.TBK_TOKEN ?? '');
  if (!payment) throw notFound('PAYMENT_NOT_FOUND', 'No encontramos este pago');
  if (payment.status === 'INITIATED') await releaseUnpaidSlot(payment.participationId, payment.id);
  return toResult(payment, payment.status === 'AUTHORIZED', null, payment.authorizedAt);
}
