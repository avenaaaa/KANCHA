import type { Participation } from '@prisma/client';
import { env } from '../config/env.js';
import { matchRepository } from '../repositories/match.repository.js';
import {
  participationRepository,
  type LockedMatch,
} from '../repositories/participation.repository.js';
import { paymentRepository } from '../repositories/payment.repository.js';
import { AppError, conflict, forbidden, notFound } from '../utils/errors.js';
import { isUniqueViolation } from '../utils/db-errors.js';
import { calculateAmountDue } from './payment.service.js';
import { checkCanPrioritize, toMatchSummary, type MatchSummary } from './match.service.js';
import type { NearbyQuery } from '../schemas/match.schema.js';

/**
 * Búsqueda por radio (HU-04, KAN-10), postulación y aprobación (HU-05, KAN-11).
 *
 * Las reglas son funciones puras (checkCanJoin, decideApproval) para probarlas
 * sin base de datos. Las funciones async solo las orquestan con los repositorios.
 */

interface JoinableMatch {
  status: string;
  startsAt: Date;
  filledSlots: number;
  totalSlots: number;
  organizerId: string;
}

export type JoinBlock = 'OWN_MATCH' | 'MATCH_NOT_OPEN' | 'MATCH_STARTED' | 'MATCH_FULL';

const JOIN_MESSAGES: Record<JoinBlock, string> = {
  OWN_MATCH: 'Eres el organizador de este partido',
  MATCH_NOT_OPEN: 'El partido ya no recibe postulaciones',
  MATCH_STARTED: 'El partido ya comenzó',
  MATCH_FULL: 'El partido ya no tiene cupos disponibles',
};

/** Devuelve el motivo por el que el usuario NO puede postular, o null si puede. */
export function checkCanJoin(match: JoinableMatch, userId: string, now: Date = new Date()): JoinBlock | null {
  if (match.organizerId === userId) return 'OWN_MATCH';
  if (new Date(match.startsAt).getTime() <= now.getTime()) return 'MATCH_STARTED';
  if (match.status === 'FULL' || match.filledSlots >= match.totalSlots) return 'MATCH_FULL';
  if (match.status !== 'OPEN') return 'MATCH_NOT_OPEN';
  return null;
}

export type ApprovalDecision =
  | { ok: true; filledSlots: number; status: 'OPEN' | 'FULL'; amountDue: number }
  | { ok: false; error: AppError };

/**
 * Decide una aprobación con el partido YA bloqueado. Si el cupo que se aprueba es
 * el último, el partido pasa a FULL en la misma transacción.
 */
export function decideApproval(
  participation: Pick<Participation, 'status'>,
  match: LockedMatch,
  actorId: string,
  now: Date = new Date(),
): ApprovalDecision {
  if (match.organizerId !== actorId) {
    return { ok: false, error: forbidden('Solo el organizador puede aprobar postulaciones') };
  }
  if (participation.status !== 'PENDING') {
    return {
      ok: false,
      error: conflict('PARTICIPATION_NOT_PENDING', 'Esta postulación ya fue procesada'),
    };
  }
  if (new Date(match.startsAt).getTime() <= now.getTime()) {
    return { ok: false, error: conflict('MATCH_STARTED', JOIN_MESSAGES.MATCH_STARTED) };
  }
  if (match.status !== 'OPEN' || match.filledSlots >= match.totalSlots) {
    return { ok: false, error: conflict('MATCH_FULL', JOIN_MESSAGES.MATCH_FULL) };
  }
  const filledSlots = match.filledSlots + 1;
  return {
    ok: true,
    filledSlots,
    status: filledSlots >= match.totalSlots ? 'FULL' : 'OPEN',
    // KAN-41: mientras el partido está destacado, cada cupo que se aprueba entra gratis.
    amountDue: match.prioritizedAt ? 0 : calculateAmountDue(match.totalCost, match.totalSlots),
  };
}

/**
 * KAN-37: el filtro "Falta uno". Un partido es urgente si le falta exactamente un
 * jugador y empieza dentro de la ventana (2 h por defecto): es el "falta uno" de
 * última hora que Kancha existe para resolver. Si además viene un rango de horario,
 * manda el límite que termine antes.
 */
export function urgentWindow(
  q: Pick<NearbyQuery, 'urgent' | 'to'>,
  now: Date = new Date(),
): { to: Date | null; slotsLeft: number | null } {
  if (!q.urgent) return { to: q.to ?? null, slotsLeft: null };
  const limit = new Date(now.getTime() + env.URGENT_WINDOW_HOURS * 3_600_000);
  return { to: q.to && q.to < limit ? q.to : limit, slotsLeft: 1 };
}

/** HU-04: partidos abiertos, futuros y con cupo dentro del radio, del más cercano al más lejano. */
export async function findNearby(q: NearbyQuery, now: Date = new Date()): Promise<MatchSummary[]> {
  const rows = await matchRepository.findNearby({
    lat: q.lat,
    lng: q.lng,
    radiusM: q.radius,
    sports: q.sport ?? null,
    level: q.level ?? null,
    from: q.from ?? null,
    ...urgentWindow(q, now),
    now,
  });
  return rows.map(toMatchSummary);
}

/**
 * Quien perdió el cupo sin haber pagado (pago fallido, cancelación o rechazo) puede
 * volver a postular. Quien canceló un cupo ya pagado, no: su pago guarda el reembolso
 * y la retención de ese partido, y un pago nuevo lo pisaría.
 */
export function canRejoin(previousPaymentStatus: string | null): boolean {
  return previousPaymentStatus === null || !['AUTHORIZED', 'RETAINED', 'REFUNDED'].includes(previousPaymentStatus);
}

