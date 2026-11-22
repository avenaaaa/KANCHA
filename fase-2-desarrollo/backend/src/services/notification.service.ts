import type { Notification, NotificationPreference, ReportReason } from '@prisma/client';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { matchRepository, type MatchRow } from '../repositories/match.repository.js';
import {
  CHILE_TZ,
  notificationRepository,
  type NewNotification,
  type NudgeCandidateRow,
} from '../repositories/notification.repository.js';
import { participationRepository } from '../repositories/participation.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import type { SportValue } from '../schemas/common.schema.js';
import type { PreferencesInput } from '../schemas/notification.schema.js';
import { notFound } from '../utils/errors.js';
import { isPriorityActive, MAX_PRIORITY_SLOTS } from './match.service.js';
import { guestShare } from './payment.service.js';

/**
 * Avisos dentro de la app (HU-10, KAN-16). Costo $0: los disparadores son reglas, sin IA.
 *
 * - Por evento: partido publicado (NEARBY_MATCH), partido destacado (FALTA_UNO a los cercanos y
 *   GUEST_COVER a los confirmados), postulación (JOIN_REQUEST al organizador) y aprobación
 *   (JOIN_APPROVED al jugador).
 * - Por barrido periódico (runSweep): partidos que quedan urgentes (FALTA_UNO), el "¿Lo destacas?"
 *   al organizador (PRIORITY_OFFER) y el ánimo para volver a jugar (NUDGE).
 *
 * Los textos son funciones puras para probarlos sin base de datos.
 */

export const INBOX_LIMIT = 50;
/** NUDGE: sin postular ni organizar en estos días... */
export const NUDGE_INACTIVE_DAYS = 14;
/** ...a lo más uno cada estos días... */
export const NUDGE_EVERY_DAYS = 7;
/** ...y solo si hay partidos a su alcance en estos días. */
export const NUDGE_LOOKAHEAD_DAYS = 3;

const DAY_MS = 86_400_000;
const addMs = (d: Date, ms: number) => new Date(d.getTime() + ms);

const SPORT_LABEL: Record<SportValue, string> = { FUTBOL: 'fútbol', PADEL: 'pádel', BASQUETBOL: 'básquetbol' };
const timeFmt = new Intl.DateTimeFormat('es-CL', { timeZone: CHILE_TZ, hour: '2-digit', minute: '2-digit', hour12: false });
const dayFmt = new Intl.DateTimeFormat('es-CL', { timeZone: CHILE_TZ, weekday: 'long', day: 'numeric', month: 'long' });

/** Hora de Chile, "19:30". */
export const chileTime = (d: Date): string => timeFmt.format(d);

/** Día y hora de Chile, "sábado, 29 de noviembre a las 19:30". */
export const chileDateTime = (d: Date): string => `${dayFmt.format(d)} a las ${chileTime(d)}`;

export interface Message {
  title: string;
  body: string;
}

interface MatchInfo {
  title: string;
  sport: SportValue;
  venueName: string;
  startsAt: Date;
  slotsLeft: number;
  priority: boolean;
}

const missingText = (n: number) => (n === 1 ? 'Falta 1 jugador' : `Faltan ${n} jugadores`);

/** El aviso prioritario. Destacado, dice que el invitado entra gratis (KAN-41). */
export function faltaUnoMessage(m: MatchInfo): Message {
  return {
    title: m.priority ? '¡Falta uno cerca! Entras gratis' : '¡Falta uno cerca!',
    body:
      `${missingText(m.slotsLeft)} para ${m.title}, a las ${chileTime(m.startsAt)} en ${m.venueName}.` +
      (m.priority ? ' Vas de invitado: no pagas.' : ''),
  };
}

export function nearbyMessage(m: Pick<MatchInfo, 'title' | 'sport' | 'venueName' | 'startsAt'>): Message {
  return {
    title: `Partido de ${SPORT_LABEL[m.sport]} cerca`,
    body: `${m.title}: ${dayFmt.format(m.startsAt)} a las ${chileTime(m.startsAt)} en ${m.venueName}.`,
  };
}

/** Al organizador. En un destacado es urgente: el invitado sin buen honor espera su aprobación (KAN-41). */
export function joinRequestMessage(m: Pick<MatchInfo, 'title' | 'startsAt' | 'priority'>): Message {
  return m.priority
    ? {
        title: 'Un invitado espera tu respuesta',
        body: `Alguien pide entrar gratis a ${m.title}, a las ${chileTime(m.startsAt)}. Apruébalo o recházalo ahora.`,
      }
    : { title: 'Tienes postulaciones por revisar', body: `Hay jugadores que quieren unirse a ${m.title}.` };
}

