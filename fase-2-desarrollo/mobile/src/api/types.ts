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
  organizer: { id: string; name: string; honorScore: number | null };
  distanceM?: number;
}

export type ParticipationStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED' | 'NO_SHOW';

export interface Participant {
  participationId: string;
  status: ParticipationStatus;
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
  };
  participants: Participant[];
}

export interface MyMatch extends MatchSummary {
  role: 'ORGANIZER' | 'PLAYER';
  myStatus: ParticipationStatus | null;
  pendingCount: number;
  ratingWindow: RatingWindow;
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
