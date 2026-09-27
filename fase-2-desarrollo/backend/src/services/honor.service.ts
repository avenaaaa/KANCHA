import { env } from '../config/env.js';

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

/**
 * Ventana de calificación (HU-06): 48 h desde que TERMINA el partido.
 * Pasado el plazo el partido se archiva y deja de admitir reseñas.
 */
export function isRatingWindowOpen(
  startsAt: Date,
  durationMin: number,
  now: Date = new Date(),
): boolean {
  const endsAt = startsAt.getTime() + durationMin * 60_000;
  if (now.getTime() < endsAt) return false; // el partido aún no termina
  return now.getTime() <= endsAt + env.RATING_WINDOW_HOURS * 3_600_000;
}