export function joinApprovedMessage(m: Pick<MatchInfo, 'title' | 'startsAt'>, free: boolean): Message {
  return {
    title: 'Te aceptaron en el partido',
    body: free
      ? `Entras a ${m.title} sin pagar. Nos vemos a las ${chileTime(m.startsAt)}.`
      : `Ya tienes cupo en ${m.title}. Paga tu parte para asegurarlo.`,
  };
}

/** KAN-41: el "¿Lo destacas?" llega a la bandeja del organizador. Solo cuando le falta 1 (KAN-44). */
export function priorityOfferMessage(m: Pick<MatchInfo, 'title' | 'startsAt'>): Message {
  return {
    title: 'Todavía te falta 1 jugador',
    body: `${m.title} es a las ${chileTime(m.startsAt)}. ¿Lo destacas? Aparecerá primero en "Falta uno" y el invitado entra gratis.`,
  };
}

const clp = new Intl.NumberFormat('es-CL');

/**
 * KAN-44: a los confirmados de un partido destacado, cuánto pone cada uno por la cuota del invitado.
 * El grupo la paga fuera de la app: Kancha le dice a cada uno cuánto pone y no cobra comisión por ese cupo.
 */
export function guestCoverMessage(
  m: Pick<MatchInfo, 'title' | 'startsAt'>,
  share: { amount: number; perPlayer: number; players: number },
): Message {
  return {
    title: 'Entra un invitado gratis',
    body:
      `Destacaron ${m.title}, a las ${chileTime(m.startsAt)}: quien llene el último cupo juega gratis. ` +
      `Su cuota de $${clp.format(share.amount)} la cubren entre los ${share.players} que ya están: ` +
      `$${clp.format(share.perPlayer)} cada uno, fuera de la app.`,
  };
}

const REASON_LABEL: Record<ReportReason, string> = {
  AGRESION: 'agresión',
  LENGUAJE: 'lenguaje ofensivo',
  JUEGO_SUCIO: 'juego sucio',
  OTRO: 'conducta indebida',
};

/** HU-11: al jugador sancionado, el motivo, el partido y hasta cuándo. */
export function sanctionMessage(s: { reason: ReportReason; matchTitle: string; until: Date }): Message {
  return {
    title: 'Tu cuenta está suspendida',
    body:
      `Por un reporte de ${REASON_LABEL[s.reason]} en ${s.matchTitle}. Hasta el ${chileDateTime(s.until)} ` +
      'no puedes publicar, postular ni destacar partidos.',
  };
}

/** Ánimo para jugar, armado con su actividad. Reglas, no IA: costo $0. */
export function nudgeMessage(c: Pick<NudgeCandidateRow, 'lastActiveAt' | 'nearbyCount' | 'sport'>, now: Date): Message {
  const offer =
    c.nearbyCount === 1
      ? `Hay 1 partido de ${SPORT_LABEL[c.sport]} cerca en los próximos ${NUDGE_LOOKAHEAD_DAYS} días.`
      : `Hay ${c.nearbyCount} partidos cerca en los próximos ${NUDGE_LOOKAHEAD_DAYS} días; el primero es de ${SPORT_LABEL[c.sport]}.`;
  if (!c.lastActiveAt) {
    return { title: 'Tu primer partido te espera', body: `${offer} Únete a uno y empieza tu carta de jugador.` };
  }
  const days = Math.floor((now.getTime() - new Date(c.lastActiveAt).getTime()) / DAY_MS);
  return { title: `Hace ${days} días que no juegas`, body: `${offer} Vuelve a la cancha.` };
}

type InboxItem = Pick<Notification, 'kind' | 'readAt' | 'createdAt'> & {
  match?: { status: string; startsAt: Date; prioritizedAt: Date | null } | null;
};

/** Un "Falta uno" se destaca mientras no se lea y su partido siga abierto y sin empezar. Lo decide la API. */
export function isUrgent(n: InboxItem, now: Date = new Date()): boolean {
  return n.kind === 'FALTA_UNO' && !n.readAt && n.match?.status === 'OPEN' && new Date(n.match.startsAt) > now;
}

/**
 * Los "Falta uno" vigentes van primero: son más prioritarios que cualquier otro aviso. Entre ellos, los de
 * partidos destacados ("entras gratis"), como en la búsqueda (KAN-41). Luego, del más nuevo al más viejo.
 */
export function sortInbox<T extends InboxItem>(list: T[], now: Date = new Date()): T[] {
  const rank = (n: T) => (isUrgent(n, now) ? (n.match?.prioritizedAt ? 2 : 1) : 0);
  return [...list].sort((a, b) => rank(b) - rank(a) || b.createdAt.getTime() - a.createdAt.getTime());
}

// ------------------------------------------------------------------ bandeja y preferencias

