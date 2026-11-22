import type { Prisma, ReportReason, ReportStatus } from '@prisma/client';
import { prisma } from '../config/prisma.js';

/** HU-11 (KAN-17): reportes de conducta y su resolución. La decisión la toman los servicios; aquí solo hay SQL. */

const person = { select: { id: true, name: true } } as const;

const withPeople = {
  reporter: person,
  reported: { select: { id: true, name: true, honorScore: true, matchesPlayed: true, suspendedUntil: true } },
  resolvedBy: person,
  match: { select: { id: true, title: true, sport: true, startsAt: true } },
} satisfies Prisma.ReportInclude;

export type ReportRow = Prisma.ReportGetPayload<{ include: typeof withPeople }>;

/** Operaciones dentro de la transacción que resuelve un reporte. */
export interface ResolutionTx {
  /** Bloquea al reportado y devuelve hasta cuándo ya estaba suspendido. */
  lockReported(userId: string): Promise<Date | null>;
  /** Marca el reporte como resuelto solo si seguía pendiente; false si otro administrador llegó antes. */
  markResolved(
    reportId: string,
    data: { status: ReportStatus; resolvedById: string; resolvedAt: Date; resolutionNote: string | null },
  ): Promise<boolean>;
  suspend(userId: string, until: Date): Promise<void>;
}

export const reportRepository = {
  create(data: { matchId: string; reporterId: string; reportedId: string; reason: ReportReason; comment: string | null }) {
    return prisma.report.create({ data, select: { id: true, status: true, createdAt: true } });
  },

  /** Los pendientes, del más antiguo al más nuevo; los resueltos, del más reciente. */
  list(status: ReportStatus, limit = 50): Promise<ReportRow[]> {
    return prisma.report.findMany({
      where: { status },
      orderBy: status === 'PENDING' ? { createdAt: 'asc' } : { resolvedAt: 'desc' },
      take: limit,
      include: withPeople,
    });
  },

  findById(id: string): Promise<ReportRow | null> {
    return prisma.report.findUnique({ where: { id }, include: withPeople });
  },

  /** Historial del reportado: sus otros reportes, del más reciente al más antiguo. */
  historyOf(reportedId: string, exceptId: string, limit = 20): Promise<ReportRow[]> {
    return prisma.report.findMany({
      where: { reportedId, NOT: { id: exceptId } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: withPeople,
    });
  },

  countPending(): Promise<number> {
    return prisma.report.count({ where: { status: 'PENDING' } });
  },

  inResolution<T>(fn: (tx: ResolutionTx) => Promise<T>): Promise<T> {
    return prisma.$transaction((tx) =>
      fn({
        async lockReported(userId) {
          // FOR UPDATE: dos sanciones simultáneas al mismo jugador se suman en vez de pisarse.
          const rows = await tx.$queryRaw<{ suspendedUntil: Date | null }[]>`
            SELECT "suspendedUntil" FROM "User" WHERE "id" = ${userId} FOR UPDATE;
          `;
          return rows[0]?.suspendedUntil ?? null;
        },
        async markResolved(reportId, data) {
          const { count } = await tx.report.updateMany({ where: { id: reportId, status: 'PENDING' }, data });
          return count === 1;
        },
        async suspend(userId, until) {
          await tx.user.update({ where: { id: userId }, data: { suspendedUntil: until } });
        },
      }),
    );
  },
};
