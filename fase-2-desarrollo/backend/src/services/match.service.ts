import {
  matchRepository,
  type MatchRow,
  type MyMatchRow,
  type NearbyMatchRow,
} from '../repositories/match.repository.js';
import { participationRepository } from '../repositories/participation.repository.js';
import { paymentRepository } from '../repositories/payment.repository.js';
import type { CreateMatchInput } from '../schemas/match.schema.js';
import { env } from '../config/env.js';
import { AppError, conflict, forbidden, notFound, unprocessable } from '../utils/errors.js';
import { toNumberOrNull } from '../utils/db-errors.js';
import { ratingWindow, type RatingWindow } from './honor.service.js';
import { onMatchPublished } from './notification.service.js';
import {
  calculateAmountDue,
  calculateCommission,
  calculateRefund,
  guestShare,
  type RefundBreakdown,
} from './payment.service.js';

/**
 * Publicación (HU-03, KAN-9), detalle y "Mis partidos".
 * La búsqueda por radio (HU-04) vive en matching.service, como define la
 * arquitectura (03-arquitectura.md §1.1).
 */

export interface MatchSummary {
  id: string;
  title: string;
  sport: MatchRow['sport'];
  level: MatchRow['level'];
  venueName: string;
  address: string;
  lat: number;
  lng: number;
  startsAt: string;
  durationMin: number;
  totalSlots: number;
  filledSlots: number;
  slotsLeft: number;
  totalCost: number;
  /** Cuota individual: ceil(totalCost / totalSlots). */
  pricePerPlayer: number;
  status: string;
  /** "Falta uno" destacado que rige ahora (isPriorityActive): quien se une entra gratis (KAN-41, KAN-44). */
  priority: boolean;
  organizer: { id: string; name: string; honorScore: number | null };
  distanceM?: number;
}

export interface ParticipantView {
  participationId: string;
  status: string;
  /** Asistencia cerrada por el organizador (KAN-30): null mientras no se registre. */
  attended: boolean | null;
  user: { id: string; name: string; favoriteSport: string; honorScore: number | null; matchesPlayed: number };
}

export interface MatchDetail extends MatchSummary {
  /** Comisión de Kancha (10 %), que se cobra encima de la cuota del jugador. */
  serviceFee: number;
  /** Ventana de 48 h para calificar tras el partido (HU-06). */
  ratingWindow: RatingWindow;
  viewer: {
    isOrganizer: boolean;
    participationId: string | null;
    status: string | null;
    /** Último intento de pago del jugador (HU-08): el comprobante si quedó AUTHORIZED. */
    payment: { status: string; amount: number; retained: number; buyOrder: string; authorizedAt: string | null } | null;
    /** Si el cupo está pagado: qué se devolvería al cancelar ahora (HU-09). */
    refundIfCancelled: RefundBreakdown | null;
    /** Cuota congelada al aprobar; 0 si entró gratis como invitado (KAN-41). null si no tiene cupo. */
    amountDue: number | null;
  };
  /** KAN-41: si el organizador puede destacarlo ahora, y la cuota del invitado que cubre el grupo. */
  priorityOffer: { canActivate: boolean; guestShare: number; perPlayer: number };
  participants: ParticipantView[];
}

export interface MyMatch extends MatchSummary {
  role: 'ORGANIZER' | 'PLAYER';
  myStatus: string | null;
  pendingCount: number;
  ratingWindow: RatingWindow;
  /** Cuota congelada de mi cupo (0 si entré como invitado, KAN-41). */
  myAmountDue: number;
  /** KAN-41: el organizador puede destacarlo ahora. */
  canPrioritize: boolean;
}

/**
 * Faltan a lo más estos jugadores para poder destacar un partido. KAN-44: solo 1; si faltan más, quienes
 * entran pagan su parte como siempre.
 */
export const MAX_PRIORITY_SLOTS = 1;

/**
 * KAN-44: un destacado da entrada gratis solo mientras falte 1. Si una cancelación deja 2 libres,
 * quien entra paga su parte; cuando vuelve a faltar 1, el destacado vuelve a regir.
 */
export function isPriorityActive(m: { prioritizedAt: Date | null; totalSlots: number; filledSlots: number }): boolean {
  const left = Number(m.totalSlots) - Number(m.filledSlots);
  return m.prioritizedAt != null && left >= 1 && left <= MAX_PRIORITY_SLOTS;
}

/**
 * KAN-41: ¿puede el organizador destacar su partido ahora? Solo si le falta 1 jugador, empieza dentro de
 * la ventana de urgencia (URGENT_WINDOW_HOURS) y no está destacado. Devuelve el motivo si no.
 */
export function checkCanPrioritize(
  match: { organizerId: string; status: string; startsAt: Date; totalSlots: number; filledSlots: number; prioritizedAt: Date | null },
  actorId: string,
  now: Date = new Date(),
): AppError | null {
  if (match.organizerId !== actorId) return forbidden('Solo el organizador puede destacar su partido');
  if (match.prioritizedAt) return conflict('ALREADY_PRIORITY', 'El partido ya está destacado');
  const untilStart = new Date(match.startsAt).getTime() - now.getTime();
  if (untilStart <= 0) return conflict('MATCH_STARTED', 'El partido ya comenzó');
  if (match.status !== 'OPEN') return conflict('MATCH_NOT_OPEN', 'El partido ya no recibe postulaciones');
  const left = match.totalSlots - match.filledSlots;
  if (left < 1 || left > MAX_PRIORITY_SLOTS) {
    return conflict('PRIORITY_NOT_AVAILABLE', 'Solo se destaca un partido al que le falta 1 jugador: si faltan más, quienes entren pagan su parte');
  }
  if (untilStart > env.URGENT_WINDOW_HOURS * 3_600_000) {
    return conflict('PRIORITY_TOO_EARLY', `Se puede destacar desde ${env.URGENT_WINDOW_HOURS} horas antes del partido`);
  }
  return null;
}