export type PreferencesView = PreferencesInput;

export interface NotificationView {
  id: string;
  kind: Notification['kind'];
  matchId: string | null;
  title: string;
  body: string;
  read: boolean;
  /** "Falta uno" vigente: va destacado y sobre el mapa. */
  urgent: boolean;
  createdAt: string;
}

/** Sin fila guardada, nada activado. El deporte favorito viene marcado para cuando active algo. */
export function defaultPreferences(favoriteSport: SportValue): PreferencesView {
  return {
    faltaUno: false,
    nearby: false,
    nudges: false,
    sports: [favoriteSport],
    days: [0, 1, 2, 3, 4, 5, 6],
    fromHour: 18,
    toHour: 23,
    radiusKm: 5,
    lat: null,
    lng: null,
  };
}

function toPreferencesView(p: NotificationPreference): PreferencesView {
  const { faltaUno, nearby, nudges, sports, days, fromHour, toHour, radiusKm, lat, lng } = p;
  return { faltaUno, nearby, nudges, sports, days, fromHour, toHour, radiusKm, lat, lng };
}

function toNotificationView(n: Notification & InboxItem, now: Date = new Date()): NotificationView {
  return {
    id: n.id,
    kind: n.kind,
    matchId: n.matchId,
    title: n.title,
    body: n.body,
    read: n.readAt !== null,
    urgent: isUrgent(n, now),
    createdAt: n.createdAt.toISOString(),
  };
}

export async function getPreferences(userId: string): Promise<PreferencesView> {
  const saved = await notificationRepository.findPreferences(userId);
  if (saved) return toPreferencesView(saved);
  const user = await userRepository.findById(userId);
  if (!user) throw notFound('USER_NOT_FOUND', 'El usuario no existe');
  return defaultPreferences(user.favoriteSport);
}

export async function savePreferences(userId: string, input: PreferencesInput): Promise<PreferencesView> {
  return toPreferencesView(await notificationRepository.savePreferences(userId, input));
}

export async function inbox(userId: string, now: Date = new Date()): Promise<{ unread: number; notifications: NotificationView[] }> {
  const [list, unread] = await Promise.all([
    notificationRepository.listForUser(userId, INBOX_LIMIT),
    notificationRepository.countUnread(userId),
  ]);
  return { unread, notifications: sortInbox(list, now).map((n) => toNotificationView(n, now)) };
}

export async function markRead(id: string, userId: string, now: Date = new Date()): Promise<NotificationView> {
  const n = await notificationRepository.markRead(id, userId, now);
  if (!n) throw notFound('NOTIFICATION_NOT_FOUND', 'El aviso no existe');
  return toNotificationView(n);
}

// ------------------------------------------------------------------ disparadores por evento

/**
 * La acción principal (publicar, postular, aprobar) ya quedó guardada: si el aviso falla, se
 * registra y sigue. Un aviso perdido no puede deshacer una postulación.
 */
async function safely(what: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    logger.warn({ err }, `No se pudo crear el aviso: ${what}`);
  }
}

function infoOf(m: MatchRow): MatchInfo {
  return {
    title: m.title,
    sport: m.sport,
    venueName: m.venueName,
    startsAt: new Date(m.startsAt),
    slotsLeft: Number(m.totalSlots) - Number(m.filledSlots),
    priority: isPriorityActive(m),
  };
}

/** HU-10: "WHEN se publica un partido compatible dentro de mi radio THEN recibo un aviso". */
export function onMatchPublished(
  m: { id: string; title: string; sport: SportValue; venueName: string; startsAt: string | Date },
  now: Date = new Date(),
): Promise<void> {
  return safely('partido publicado', async () => {
    const msg = nearbyMessage({ ...m, startsAt: new Date(m.startsAt) });
    await notificationRepository.fanOutNearby(m.id, msg.title, msg.body, now);
  });
}

/** KAN-41: destacado, el "Falta uno" sale al tiro y reemplaza al anterior del mismo partido ("entras gratis"). */
export function onMatchPrioritized(matchId: string, now: Date = new Date()): Promise<void> {
  return safely('partido destacado', async () => {
    const m = await matchRepository.findById(matchId);
    if (!m) return;
    const msg = faltaUnoMessage({ ...infoOf(m), priority: true });
    await notificationRepository.fanOutFaltaUno(matchId, msg.title, msg.body, now, true);
    // El organizador ya respondió al "¿Lo destacas?".
    await notificationRepository.markKindRead(matchId, 'PRIORITY_OFFER', now);

    // KAN-44: los confirmados saben cuánto pone cada uno por el invitado. Es dinero: no depende de las preferencias.
    const players = Number(m.filledSlots);
    const cover = guestCoverMessage(infoOf(m), { ...guestShare(Number(m.totalCost), Number(m.totalSlots), players), players });
    const confirmed = (await participationRepository.findByMatch(matchId)).filter(
      (p) => (p.status === 'APPROVED' || p.status === 'PAID') && p.user.id !== m.organizerId,
    );
    await notificationRepository.addMany(
      confirmed.map((p) => ({ userId: p.user.id, kind: 'GUEST_COVER' as const, matchId, ...cover, createdAt: now })),
    );
  });
}

