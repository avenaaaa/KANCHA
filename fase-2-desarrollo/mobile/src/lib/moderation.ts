import type { ReportReason, ReportStatus, User } from '@/api/types';
import { formatDeadline } from '@/lib/format';

/** HU-11: motivos de reporte, en el orden en que se ofrecen. */
export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'AGRESION', label: 'Agresión' },
  { value: 'LENGUAJE', label: 'Lenguaje ofensivo' },
  { value: 'JUEGO_SUCIO', label: 'Juego sucio' },
  { value: 'OTRO', label: 'Otro' },
];

export const reasonLabel = (r: ReportReason): string => REPORT_REASONS.find((x) => x.value === r)?.label ?? r;

export const STATUS_LABEL: Record<ReportStatus, string> = {
  PENDING: 'Pendiente',
  SANCTIONED: 'Suspendido 7 días',
  DISMISSED: 'Descartado',
};

/** La suspensión la decide la API; la app solo la muestra mientras dure. */
export function suspendedUntil(user: Pick<User, 'suspendedUntil'>, now: Date = new Date()): Date | null {
  if (!user.suspendedUntil) return null;
  const until = new Date(user.suspendedUntil);
  return until.getTime() > now.getTime() ? until : null;
}

/** "Hasta el sáb 29 nov a las 19:30 no puedes publicar, postular ni destacar partidos." */
export const suspensionText = (until: Date, now: Date = new Date()): string =>
  `Hasta ${formatDeadline(until, now)} no puedes publicar, postular ni destacar partidos.`;