/** HU-03: "GIVEN que el horario ingresado ya pasó WHEN intento publicar THEN se rechaza". */
export function assertFutureStart(startsAt: Date, now: Date = new Date()): void {
  if (startsAt.getTime() <= now.getTime()) {
    throw unprocessable('MATCH_IN_PAST', 'La fecha y hora del partido ya pasaron', {
      startsAt: ['Elige un horario futuro'],
    });
  }
}

export function toMatchSummary(row: MatchRow | NearbyMatchRow): MatchSummary {
  return {
    id: row.id,
    title: row.title,
    sport: row.sport,
    level: row.level,
    venueName: row.venueName,
    address: row.address,
    lat: Number(row.lat),
    lng: Number(row.lng),
    startsAt: new Date(row.startsAt).toISOString(),
    durationMin: Number(row.durationMin),
    totalSlots: Number(row.totalSlots),
    filledSlots: Number(row.filledSlots),
    slotsLeft: Math.max(0, Number(row.totalSlots) - Number(row.filledSlots)),
    totalCost: Number(row.totalCost),
    pricePerPlayer: calculateAmountDue(Number(row.totalCost), Number(row.totalSlots)),
    status: row.status,
    priority: isPriorityActive(row),
    organizer: {
      id: row.organizerId,
      name: row.organizerName,
      honorScore: toNumberOrNull(row.organizerHonor),
    },
    ...('distanceM' in row ? { distanceM: Number(row.distanceM) } : {}),
  };
}

export async function publish(
  organizerId: string,
  input: CreateMatchInput,
  now: Date = new Date(),
): Promise<MatchDetail> {
  assertFutureStart(input.startsAt, now);
  const id = await matchRepository.insert({ organizerId, ...input });
  const detail = await getDetail(id, organizerId);
  await onMatchPublished(detail, now); // HU-10: avisa a quienes aceptan partidos cerca
  return detail;
}

export async function getDetail(id: string, viewerId: string): Promise<MatchDetail> {
  const row = await matchRepository.findById(id);
  if (!row) throw notFound('MATCH_NOT_FOUND', 'El partido no existe');

  const summary = toMatchSummary(row);
  const isOrganizer = row.organizerId === viewerId;
  const all = await participationRepository.findByMatch(id);
  // Se busca aparte porque `all` omite las canceladas, y el jugador debe saber que perdió el cupo.
  const mine = await participationRepository.findOne(id, viewerId);
  const payment = mine ? await paymentRepository.findByParticipation(mine.id) : null;

  // Las postulaciones pendientes solo las ve el organizador (y cada jugador la suya).
  const visible = all.filter((p) => isOrganizer || p.status !== 'PENDING' || p.user.id === viewerId);

  return {
    ...summary,
    serviceFee: calculateCommission(summary.pricePerPlayer),
    ratingWindow: ratingWindow(new Date(summary.startsAt), summary.durationMin),
    viewer: {
      isOrganizer,
      participationId: mine?.id ?? null,
      status: mine?.status ?? null,
      payment: payment && {
        status: payment.status,
        amount: payment.amount,
        retained: payment.retained,
        buyOrder: payment.buyOrder,
        authorizedAt: payment.authorizedAt?.toISOString() ?? null,
      },
      refundIfCancelled:
        mine?.status === 'PAID' && payment ? calculateRefund(payment.amount, new Date(summary.startsAt)) : null,
      amountDue: mine && (mine.status === 'APPROVED' || mine.status === 'PAID') ? mine.amountDue : null,
    },
    priorityOffer: {
      canActivate: isOrganizer && checkCanPrioritize(toPriorityInput(row), viewerId) === null,
      ...renameShare(guestShare(summary.totalCost, summary.totalSlots, summary.filledSlots)),
    },
    participants: visible.map((p) => ({
      participationId: p.id,
      status: p.status,
      attended: p.attended,
      user: {
        id: p.user.id,
        name: p.user.name,
        favoriteSport: p.user.favoriteSport,
        honorScore: toNumberOrNull(p.user.honorScore),
        matchesPlayed: p.user.matchesPlayed,
      },
    })),
  };
}

export async function listForUser(userId: string): Promise<MyMatch[]> {
  const rows: MyMatchRow[] = await matchRepository.findByUser(userId);
  return rows.map((r) => ({
    ...toMatchSummary(r),
    role: r.organizerId === userId ? 'ORGANIZER' : 'PLAYER',
    myStatus: r.myStatus,
    pendingCount: r.organizerId === userId ? Number(r.pendingCount) : 0,
    ratingWindow: ratingWindow(new Date(r.startsAt), Number(r.durationMin)),
    myAmountDue: Number(r.myAmountDue ?? 0),
    canPrioritize: r.organizerId === userId && checkCanPrioritize(toPriorityInput(r), userId) === null,
  }));
}

function toPriorityInput(r: MatchRow) {
  return {
    organizerId: r.organizerId,
    status: r.status,
    startsAt: new Date(r.startsAt),
    totalSlots: Number(r.totalSlots),
    filledSlots: Number(r.filledSlots),
    prioritizedAt: r.prioritizedAt,
  };
}

const renameShare = ({ amount, perPlayer }: { amount: number; perPlayer: number }) => ({ guestShare: amount, perPlayer });