/** Al organizador, un aviso por partido que se renueva con cada postulación nueva. */
export function onJoinRequested(m: MatchRow, now: Date = new Date()): Promise<void> {
  return safely('postulación', () =>
    notificationRepository.renew({ userId: m.organizerId, kind: 'JOIN_REQUEST', matchId: m.id, ...joinRequestMessage(infoOf(m)), createdAt: now }),
  );
}

/** HU-11: el sancionado se entera dentro de la app. Sin partido: dos sanciones del mismo partido no chocan en el UNIQUE. */
export function onSanctioned(
  s: { userId: string; reason: ReportReason; matchTitle: string; until: Date },
  now: Date = new Date(),
): Promise<void> {
  return safely('sanción', async () => {
    await notificationRepository.addMany([{ userId: s.userId, kind: 'SANCTION', matchId: null, ...sanctionMessage(s), createdAt: now }]);
  });
}

export function onJoinApproved(p: { userId: string; matchId: string; amountDue: number }, now: Date = new Date()): Promise<void> {
  return safely('aprobación', async () => {
    const m = await matchRepository.findById(p.matchId);
    if (!m) return;
    await notificationRepository.renew({
      userId: p.userId,
      kind: 'JOIN_APPROVED',
      matchId: p.matchId,
      ...joinApprovedMessage(infoOf(m), p.amountDue === 0),
      createdAt: now,
    });
  });
}

// ------------------------------------------------------------------ barrido periódico

/**
 * Lo que depende del paso del tiempo y no de una acción: un partido que entra en la ventana de
 * urgencia, el "¿Lo destacas?" y el ánimo para volver a jugar. UNIQUE (userId, kind, matchId)
 * impide repetir un aviso aunque el barrido pase muchas veces por el mismo partido.
 */
export async function runSweep(now: Date = new Date()): Promise<{ faltaUno: number; offers: number; nudges: number }> {
  const soon = await notificationRepository.findStartingSoon(
    now,
    addMs(now, env.URGENT_WINDOW_HOURS * 3_600_000),
    MAX_PRIORITY_SLOTS,
  );
  let faltaUno = 0;
  const offers: NewNotification[] = [];
  for (const row of soon) {
    const m: MatchInfo = { ...row, startsAt: new Date(row.startsAt), priority: row.prioritizedAt != null };
    // Urgente = le falta exactamente 1 (KAN-37); destacado, también (KAN-44).
    if (m.slotsLeft === 1 || m.priority) {
      const msg = faltaUnoMessage(m);
      faltaUno += await notificationRepository.fanOutFaltaUno(row.id, msg.title, msg.body, now, false);
    }
    if (!m.priority) {
      offers.push({ userId: row.organizerId, kind: 'PRIORITY_OFFER', matchId: row.id, ...priorityOfferMessage(m), createdAt: now });
    }
  }

  const candidates = await notificationRepository.findNudgeCandidates(
    now,
    addMs(now, NUDGE_LOOKAHEAD_DAYS * DAY_MS),
    addMs(now, -NUDGE_INACTIVE_DAYS * DAY_MS),
    addMs(now, -NUDGE_EVERY_DAYS * DAY_MS),
  );
  const nudges = candidates.map(
    (c): NewNotification => ({ userId: c.userId, kind: 'NUDGE', matchId: null, ...nudgeMessage(c, now), createdAt: now }),
  );

  return {
    faltaUno,
    offers: await notificationRepository.addMany(offers),
    nudges: await notificationRepository.addMany(nudges),
  };
}

/**
 * Corre el barrido al arrancar y cada NOTIFY_SWEEP_MINUTES. Devuelve cómo detenerlo.
 * shortcut: corre dentro del proceso de la API; en el plan gratis de Render se detiene mientras la API
 * duerme (15 min sin tráfico). Upgrade: un cron externo que llame al barrido.
 */
export function startSweep(everyMs: number = env.NOTIFY_SWEEP_MINUTES * 60_000): () => void {
  if (everyMs <= 0) return () => undefined;
  const tick = () => {
    runSweep().catch((err: unknown) => logger.warn({ err }, 'Falló el barrido de avisos'));
  };
  tick();
  const timer = setInterval(tick, everyMs);
  timer.unref();
  return () => clearInterval(timer);
}
