/**
 * Formatos para la interfaz. Se escriben a mano (sin Intl) porque Hermes en
 * Android no trae todos los locales y la app debe verse igual en web y móvil.
 */

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'] as const;
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;

/** 24000 → "$24.000". 0 → "Gratis". */
export function formatCLP(amount: number): string {
  if (amount === 0) return 'Gratis';
  return '$' + Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** 1397 → "1,4 km". 640 → "640 m". */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

const pad = (n: number) => n.toString().padStart(2, '0');
export const formatTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "Hoy", "Mañana" o "sáb 18 oct". */
export function formatDay(d: Date, now: Date = new Date()): string {
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (sameDay(d, now)) return 'Hoy';
  if (sameDay(d, tomorrow)) return 'Mañana';
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
}

/** "Hoy 20:00", "Mañana 18:30", "sáb 18 oct 20:00". */
export function formatWhen(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  return `${formatDay(d, now)} ${formatTime(d)}`;
}

/** El texto del CTA cambia con el partido (DESIGN.md §4.3): "Falta 1", "Faltan 3". */
export function slotsCta(slotsLeft: number): string {
  if (slotsLeft <= 0) return 'Partido completo';
  return slotsLeft === 1 ? 'Falta 1' : `Faltan ${slotsLeft}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export type When = 'all' | 'today' | 'tomorrow' | 'weekend';

/** Convierte el filtro "Cuándo" en un rango de horario para la API (HU-04). */
export function whenRange(when: When, now: Date = new Date()): { from?: string; to?: string } {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const today = startOf(now);

  switch (when) {
    case 'today':
      return { from: now.toISOString(), to: addDays(today, 1).toISOString() };
    case 'tomorrow':
      return { from: addDays(today, 1).toISOString(), to: addDays(today, 2).toISOString() };
    case 'weekend': {
      const day = now.getDay(); // 0 domingo … 6 sábado
      const toSaturday = day === 0 ? -1 : 6 - day;
      const saturday = addDays(today, toSaturday);
      const from = saturday.getTime() < now.getTime() ? now : saturday;
      return { from: from.toISOString(), to: addDays(saturday, 2).toISOString() };
    }
    default:
      return {};
  }
}

/** Distancia aproximada en metros entre dos puntos (haversine). Solo para la UI. */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
