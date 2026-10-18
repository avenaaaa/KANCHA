import type { Participation, PartStatus, Prisma, Sport } from '@prisma/client';
import { prisma } from '../config/prisma.js';

export interface ParticipantRow {
  id: string;
  status: PartStatus;
  joinedAt: Date;
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
}

/**
 * Operaciones disponibles dentro de una transacción de aprobación.
 * La decisión (¿se puede aprobar?) la toma matching.service; aquí solo hay SQL.
 */
export interface ApprovalTx {
  findParticipation(id: string): Promise<Participation | null>;
  lockMatch(matchId: string): Promise<LockedMatch | null>;
  markApproved(participationId: string, amountDue: number): Promise<Participation>;
  updateSlots(matchId: string, filledSlots: number, status: 'OPEN' | 'FULL'): Promise<void>;
}

function approvalTx(tx: Prisma.TransactionClient): ApprovalTx {
  return {
    findParticipation: (id) => tx.participation.findUnique({ where: { id } }),

    async lockMatch(matchId) {
      // FOR UPDATE: la segunda aprobación concurrente espera aquí hasta que la
      // primera confirme, y entonces lee el filledSlots ya incrementado.
      const rows = await tx.$queryRaw<LockedMatch[]>`
        SELECT "id", "organizerId", "totalSlots", "filledSlots", "totalCost",
               "status"::text AS "status", "startsAt"
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

    async updateSlots(matchId, filledSlots, status) {
      await tx.match.update({ where: { id: matchId }, data: { filledSlots, status } });
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

  findByMatch(matchId: string): Promise<ParticipantRow[]> {
    return prisma.participation.findMany({
      where: { matchId, status: { in: ['PENDING', 'APPROVED', 'PAID'] } },
      orderBy: { joinedAt: 'asc' },
      select: {
        id: true,
        status: true,
        joinedAt: true,
        user: {
          select: { id: true, name: true, favoriteSport: true, honorScore: true, matchesPlayed: true },
        },
      },
    });
  },

  inApprovalTransaction<T>(fn: (tx: ApprovalTx) => Promise<T>): Promise<T> {
    return prisma.$transaction((tx) => fn(approvalTx(tx)));
  },
};
