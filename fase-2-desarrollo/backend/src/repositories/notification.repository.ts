import { Prisma, type Notification, type NotificationKind, type NotificationPreference } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import type { SportValue } from '../schemas/common.schema.js';

/**
 * Avisos y preferencias (HU-10). Las decisiones (qué texto, a quién, cuándo) son de
 * notification.service; aquí solo hay SQL.
 *
 * Igual que en match.repository, las fechas viajan como texto ISO en UTC y las columnas
 * timestamp se comparan con AT TIME ZONE 'UTC'. Días y horas de las preferencias se miden
 * en hora de Chile (CHILE_TZ), que es lo que el usuario eligió en la app.
 */

export const CHILE_TZ = 'America/Santiago';

const iso = (d: Date): string => d.toISOString();
/** Fecha → timestamp sin zona en UTC, como guarda Prisma. */
const utc = (d: Date) => Prisma.sql`(${iso(d)}::timestamptz AT TIME ZONE 'UTC')`;

export interface NewNotification {
  userId: string;
  kind: NotificationKind;
  matchId: string | null;
  title: string;
  body: string;
  createdAt: Date;
}

export type PreferenceData = Omit<NotificationPreference, 'userId' | 'updatedAt'>;

/** Aviso con lo justo de su partido para saber si sigue vigente y ordenar la bandeja. */
export type InboxRow = Notification & { match: { status: string; startsAt: Date; prioritizedAt: Date | null } | null };

/** Partido abierto que empieza pronto y al que le faltan pocos jugadores (barrido periódico). */
export interface SoonMatchRow {
  id: string;
  organizerId: string;
  title: string;
  sport: SportValue;
  venueName: string;
  startsAt: Date;
  slotsLeft: number;
  prioritizedAt: Date | null;
}

/** Usuario que aceptó avisos de ánimo, lleva tiempo sin jugar y tiene partidos cerca. */
export interface NudgeCandidateRow {
  userId: string;
  lastActiveAt: Date | null;
  nearbyCount: number;
  sport: SportValue;
}

/**
 * El partido `m` le sirve al usuario de la preferencia `np`: no lo organiza, es de uno de sus
 * deportes y queda dentro de su radio.
 * shortcut: ST_MakePoint por fila sin índice sobre las preferencias; basta para una comuna, upgrade a una
 * columna geography con índice GIST si los avisos se abren a toda la región.
 */
const reaches = Prisma.sql`
  np."lat" IS NOT NULL
  AND np."userId" <> m."organizerId"
  AND m."sport" = ANY(np."sports")
  AND ST_DWithin(m."location", ST_MakePoint(np."lng", np."lat")::geography, np."radiusKm" * 1000)`;

/** ...y aún no está en el partido. */
const notInMatch = Prisma.sql`
  NOT EXISTS (
    SELECT 1 FROM "Participation" p
    WHERE p."matchId" = m."id" AND p."userId" = np."userId" AND p."status" IN ('PENDING', 'APPROVED', 'PAID')
  )`;

const chileStart = Prisma.sql`((m."startsAt" AT TIME ZONE 'UTC') AT TIME ZONE ${CHILE_TZ})`;

