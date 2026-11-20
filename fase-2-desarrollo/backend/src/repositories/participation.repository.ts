import type { MatchStatus, Participation, PartStatus, PayStatus, Prisma, Sport } from '@prisma/client';
import { prisma } from '../config/prisma.js';

export interface ParticipantRow {
  id: string;
  status: PartStatus;
  joinedAt: Date;
  attended: boolean | null;
  user: {
    id: string;
    name: string;
    favoriteSport: Sport;
    honorScore: Prisma.Decimal | null;
    matchesPlayed: number;
  };
}

/** Fila del partido bloqueada con FOR UPDATE durante una aprobación (HU-05). */
export interface LockedMatch {
  id: string;
  organizerId: string;
  totalSlots: number;
  filledSlots: number;
  totalCost: number;
  status: string;
  startsAt: Date;
  /** KAN-41: null = no destacado. */
  prioritizedAt: Date | null;
}

/**
 * Operaciones disponibles dentro de una transacción que mueve cupos: aprobar
 * (HU-05) o liberar por pago fallido (HU-08) o cancelación (HU-09). La decisión
 * la toman los servicios; aquí solo hay SQL.
 */
export interface ApprovalTx {
  findParticipation(id: string): Promise<Participation | null>;
  lockMatch(matchId: string): Promise<LockedMatch | null>;
  markApproved(participationId: string, amountDue: number): Promise<Participation>;
  markParticipation(participationId: string, status: PartStatus): Promise<void>;
  /** Pago de la participación, leído dentro de la transacción (tras el bloqueo del partido). */
  findPayment(participationId: string): Promise<{ id: string; status: string; amount: number; token: string | null } | null>;
  markPayment(
    paymentId: string,
    data: { status: PayStatus; retained?: number; commission?: number; authorizedAt?: Date },
  ): Promise<void>;
  updateSlots(matchId: string, filledSlots: number, status: MatchStatus): Promise<void>;
  /** KAN-41: marca el partido como destacado. */
  setPriority(matchId: string, at: Date): Promise<void>;
}

function approvalTx(tx: Prisma.TransactionClient): ApprovalTx {
  return {
    findParticipation: (id) => tx.participation.findUnique({ where: { id } }),

    async lockMatch(matchId) {
      // FOR UPDATE: la segunda aprobación concurrente espera aquí hasta que la
      // primera confirme, y entonces lee el filledSlots ya incrementado.
      const rows = await tx.$queryRaw<LockedMatch[]>`
        SELECT "id", "organizerId", "totalSlots", "filledSlots", "totalCost",
               "status"::text AS "status", "startsAt", "prioritizedAt"
        FROM "Match" WHERE "id" = ${matchId}
        FOR UPDATE;
      `;
      return rows[0] ?? null;
    },

    markApproved: (participationId, amountDue) =>
      tx.participation.update({
        where: { id: participationId },
        data: { status: 'APPROVED', amountDue },
      }),

    async markParticipation(participationId, status) {
      await tx.participation.update({ where: { id: participationId }, data: { status } });
    },

    findPayment: (participationId) =>
      tx.payment.findUnique({
        where: { participationId },
        select: { id: true, status: true, amount: true, token: true },
      }),

    async markPayment(paymentId, data) {
      await tx.payment.update({ where: { id: paymentId }, data });
    },

    async updateSlots(matchId, filledSlots, status) {
      await tx.match.update({ where: { id: matchId }, data: { filledSlots, status } });
    },
    async setPriority(matchId, at) {
      await tx.match.update({ where: { id: matchId }, data: { prioritizedAt: at } });
    },
  };
}

export const participationRepository = {
  /** La restricción UNIQUE (matchId, userId) es la que de verdad impide postular dos veces. */
  create(matchId: string, userId: string): Promise<Participation> {
    return prisma.participation.create({ data: { matchId, userId } });
  },

  findOne(matchId: string, userId: string): Promise<Participation | null> {
    return prisma.participation.findUnique({ where: { matchId_userId: { matchId, userId } } });
  },

  /**
   * Volver a postular tras perder el cupo reutiliza la fila: UNIQUE (matchId, userId) no admite otra.
   * Solo reabre lo que sigue cancelado o rechazado; null si otra petición ya la reabrió.
   */
  async reopen(participationId: string): Promise<Participation | null> {
    const { count } = await prisma.participation.updateMany({
      where: { id: participationId, status: { in: ['CANCELLED', 'REJECTED'] } },
      data: { status: 'PENDING', amountDue: 0, joinedAt: new Date() },
    });
    return count === 1 ? prisma.participation.findUnique({ where: { id: participationId } }) : null;
  },

  findByMatch(matchId: string): Promise<ParticipantRow[]> {
    return prisma.participation.findMany({
      where: { matchId, status: { in: ['PENDING', 'APPROVED', 'PAID', 'NO_SHOW'] } },
      orderBy: { joinedAt: 'asc' },
      select: {
        id: true,
        status: true,
        joinedAt: true,
        attended: true,
        user: {
          select: { id: true, name: true, favoriteSport: true, honorScore: true, matchesPlayed: true },
        },
      },
    });
  },

  inApprovalTransaction<T>(fn: (tx: ApprovalTx) => Promise<T>): Promise<T> {
    // 15 s: una cancelación pagada espera a Transbank (hasta 8 s) antes de confirmar (HU-09).
    return prisma.$transaction((tx) => fn(approvalTx(tx)), { timeout: 15_000 });
  },
};
