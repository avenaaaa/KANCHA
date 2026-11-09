import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import type { AttendanceSample, HonorBreakdown, RatingSample } from '../services/honor.service.js';

/** Quienes jugaron el partido: el organizador y las participaciones confirmadas (HU-06). */
export interface RosterRow {
  startsAt: Date;
  durationMin: number;
  status: string;
  members: { id: string; name: string; honorScore: Prisma.Decimal | null }[];
}

/** Participación cuya asistencia cierra el organizador (KAN-30). */
export interface AttendanceRow {
  userId: string;
  status: string;
  attended: boolean | null;
  match: { organizerId: string; startsAt: Date; durationMin: number };
}

/** Operaciones dentro de la transacción que guarda una reseña o una asistencia y recalcula el honor (HU-07). */
export interface RatingTx {
  lockUser(userId: string): Promise<void>;
  insertRating(data: { matchId: string; raterId: string; ratedId: string; punctuality: number; conduct: number }): Promise<void>;
  /** Cierra la asistencia solo si seguía abierta; false si otro cierre llegó antes. */
  closeAttendance(participationId: string, attended: boolean): Promise<boolean>;
  addMatchPlayed(userId: string): Promise<void>;
  lastRatings(userId: string, limit: number): Promise<RatingSample[]>;
  attendance(userId: string): Promise<AttendanceSample>;
  updateHonor(userId: string, honor: HonorBreakdown): Promise<void>;
}

const member = { select: { id: true, name: true, honorScore: true } } as const;

function ratingTx(tx: Prisma.TransactionClient): RatingTx {
  return {
    async lockUser(userId) {
      // FOR UPDATE: una segunda reseña al mismo jugador espera y recalcula con la primera ya guardada.
      await tx.$queryRaw`SELECT 1 FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    },
    async insertRating(data) {
      await tx.rating.create({ data });
    },
    async closeAttendance(participationId, attended) {
      // La condición attended = null hace el cierre atómico: nunca suma dos veces el mismo partido.
      const { count } = await tx.participation.updateMany({
        where: { id: participationId, attended: null, status: { in: ['APPROVED', 'PAID'] } },
        data: attended ? { attended } : { attended, status: 'NO_SHOW' },
      });
      return count === 1;
    },
    async addMatchPlayed(userId) {
      await tx.user.update({ where: { id: userId }, data: { matchesPlayed: { increment: 1 } } });
    },
    lastRatings: (userId, limit) =>
      tx.rating.findMany({
        where: { ratedId: userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { punctuality: true, conduct: true },
      }),
    async attendance(userId) {
      const [attended, noShow] = await Promise.all([
        tx.participation.count({ where: { userId, attended: true } }),
        tx.participation.count({ where: { userId, attended: false } }),
      ]);
      return { attended, noShow };
    },
    async updateHonor(userId, honor) {
      await tx.user.update({ where: { id: userId }, data: honor });
    },
  };
}

export const ratingRepository = {
  async findRoster(matchId: string): Promise<RosterRow | null> {
    const m = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        startsAt: true,
        durationMin: true,
        status: true,
        organizer: member,
        participations: { where: { status: { in: ['APPROVED', 'PAID'] } }, select: { user: member } },
      },
    });
    if (!m) return null;
    return { ...m, members: [m.organizer, ...m.participations.map((p) => p.user)] };
  },

  async ratedBy(matchId: string, raterId: string): Promise<string[]> {
    const rows = await prisma.rating.findMany({ where: { matchId, raterId }, select: { ratedId: true } });
    return rows.map((r) => r.ratedId);
  },

  findForAttendance(participationId: string): Promise<AttendanceRow | null> {
    return prisma.participation.findUnique({
      where: { id: participationId },
      select: {
        userId: true,
        status: true,
        attended: true,
        match: { select: { organizerId: true, startsAt: true, durationMin: true } },
      },
    });
  },

  async archive(matchId: string): Promise<void> {
    await prisma.match.update({ where: { id: matchId }, data: { status: 'ARCHIVED' } });
  },

  /** También la usa el cierre de asistencia (KAN-30): ambos recalculan el honor con la fila bloqueada. */
  inRatingTransaction<T>(fn: (tx: RatingTx) => Promise<T>): Promise<T> {
    return prisma.$transaction((tx) => fn(ratingTx(tx)));
  },
};