/** HU-05: "WHEN presiono Unirme THEN mi postulación queda registrada como Pendiente". */
export async function join(matchId: string, userId: string, now: Date = new Date()): Promise<Participation> {
  const match = await matchRepository.findById(matchId);
  if (!match) throw notFound('MATCH_NOT_FOUND', 'El partido no existe');

  const block = checkCanJoin(match, userId, now);
  if (block) throw conflict(block, JOIN_MESSAGES[block]);

  const participation = await createOrReopen(matchId, userId);
  // KAN-41: en un partido destacado no hay tiempo de esperar al organizador: entra aprobado y gratis.
  if (match.prioritizedAt) return (await approveAsGuest(participation.id, now)) ?? participation;
  return participation;
}

async function createOrReopen(matchId: string, userId: string): Promise<Participation> {
  try {
    return await participationRepository.create(matchId, userId);
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    const already = conflict('ALREADY_JOINED', 'Ya postulaste a este partido');
    const previous = await participationRepository.findOne(matchId, userId);
    if (previous?.status !== 'CANCELLED' && previous?.status !== 'REJECTED') throw already;
    const payment = await paymentRepository.findByParticipation(previous.id);
    if (!canRejoin(payment?.status ?? null)) {
      throw conflict('CANCELLED_PAID_SLOT', 'Cancelaste un cupo ya pagado en este partido y no puedes volver a postular');
    }
    const reopened = await participationRepository.reopen(previous.id);
    if (!reopened) throw already;
    return reopened;
  }
}

/**
 * KAN-41: aprobación automática del invitado de un partido destacado, con el mismo bloqueo de fila
 * que la aprobación manual. Si entre medio se llenó o dejó de estar destacado, queda pendiente.
 */
function approveAsGuest(participationId: string, now: Date): Promise<Participation | null> {
  return participationRepository.inApprovalTransaction(async (tx) => {
    const current = await tx.findParticipation(participationId);
    const match = current && (await tx.lockMatch(current.matchId));
    if (!current || !match?.prioritizedAt) return null;
    const decision = decideApproval(current, match, match.organizerId, now);
    if (!decision.ok) return null;
    const approved = await tx.markApproved(participationId, decision.amountDue);
    await tx.updateSlots(match.id, decision.filledSlots, decision.status);
    return approved;
  });
}

/**
 * KAN-41: el organizador destaca su partido. Se decide con la fila bloqueada: una aprobación o
 * una cancelación simultánea no puede dejarlo destacado con más cupos libres de los permitidos.
 */
export function prioritize(matchId: string, actorId: string, now: Date = new Date()): Promise<{ matchId: string; prioritizedAt: string }> {
  return participationRepository.inApprovalTransaction(async (tx) => {
    const match = await tx.lockMatch(matchId);
    if (!match) throw notFound('MATCH_NOT_FOUND', 'El partido no existe');
    const error = checkCanPrioritize(match, actorId, now);
    if (error) throw error;
    await tx.setPriority(matchId, now);
    return { matchId, prioritizedAt: now.toISOString() };
  });
}

/** HU-05: el organizador aprueba y el cupo pasa a "Confirmado", sin sobreventa. */
export function approve(participationId: string, actorId: string, now: Date = new Date()): Promise<Participation> {
  return participationRepository.inApprovalTransaction(async (tx) => {
    const found = await tx.findParticipation(participationId);
    if (!found) throw notFound('PARTICIPATION_NOT_FOUND', 'La postulación no existe');

    const match = await tx.lockMatch(found.matchId);
    if (!match) throw notFound('MATCH_NOT_FOUND', 'El partido no existe');

    // Se relee después del bloqueo: otra aprobación pudo procesarla mientras esperábamos.
    const current = (await tx.findParticipation(participationId)) ?? found;
    const decision = decideApproval(current, match, actorId, now);
    if (!decision.ok) throw decision.error;

    const approved = await tx.markApproved(participationId, decision.amountDue);
    await tx.updateSlots(match.id, decision.filledSlots, decision.status);
    return approved;
  });
}

/** KAN-32: solo el organizador rechaza, y solo una postulación que sigue pendiente. */
export function decideRejection(
  participation: Pick<Participation, 'status'>,
  match: Pick<LockedMatch, 'organizerId'>,
  actorId: string,
): AppError | null {
  if (match.organizerId !== actorId) return forbidden('Solo el organizador puede rechazar postulaciones');
  if (participation.status !== 'PENDING') {
    return conflict('PARTICIPATION_NOT_PENDING', 'Esta postulación ya fue procesada');
  }
  return null;
}

/**
 * KAN-32: el organizador rechaza una postulación pendiente. Una pendiente no ocupa cupo,
 * así que los cupos no cambian. Usa el mismo bloqueo que approve: aprobar y rechazar la
 * misma postulación a la vez se resuelven en orden, y la segunda recibe 409.
 */
export function reject(participationId: string, actorId: string): Promise<Participation> {
  return participationRepository.inApprovalTransaction(async (tx) => {
    const found = await tx.findParticipation(participationId);
    if (!found) throw notFound('PARTICIPATION_NOT_FOUND', 'La postulación no existe');

    const match = await tx.lockMatch(found.matchId);
    if (!match) throw notFound('MATCH_NOT_FOUND', 'El partido no existe');

    const current = (await tx.findParticipation(participationId)) ?? found;
    const error = decideRejection(current, match, actorId);
    if (error) throw error;

    await tx.markParticipation(participationId, 'REJECTED');
    return { ...current, status: 'REJECTED' as const };
  });
}