export const notificationRepository = {
  findPreferences(userId: string): Promise<NotificationPreference | null> {
    return prisma.notificationPreference.findUnique({ where: { userId } });
  },

  savePreferences(userId: string, data: PreferenceData): Promise<NotificationPreference> {
    return prisma.notificationPreference.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  },

  listForUser(userId: string, limit: number): Promise<InboxRow[]> {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { match: { select: { status: true, startsAt: true, prioritizedAt: true } } },
    });
  },

  countUnread(userId: string): Promise<number> {
    return prisma.notification.count({ where: { userId, readAt: null } });
  },

  /** null si el aviso no existe o es de otro usuario. Marcar dos veces no cambia la primera lectura. */
  async markRead(id: string, userId: string, at: Date): Promise<Notification | null> {
    const found = await prisma.notification.findFirst({ where: { id, userId } });
    if (!found || found.readAt) return found;
    return prisma.notification.update({ where: { id }, data: { readAt: at } });
  },

  /** Da por leídos los avisos de un tipo sobre un partido: ya se actuó sobre ellos. */
  async markKindRead(matchId: string, kind: NotificationKind, at: Date): Promise<void> {
    await prisma.notification.updateMany({ where: { matchId, kind, readAt: null }, data: { readAt: at } });
  },

  /** Crea los avisos que falten. UNIQUE (userId, kind, matchId) descarta los repetidos. */
  async addMany(list: NewNotification[]): Promise<number> {
    if (list.length === 0) return 0;
    const { count } = await prisma.notification.createMany({ data: list, skipDuplicates: true });
    return count;
  },

  /** Crea el aviso o lo renueva: vuelve a "no leído" y sube en la bandeja con el texto nuevo. */
  async renew(n: NewNotification & { matchId: string }): Promise<void> {
    await prisma.notification.upsert({
      where: { userId_kind_matchId: { userId: n.userId, kind: n.kind, matchId: n.matchId } },
      create: n,
      update: { title: n.title, body: n.body, readAt: null, createdAt: n.createdAt },
    });
  },

  /**
   * FALTA_UNO para todos los que lo aceptaron y tienen el partido a su alcance.
   * `renew` reemplaza un aviso anterior del mismo partido (al destacarlo, "entra gratis").
   */
  fanOutFaltaUno(matchId: string, title: string, body: string, at: Date, renew: boolean): Promise<number> {
    const onConflict = renew
      ? Prisma.sql`DO UPDATE SET "title" = EXCLUDED."title", "body" = EXCLUDED."body", "readAt" = NULL, "createdAt" = EXCLUDED."createdAt"`
      : Prisma.sql`DO NOTHING`;
    return prisma.$executeRaw`
      INSERT INTO "Notification" ("id", "userId", "kind", "matchId", "title", "body", "createdAt")
      SELECT gen_random_uuid()::text, np."userId", 'FALTA_UNO', m."id", ${title}, ${body}, ${utc(at)}
      FROM "Match" m
      JOIN "NotificationPreference" np ON np."faltaUno" AND ${reaches} AND ${notInMatch}
      WHERE m."id" = ${matchId}
      ON CONFLICT ("userId", "kind", "matchId") ${onConflict};
    `;
  },

  /** NEARBY_MATCH para quienes aceptan partidos cerca y el partido cae en sus días y horario. */
  fanOutNearby(matchId: string, title: string, body: string, at: Date): Promise<number> {
    return prisma.$executeRaw`
      INSERT INTO "Notification" ("id", "userId", "kind", "matchId", "title", "body", "createdAt")
      SELECT gen_random_uuid()::text, np."userId", 'NEARBY_MATCH', m."id", ${title}, ${body}, ${utc(at)}
      FROM "Match" m
      JOIN "NotificationPreference" np ON np."nearby" AND ${reaches} AND ${notInMatch}
        AND EXTRACT(DOW FROM ${chileStart})::int = ANY(np."days")
        AND EXTRACT(HOUR FROM ${chileStart})::int >= np."fromHour"
        AND EXTRACT(HOUR FROM ${chileStart})::int < np."toHour"
      WHERE m."id" = ${matchId}
      ON CONFLICT ("userId", "kind", "matchId") DO NOTHING;
    `;
  },

  /** Partidos abiertos que empiezan entre `now` y `until` y a los que les faltan de 1 a `maxLeft`. */
  findStartingSoon(now: Date, until: Date, maxLeft: number): Promise<SoonMatchRow[]> {
    return prisma.$queryRaw<SoonMatchRow[]>`
      SELECT m."id", m."organizerId", m."title", m."sport"::text AS "sport", m."venueName", m."startsAt",
             (m."totalSlots" - m."filledSlots")::int AS "slotsLeft", m."prioritizedAt"
      FROM "Match" m
      WHERE m."status" = 'OPEN'
        AND m."startsAt" > ${utc(now)}
        AND m."startsAt" <= ${utc(until)}
        AND m."totalSlots" - m."filledSlots" BETWEEN 1 AND ${maxLeft};
    `;
  },

  /**
   * Quienes aceptan avisos de ánimo, no postulan ni organizan desde `inactiveSince`, no recibieron
   * uno desde `lastNudgeBefore` y tienen partidos abiertos a su alcance antes de `until`.
   */
  findNudgeCandidates(now: Date, until: Date, inactiveSince: Date, lastNudgeBefore: Date): Promise<NudgeCandidateRow[]> {
    return prisma.$queryRaw<NudgeCandidateRow[]>`
      WITH np AS (
        SELECT pref.*,
               GREATEST(
                 (SELECT max(p."joinedAt") FROM "Participation" p WHERE p."userId" = pref."userId"),
                 (SELECT max(o."createdAt") FROM "Match" o WHERE o."organizerId" = pref."userId")
               ) AS "lastActiveAt",
               (SELECT u."createdAt" FROM "User" u WHERE u."id" = pref."userId") AS "registeredAt"
        FROM "NotificationPreference" pref
        WHERE pref."nudges"
          AND NOT EXISTS (
            SELECT 1 FROM "Notification" n
            WHERE n."userId" = pref."userId" AND n."kind" = 'NUDGE' AND n."createdAt" > ${utc(lastNudgeBefore)}
          )
      )
      SELECT np."userId", np."lastActiveAt",
             COUNT(m."id")::int AS "nearbyCount",
             (array_agg(m."sport"::text ORDER BY m."startsAt"))[1] AS "sport"
      FROM np
      JOIN "Match" m ON m."status" = 'OPEN' AND m."filledSlots" < m."totalSlots"
        AND m."startsAt" > ${utc(now)} AND m."startsAt" <= ${utc(until)}
        AND ${reaches}
      -- Quien nunca jugó cuenta sus 14 días desde el registro: una cuenta nueva no recibe ánimo el primer día.
      WHERE COALESCE(np."lastActiveAt", np."registeredAt") < ${utc(inactiveSince)}
      GROUP BY np."userId", np."lastActiveAt";
    `;
  },
};
