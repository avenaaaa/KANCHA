import { env } from '../config/env.js';
import { ratingRepository, type AttendanceRow, type RatingTx } from '../repositories/rating.repository.js';
import { AppError, conflict, forbidden, notFound, unprocessable } from '../utils/errors.js';
import { isUniqueViolation, toNumberOrNull } from '../utils/db-errors.js';

/**
 * Sistema de Honor (HU-06, HU-07).
 *
 * Las funciones de cálculo son puras a propósito: se prueban sin base de datos
 * ni HTTP, que es lo que hace viable la cobertura exigida por la competencia C1.
 */

export interface RatingSample {
  punctuality: number; // 1..5
  conduct: number; // 1..5
}

export interface AttendanceSample {
  attended: number; // participaciones cerradas como PAID
  noShow: number; // participaciones cerradas como NO_SHOW
}

export interface HonorBreakdown {
  /** 0–100. Null si no hay participaciones cerradas. */
  attendanceRate: number | null;
  /** 0–100. Null si no hay reseñas. */
  punctualityRate: number | null;
  /** 0–100. Null si no hay reseñas. */
  fairPlayRate: number | null;
  /** 0.0–10.0. Null si no hay ninguna señal todavía: "Sin calificaciones aún". */
  honorScore: number | null;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;
const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Convierte una nota 1–5 a porcentaje 0–100. Un 1 es 0%, un 5 es 100%. */
const fiveToPercent = (value: number): number => ((value - 1) / 4) * 100;

/**
 * Recalcula la reputación completa de un usuario.
 *
 * Toma como máximo las últimas HONOR_SAMPLE_SIZE reseñas (las más recientes
 * primero) para que el historial antiguo no congele el puntaje de alguien que
 * cambió de comportamiento.
 */
export function calculateHonor(
  ratings: readonly RatingSample[],
  attendance: AttendanceSample,
): HonorBreakdown {
  const sample = ratings.slice(0, env.HONOR_SAMPLE_SIZE);

  const punctualityRate =
    sample.length === 0
      ? null
      : round2(sample.reduce((acc, r) => acc + fiveToPercent(r.punctuality), 0) / sample.length);

  const fairPlayRate =
    sample.length === 0
      ? null
      : round2(sample.reduce((acc, r) => acc + fiveToPercent(r.conduct), 0) / sample.length);

  const closed = attendance.attended + attendance.noShow;
  const attendanceRate = closed === 0 ? null : round2((attendance.attended / closed) * 100);

  const signals = [attendanceRate, punctualityRate, fairPlayRate].filter(
    (v): v is number => v !== null,
  );

  // Sin ninguna señal el puntaje es null, nunca 0: un jugador nuevo no es un mal jugador.
  const honorScore =
    signals.length === 0
      ? null
      : round1((signals.reduce((acc, v) => acc + v, 0) / signals.length) / 10);

  return { attendanceRate, punctualityRate, fairPlayRate, honorScore };
}

export type RatingWindow = 'NOT_FINISHED' | 'OPEN' | 'CLOSED';

/**
 * Ventana de calificación (HU-06): abre cuando TERMINA el partido y dura 48 h.
 * Pasado el plazo el partido se archiva y deja de admitir reseñas.
 */
export function ratingWindow(startsAt: Date, durationMin: number, now: Date = new Date()): RatingWindow {
  const endsAt = new Date(startsAt).getTime() + durationMin * 60_000;
  if (now.getTime() < endsAt) return 'NOT_FINISHED';
  return now.getTime() <= endsAt + env.RATING_WINDOW_HOURS * 3_600_000 ? 'OPEN' : 'CLOSED';
}

export function isRatingWindowOpen(startsAt: Date, durationMin: number, now: Date = new Date()): boolean {
  return ratingWindow(startsAt, durationMin, now) === 'OPEN';
}

export type RatingBlock =
  | 'NOT_IN_MATCH'
  | 'SELF_RATING'
  | 'RATED_NOT_IN_MATCH'
  | 'MATCH_NOT_FINISHED'
  | 'RATING_WINDOW_CLOSED';

/**
 * HU-06: ¿puede `raterId` calificar a `ratedId`? Ambos deben haber jugado el
 * partido (organizador o participación confirmada) y la ventana debe estar abierta.
 */
export function checkCanRate(
  roster: ReadonlySet<string>,
  raterId: string,
  ratedId: string,
  window: RatingWindow,
): RatingBlock | null {
  if (!roster.has(raterId)) return 'NOT_IN_MATCH';
  if (raterId === ratedId) return 'SELF_RATING';
  if (!roster.has(ratedId)) return 'RATED_NOT_IN_MATCH';
  if (window === 'NOT_FINISHED') return 'MATCH_NOT_FINISHED';
  if (window === 'CLOSED') return 'RATING_WINDOW_CLOSED';
  return null;
}

const RATING_ERRORS: Record<RatingBlock, () => AppError> = {
  NOT_IN_MATCH: () => forbidden('Solo los jugadores del partido pueden calificar'),
  SELF_RATING: () => unprocessable('SELF_RATING', 'No puedes calificarte a ti mismo'),
  RATED_NOT_IN_MATCH: () => unprocessable('RATED_NOT_IN_MATCH', 'Ese jugador no jugó este partido'),
  MATCH_NOT_FINISHED: () => conflict('MATCH_NOT_FINISHED', 'Podrás calificar cuando termine el partido'),
  RATING_WINDOW_CLOSED: () => conflict('RATING_WINDOW_CLOSED', 'Pasaron las 48 h para calificar este partido'),
};

/** Carga el partido y, si venció la ventana, lo archiva (HU-06: "el partido se archiva sin calificación"). */
async function loadRoster(matchId: string, now: Date) {
  const roster = await ratingRepository.findRoster(matchId);
  if (!roster) throw notFound('MATCH_NOT_FOUND', 'El partido no existe');
  const window = ratingWindow(roster.startsAt, roster.durationMin, now);
  if (window === 'CLOSED' && roster.status !== 'ARCHIVED') await ratingRepository.archive(matchId);
  return { roster, window, memberIds: new Set(roster.members.map((m) => m.id)) };
}

/**
 * HU-06 + HU-07: guarda la reseña y recalcula el honor del calificado en la misma
 * transacción, con su fila bloqueada para que dos reseñas simultáneas no se pisen.
 * La doble calificación la impide UNIQUE (matchId, raterId, ratedId) en la base.
 */
export async function rateTeammate(
  matchId: string,
  raterId: string,
  input: { ratedId: string; punctuality: number; conduct: number },
  now: Date = new Date(),
): Promise<HonorBreakdown> {
  const { window, memberIds } = await loadRoster(matchId, now);
  const block = checkCanRate(memberIds, raterId, input.ratedId, window);
  if (block) throw RATING_ERRORS[block]();

  try {
    return await ratingRepository.inRatingTransaction(async (tx) => {
      await tx.lockUser(input.ratedId);
      await tx.insertRating({ matchId, raterId, ...input });
      return recalculate(tx, input.ratedId);
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw conflict('ALREADY_RATED', 'Ya calificaste a este jugador en este partido');
    throw err;
  }
}

/** HU-07: recalcula y guarda el honor dentro de la transacción, con la fila del usuario ya bloqueada. */
async function recalculate(tx: RatingTx, userId: string): Promise<HonorBreakdown> {
  const honor = calculateHonor(await tx.lastRatings(userId, env.HONOR_SAMPLE_SIZE), await tx.attendance(userId));
  await tx.updateHonor(userId, honor);
  return honor;
}

export type AttendanceBlock = 'NOT_ORGANIZER' | 'NOT_CONFIRMED' | 'MATCH_NOT_FINISHED' | 'ALREADY_CLOSED';

/**
 * KAN-30: solo el organizador cierra la asistencia, una vez por confirmado y
 * cuando el partido ya terminó.
 */
export function checkCanCloseAttendance(p: AttendanceRow, actorId: string, now: Date = new Date()): AttendanceBlock | null {
  if (p.match.organizerId !== actorId) return 'NOT_ORGANIZER';
  if (p.attended !== null) return 'ALREADY_CLOSED';
  if (p.status !== 'APPROVED' && p.status !== 'PAID') return 'NOT_CONFIRMED';
  if (ratingWindow(p.match.startsAt, p.match.durationMin, now) === 'NOT_FINISHED') return 'MATCH_NOT_FINISHED';
  return null;
}

const ATTENDANCE_ERRORS: Record<AttendanceBlock, () => AppError> = {
  NOT_ORGANIZER: () => forbidden('Solo el organizador registra la asistencia'),
  NOT_CONFIRMED: () => conflict('NOT_CONFIRMED', 'Ese jugador no tenía el cupo confirmado'),
  MATCH_NOT_FINISHED: () => conflict('MATCH_NOT_FINISHED', 'Podrás registrar la asistencia cuando termine el partido'),
  ALREADY_CLOSED: () => conflict('ATTENDANCE_ALREADY_SET', 'La asistencia de este jugador ya está registrada'),
};

/**
 * KAN-30: "asistió" suma un partido jugado; "no se presentó" deja la participación
 * en NO_SHOW. En ambos casos cambia la tasa de asistencia, así que el honor se recalcula.
 */
export async function recordAttendance(
  participationId: string,
  actorId: string,
  attended: boolean,
  now: Date = new Date(),
): Promise<{ participationId: string; attended: boolean; honor: HonorBreakdown }> {
  const p = await ratingRepository.findForAttendance(participationId);
  if (!p) throw notFound('PARTICIPATION_NOT_FOUND', 'La participación no existe');
  const block = checkCanCloseAttendance(p, actorId, now);
  if (block) throw ATTENDANCE_ERRORS[block]();

  const honor = await ratingRepository.inRatingTransaction(async (tx) => {
    await tx.lockUser(p.userId);
    if (!(await tx.closeAttendance(participationId, attended))) throw ATTENDANCE_ERRORS.ALREADY_CLOSED();
    if (attended) await tx.addMatchPlayed(p.userId);
    return recalculate(tx, p.userId);
  });
  return { participationId, attended, honor };
}

/** HU-06: compañeros que el jugador aún no califica en este partido. */
export async function pendingRatings(matchId: string, raterId: string, now: Date = new Date()) {
  const { roster, window, memberIds } = await loadRoster(matchId, now);
  if (!memberIds.has(raterId)) throw RATING_ERRORS.NOT_IN_MATCH();
  const done = new Set(await ratingRepository.ratedBy(matchId, raterId));
  const closesAt = new Date(
    new Date(roster.startsAt).getTime() + roster.durationMin * 60_000 + env.RATING_WINDOW_HOURS * 3_600_000,
  );
  return {
    window,
    closesAt: closesAt.toISOString(),
    pending: roster.members
      .filter((m) => m.id !== raterId && !done.has(m.id))
      .map((m) => ({ userId: m.id, name: m.name, honorScore: toNumberOrNull(m.honorScore) })),
  };
}
