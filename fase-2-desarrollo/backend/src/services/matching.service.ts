import type { Participation } from '@prisma/client';
import { matchRepository } from '../repositories/match.repository.js';
import {
  participationRepository,
  type LockedMatch,
} from '../repositories/participation.repository.js';
import { AppError, conflict, forbidden, notFound } from '../utils/errors.js';
import { isUniqueViolation } from '../utils/db-errors.js';
import { calculateAmountDue } from './payment.service.js';
import { toMatchSummary, type MatchSummary } from './match.service.js';
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
    amountDue: calculateAmountDue(match.totalCost, match.totalSlots),
  };
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
    to: q.to ?? null,
    now,
  });
  return rows.map(toMatchSummary);
}

/** HU-05: "WHEN presiono Unirme THEN mi postulación queda registrada como Pendiente". */
export async function join(matchId: string, userId: string, now: Date = new Date()): Promise<Participation> {
  const match = await matchRepository.findById(matchId);
  if (!match) throw notFound('MATCH_NOT_FOUND', 'El partido no existe');

  const block = checkCanJoin(match, userId, now);
  if (block) throw conflict(block, JOIN_MESSAGES[block]);

  try {
    return await participationRepository.create(matchId, userId);
  } catch (err) {
    if (isUniqueViolation(err)) throw conflict('ALREADY_JOINED', 'Ya postulaste a este partido');
    throw err;
  }
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
