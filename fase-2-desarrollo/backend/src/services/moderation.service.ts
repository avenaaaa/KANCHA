import type { ReportStatus } from '@prisma/client';
import { logger } from '../config/logger.js';
import { ratingRepository } from '../repositories/rating.repository.js';
import { reportRepository, type ReportRow } from '../repositories/report.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import type { CreateReportInput, ResolveReportInput } from '../schemas/moderation.schema.js';
import { AppError, conflict, forbidden, notFound, unprocessable } from '../utils/errors.js';
import { isUniqueViolation, toNumberOrNull } from '../utils/db-errors.js';
import { chileDateTime, onSanctioned } from './notification.service.js';

/**
 * Moderación (HU-11, KAN-17). Un jugador reporta la conducta de un compañero de partido; un
 * administrador revisa el detalle y el historial y suspende 7 días o descarta.
 *
 * Las reglas son funciones puras (checkCanReport, isSuspended, suspensionEnd) para probarlas sin
 * base de datos. Las funciones async solo las orquestan con los repositorios.
 */

export const SUSPENSION_DAYS = 7;
const DAY_MS = 86_400_000;

// ------------------------------------------------------------------ reportar

export type ReportBlock = 'NOT_IN_MATCH' | 'SELF_REPORT' | 'REPORTED_NOT_IN_MATCH' | 'MATCH_NOT_STARTED';

/** Solo se reporta a alguien con quien se jugó: el organizador o un confirmado, y desde que el partido empezó. */
export function checkCanReport(
  roster: { startsAt: Date; memberIds: ReadonlySet<string> },
  reporterId: string,
  reportedId: string,
  now: Date = new Date(),
): ReportBlock | null {
  if (!roster.memberIds.has(reporterId)) return 'NOT_IN_MATCH';
  if (reporterId === reportedId) return 'SELF_REPORT';
  if (!roster.memberIds.has(reportedId)) return 'REPORTED_NOT_IN_MATCH';
  if (new Date(roster.startsAt).getTime() > now.getTime()) return 'MATCH_NOT_STARTED';
  return null;
}

const REPORT_ERRORS: Record<ReportBlock, () => AppError> = {
  NOT_IN_MATCH: () => forbidden('Solo los jugadores del partido pueden reportar'),
  SELF_REPORT: () => unprocessable('SELF_REPORT', 'No puedes reportarte a ti mismo'),
  REPORTED_NOT_IN_MATCH: () => unprocessable('REPORTED_NOT_IN_MATCH', 'Ese jugador no jugó este partido'),
  MATCH_NOT_STARTED: () => conflict('MATCH_NOT_STARTED', 'Podrás reportar cuando el partido haya empezado'),
};

/** HU-11: "GIVEN que un usuario reporta a otro por conducta indebida". Uno por compañero y partido (UNIQUE). */
export async function reportTeammate(matchId: string, reporterId: string, input: CreateReportInput, now: Date = new Date()) {
  const roster = await ratingRepository.findRoster(matchId);
  if (!roster) throw notFound('MATCH_NOT_FOUND', 'El partido no existe');
  const memberIds = new Set(roster.members.map((m) => m.id));
  const block = checkCanReport({ startsAt: roster.startsAt, memberIds }, reporterId, input.reportedId, now);
  if (block) throw REPORT_ERRORS[block]();

  try {
    const report = await reportRepository.create({
      matchId,
      reporterId,
      reportedId: input.reportedId,
      reason: input.reason,
      comment: input.comment || null,
    });
    return { id: report.id, status: report.status };
  } catch (err) {
    if (isUniqueViolation(err)) throw conflict('ALREADY_REPORTED', 'Ya reportaste a este jugador en este partido');
    throw err;
  }
}

// ------------------------------------------------------------------ suspensión

export function isSuspended(suspendedUntil: Date | null, now: Date = new Date()): boolean {
  return suspendedUntil !== null && suspendedUntil.getTime() > now.getTime();
}

/** Cada sanción suma 7 días: a los que quedaban, o desde ahora si no estaba suspendido. */
export function suspensionEnd(current: Date | null, now: Date = new Date()): Date {
  const from = current && isSuspended(current, now) ? current.getTime() : now.getTime();
  return new Date(from + SUSPENSION_DAYS * DAY_MS);
}

