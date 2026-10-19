import {
  matchRepository,
  type MatchRow,
  type MyMatchRow,
  type NearbyMatchRow,
} from '../repositories/match.repository.js';
import { participationRepository } from '../repositories/participation.repository.js';
import type { CreateMatchInput } from '../schemas/match.schema.js';
import { notFound, unprocessable } from '../utils/errors.js';
import { toNumberOrNull } from '../utils/db-errors.js';
import { calculateAmountDue, calculateCommission } from './payment.service.js';

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
  organizer: { id: string; name: string; honorScore: number | null };
  distanceM?: number;
}

export interface ParticipantView {
  participationId: string;
  status: string;
  user: { id: string; name: string; favoriteSport: string; honorScore: number | null; matchesPlayed: number };
}

export interface MatchDetail extends MatchSummary {
  /** Comisión de Kancha (10 %), que se cobra encima de la cuota del jugador. */
  serviceFee: number;
  viewer: { isOrganizer: boolean; participationId: string | null; status: string | null };
  participants: ParticipantView[];
}

export interface MyMatch extends MatchSummary {
  role: 'ORGANIZER' | 'PLAYER';
  myStatus: string | null;
  pendingCount: number;
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
  return getDetail(id, organizerId);
}

export async function getDetail(id: string, viewerId: string): Promise<MatchDetail> {
  const row = await matchRepository.findById(id);
  if (!row) throw notFound('MATCH_NOT_FOUND', 'El partido no existe');

  const summary = toMatchSummary(row);
  const isOrganizer = row.organizerId === viewerId;
  const all = await participationRepository.findByMatch(id);
  const mine = all.find((p) => p.user.id === viewerId) ?? null;

  // Las postulaciones pendientes solo las ve el organizador (y cada jugador la suya).
  const visible = all.filter((p) => isOrganizer || p.status !== 'PENDING' || p.user.id === viewerId);

  return {
    ...summary,
    serviceFee: calculateCommission(summary.pricePerPlayer),
    viewer: { isOrganizer, participationId: mine?.id ?? null, status: mine?.status ?? null },
    participants: visible.map((p) => ({
      participationId: p.id,
      status: p.status,
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
  }));
}
