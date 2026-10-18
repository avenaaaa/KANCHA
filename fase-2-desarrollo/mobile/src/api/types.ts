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

export interface MatchDetail extends MatchSummary {
  serviceFee: number;
  viewer: { isOrganizer: boolean; participationId: string | null; status: ParticipationStatus | null };
  participants: Participant[];
}

export interface MyMatch extends MatchSummary {
  role: 'ORGANIZER' | 'PLAYER';
  myStatus: ParticipationStatus | null;
  pendingCount: number;
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
