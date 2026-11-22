import type { MatchDetail, ParticipationStatus } from '@/api/types';

export interface PlayerStatus {
  label: string;
  tone: 'success' | 'warning' | 'muted';
  icon: 'check' | 'wallet' | 'clock' | 'user';
}

/**
 * Cómo se rotula el cupo de un jugador en "Mis partidos". `mustPay` es true cuando
 * el partido cobra cuota. Cada estado tiene su propio texto: un cupo cancelado no
 * puede aparecer como "Esperando al organizador".
 */
export function playerStatus(status: ParticipationStatus | null, mustPay: boolean): PlayerStatus {
  switch (status) {
    case 'PAID':
      return { label: 'Confirmado y pagado', tone: 'success', icon: 'check' };
    case 'APPROVED':
      return mustPay
        ? { label: 'Confirmado · falta pagar tu parte', tone: 'warning', icon: 'wallet' }
        : { label: 'Confirmado', tone: 'success', icon: 'check' };
    case 'CANCELLED':
      return { label: 'Ya no tienes cupo en este partido', tone: 'muted', icon: 'user' };
    case 'NO_SHOW':
      return { label: 'No te presentaste', tone: 'muted', icon: 'user' };
    case 'REJECTED':
      return { label: 'El organizador no aceptó tu postulación', tone: 'muted', icon: 'user' };
    default:
      return { label: 'Esperando al organizador', tone: 'warning', icon: 'clock' };
  }
}

/**
 * Cada cuánto se vuelve a pedir el detalle de un partido, o false si no hace falta.
 * Es lo que hace que el jugador vea su aprobación y el
 * organizador las postulaciones nuevas sin salir de la pantalla; los avisos (HU-10) llegan a la bandeja.
 */
export function matchPollInterval(m: Pick<MatchDetail, 'ratingWindow' | 'viewer'> | undefined): number | false {
  if (!m || m.ratingWindow !== 'NOT_FINISHED') return false;
  const waiting = m.viewer.isOrganizer || m.viewer.status === 'PENDING' || m.viewer.status === 'APPROVED';
  return waiting ? 8_000 : false;
}
