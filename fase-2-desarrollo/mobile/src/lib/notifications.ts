import type { AppNotification, NotificationKind } from '@/api/types';
import type { IconName } from '@/components/icons/paths';

/** HU-10: lo que la pantalla de avisos necesita y no es dibujo. */

/** El "Falta uno" vigente que se destaca sobre el mapa, o null. La API decide cuáles lo son y los deja primero. */
export function firstUrgent(list: AppNotification[] | undefined): AppNotification | null {
  return list?.find((n) => n.urgent && n.matchId !== null) ?? null;
}

/** "ahora", "hace 5 min", "hace 2 h", "ayer", "hace 3 días". */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const min = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}

/** La semana empieza el lunes en Chile; la API usa 0 = domingo. */
export const WEEK_DAYS = [
  { day: 1, label: 'Lun' },
  { day: 2, label: 'Mar' },
  { day: 3, label: 'Mié' },
  { day: 4, label: 'Jue' },
  { day: 5, label: 'Vie' },
  { day: 6, label: 'Sáb' },
  { day: 0, label: 'Dom' },
] as const;

export const toggleIn = <T,>(list: T[], item: T): T[] => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

export const hourLabel = (h: number): string => `${String(h).padStart(2, '0')}:00`;

export const KIND_ICON: Record<NotificationKind, IconName> = {
  FALTA_UNO: 'clock',
  NEARBY_MATCH: 'pin',
  JOIN_REQUEST: 'user',
  JOIN_APPROVED: 'check',
  PRIORITY_OFFER: 'up',
  NUDGE: 'calendar',
};