/** Suspendido no publica, no postula ni destaca (lo exige requireActiveAccount en esas rutas). */
export async function assertCanAct(userId: string, now: Date = new Date()): Promise<void> {
  const until = (await userRepository.findById(userId))?.suspendedUntil ?? null;
  if (until && isSuspended(until, now)) {
    throw new AppError(
      403,
      'ACCOUNT_SUSPENDED',
      `Tu cuenta está suspendida hasta el ${chileDateTime(until)}: no puedes publicar, postular ni destacar partidos.`,
    );
  }
}

// ------------------------------------------------------------------ panel del administrador

async function assertAdmin(userId: string): Promise<void> {
  const user = await userRepository.findById(userId);
  if (user?.role !== 'ADMIN') throw forbidden('Solo un administrador puede moderar reportes');
}

function toReportView(r: ReportRow) {
  return {
    id: r.id,
    reason: r.reason,
    comment: r.comment,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    match: { id: r.match.id, title: r.match.title, sport: r.match.sport, startsAt: r.match.startsAt.toISOString() },
    reporter: r.reporter,
    reported: {
      id: r.reported.id,
      name: r.reported.name,
      honorScore: toNumberOrNull(r.reported.honorScore),
      matchesPlayed: r.reported.matchesPlayed,
      suspendedUntil: r.reported.suspendedUntil?.toISOString() ?? null,
    },
    resolution: r.resolvedAt ? { by: r.resolvedBy, at: r.resolvedAt.toISOString(), note: r.resolutionNote } : null,
  };
}

export async function listReports(adminId: string, status: ReportStatus) {
  await assertAdmin(adminId);
  const [rows, pending] = await Promise.all([reportRepository.list(status), reportRepository.countPending()]);
  return { reports: rows.map(toReportView), pending };
}

/** HU-11: "el administrador abre el panel de reportes THEN puede ver el detalle, historial...". */
export async function getReport(adminId: string, reportId: string) {
  await assertAdmin(adminId);
  const report = await reportRepository.findById(reportId);
  if (!report) throw notFound('REPORT_NOT_FOUND', 'El reporte no existe');
  const history = await reportRepository.historyOf(report.reportedId, report.id);
  return { ...toReportView(report), history: history.map(toReportView) };
}

/**
 * HU-11: "...y aplicar sanción o descartar". La resolución (quién, cuándo, nota) queda en el reporte,
 * que es el registro de la moderación, y en el log de la API. El sancionado recibe un aviso.
 */
export async function resolveReport(adminId: string, reportId: string, input: ResolveReportInput, now: Date = new Date()) {
  await assertAdmin(adminId);
  const report = await reportRepository.findById(reportId);
  if (!report) throw notFound('REPORT_NOT_FOUND', 'El reporte no existe');
  const alreadyResolved = () => conflict('REPORT_ALREADY_RESOLVED', 'Este reporte ya fue resuelto');
  if (report.status !== 'PENDING') throw alreadyResolved();

  const sanction = input.action === 'SANCTION';
  const result = await reportRepository.inResolution(async (tx) => {
    const current = sanction ? await tx.lockReported(report.reportedId) : null;
    const resolved = await tx.markResolved(reportId, {
      status: sanction ? 'SANCTIONED' : 'DISMISSED',
      resolvedById: adminId,
      resolvedAt: now,
      resolutionNote: input.note || null,
    });
    if (!resolved) return null; // otro administrador lo resolvió entre medio
    if (!sanction) return { status: 'DISMISSED' as const, suspendedUntil: null };
    const until = suspensionEnd(current, now);
    await tx.suspend(report.reportedId, until);
    return { status: 'SANCTIONED' as const, suspendedUntil: until };
  });
  if (!result) throw alreadyResolved();

  logger.info(
    { event: 'moderation', reportId, adminId, reportedId: report.reportedId, status: result.status, suspendedUntil: result.suspendedUntil },
    'Reporte resuelto',
  );
  if (result.suspendedUntil) {
    await onSanctioned(
      { userId: report.reportedId, reason: report.reason, matchTitle: report.match.title, until: result.suspendedUntil },
      now,
    );
  }
  return { id: reportId, status: result.status, suspendedUntil: result.suspendedUntil?.toISOString() ?? null };
}
