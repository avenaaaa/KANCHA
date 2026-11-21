import type { SkillLevelKey, SportKey } from '@/theme/sports';

/** Espejo de los DTO de la API (backend/src/services/*.service.ts). */

export interface User {
  id: string;
  name: string;
  email?: string;
  favoriteSport: SportKey;
  matchesPlayed: number;
  /** 0.0–10.0, o null = "Sin calificaciones aún". */
  honorScore: number | null;
  attendanceRate: number | null;
  punctualityRate: number | null;
  fairPlayRate: number | null;
  createdAt: string;
}

export interface Session {
  token: string;
  user: User;
}

export interface MatchSummary {
  id: string;
  title: string;
  sport: SportKey;
  level: SkillLevelKey;
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
  pricePerPlayer: number;
  status: string;
  /** "Falta uno" destacado (KAN-41): quien se une entra gratis; al tiro si su honor es 7 o más. */
  priority: boolean;
  organizer: { id: string; name: string; honorScore: number | null };
  distanceM?: number;
}

export type ParticipationStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED' | 'NO_SHOW' | 'REJECTED';

export interface Participant {
  participationId: string;
  status: ParticipationStatus;
  /** Asistencia cerrada por el organizador (KAN-30): null mientras no se registre. */
  attended: boolean | null;
  user: { id: string; name: string; favoriteSport: SportKey; honorScore: number | null; matchesPlayed: number };
}

/** Ventana para calificar (HU-06): abre al terminar el partido y dura 48 h. */
export type RatingWindow = 'NOT_FINISHED' | 'OPEN' | 'CLOSED';

export interface MatchDetail extends MatchSummary {
  serviceFee: number;
  ratingWindow: RatingWindow;
  viewer: {
    isOrganizer: boolean;
    participationId: string | null;
    status: ParticipationStatus | null;
    /** Último intento de pago (HU-08). Con status AUTHORIZED es el comprobante. */
    payment: { status: string; amount: number; retained: number; buyOrder: string; authorizedAt: string | null } | null;
    /** Si el cupo está pagado: qué se devolvería al cancelar ahora (HU-09). */
    refundIfCancelled: { refunded: number; retained: number; withinRetentionWindow: boolean } | null;
    /** Cuota congelada al aprobar; 0 si entró gratis como invitado (KAN-41). */
    amountDue: number | null;
  };
  /** KAN-41: si el organizador puede destacarlo ahora y cuánto pone cada uno por el invitado. */
  priorityOffer: { canActivate: boolean; guestShare: number; perPlayer: number };
  participants: Participant[];
}

export interface MyMatch extends MatchSummary {
  role: 'ORGANIZER' | 'PLAYER';
  myStatus: ParticipationStatus | null;
  pendingCount: number;
  ratingWindow: RatingWindow;
  /** Cuota congelada de mi cupo: 0 si entré como invitado (KAN-41). */
  myAmountDue: number;
  /** KAN-41: puedo destacarlo ahora. */
  canPrioritize: boolean;
}

/** GET /matches/:id/ratings/pending (HU-06). */
export interface PendingRatings {
  window: RatingWindow;
  closesAt: string;
  pending: { userId: string; name: string; honorScore: number | null }[];
}

export interface NewMatch {
  title: string;
  sport: SportKey;
  level: SkillLevelKey;
  venueName: string;
  address: string;
  lat: number;
  lng: number;
  startsAt: string;
  durationMin: number;
  totalSlots: number;
  filledSlots: number;
  totalCost: number;
}

/** HU-10: tipos de aviso. FALTA_UNO es el prioritario: va primero y destacado. */
export type NotificationKind =
  | 'FALTA_UNO'
  | 'NEARBY_MATCH'
  | 'JOIN_REQUEST'
  | 'JOIN_APPROVED'
  | 'PRIORITY_OFFER'
  | 'NUDGE'
  | 'GUEST_COVER';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  matchId: string | null;
  title: string;
  body: string;
  read: boolean;
  /** "Falta uno" vigente (sin leer, partido abierto y sin empezar): lo decide la API. */
  urgent: boolean;
  createdAt: string;
}

export interface Inbox {
  unread: number;
  /** La API ya los ordena: los "Falta uno" sin leer primero. */
  notifications: AppNotification[];
}

/** Qué avisos acepta el usuario. Días 0 = domingo … 6 = sábado y horario [fromHour, toHour), en hora de Chile. */
export interface NotificationPreferences {
  faltaUno: boolean;
  nearby: boolean;
  nudges: boolean;
  sports: SportKey[];
  days: number[];
  fromHour: number;
  toHour: number;
  radiusKm: number;
  lat: number | null;
  lng: number | null;
}
