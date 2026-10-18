import { prisma } from '../config/prisma.js';
import type { LevelValue, SportValue } from '../schemas/common.schema.js';

/**
 * Acceso a la tabla Match.
 *
 * Prisma no tipa la columna geography de PostGIS, así que todo lo que toca la
 * ubicación usa $queryRaw. Los valores siempre van como parámetros (${...}),
 * nunca concatenados: eso cierra la puerta a la inyección SQL (S-04).
 *
 * "startsAt" es timestamp sin zona y Prisma lo guarda en UTC. Las comparaciones
 * lo convierten con AT TIME ZONE 'UTC' y las fechas viajan como texto ISO con
 * "Z": así el resultado no depende de la zona horaria de la sesión de
 * PostgreSQL (Docker, CI y Supabase podrían tener distinta).
 */

/** Fecha → texto ISO 8601 en UTC, o null. */
const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

export interface MatchRow {
  id: string;
  title: string;
  sport: SportValue;
  level: LevelValue;
  venueName: string;
  address: string;
  lat: number;
  lng: number;
  startsAt: Date;
  durationMin: number;
  totalSlots: number;
  filledSlots: number;
  totalCost: number;
  status: string;
  organizerId: string;
  organizerName: string;
  organizerHonor: number | null;
}

export interface NearbyMatchRow extends MatchRow {
  distanceM: number;
}

export interface MyMatchRow extends MatchRow {
  myStatus: string | null;
  pendingCount: number;
}

export interface NewMatch {
  organizerId: string;
  title: string;
  sport: SportValue;
  level: LevelValue;
  venueName: string;
  address: string;
  lat: number;
  lng: number;
  startsAt: Date;
  durationMin: number;
  totalSlots: number;
  filledSlots: number;
  totalCost: number;
}

export interface NearbyFilter {
  lat: number;
  lng: number;
  radiusM: number;
  sports: SportValue[] | null;
  level: LevelValue | null;
  from: Date | null;
  to: Date | null;
  now: Date;
}

export const matchRepository = {
  async insert(m: NewMatch): Promise<string> {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO "Match"
        ("id", "organizerId", "title", "sport", "level", "venueName", "address", "location",
         "startsAt", "durationMin", "totalSlots", "filledSlots", "totalCost", "status",
         "createdAt", "updatedAt")
      VALUES
        (gen_random_uuid(), ${m.organizerId}, ${m.title}, ${m.sport}::"Sport", ${m.level}::"SkillLevel",
         ${m.venueName}, ${m.address},
         ST_SetSRID(ST_MakePoint(${m.lng}, ${m.lat}), 4326)::geography,
         (${m.startsAt.toISOString()}::timestamptz AT TIME ZONE 'UTC'),
         ${m.durationMin}, ${m.totalSlots}, ${m.filledSlots}, ${m.totalCost}, 'OPEN'::"MatchStatus",
         NOW(), NOW())
      RETURNING "id";
    `;
    const row = rows[0];
    if (!row) throw new Error('La inserción del partido no devolvió un id');
    return row.id;
  },

  /**
   * HU-04: la consulta central del producto. ST_DWithin sobre el índice GIST
   * idx_match_location descarta por bounding box antes de medir distancias.
   */
  findNearby(f: NearbyFilter): Promise<NearbyMatchRow[]> {
    return prisma.$queryRaw<NearbyMatchRow[]>`
      SELECT m."id", m."title", m."sport"::text AS "sport", m."level"::text AS "level",
             m."venueName", m."address",
             ST_Y(m."location"::geometry)::float8 AS "lat",
             ST_X(m."location"::geometry)::float8 AS "lng",
             m."startsAt", m."durationMin", m."totalSlots", m."filledSlots", m."totalCost",
             m."status"::text AS "status",
             u."id" AS "organizerId", u."name" AS "organizerName",
             u."honorScore"::float8 AS "organizerHonor",
             ROUND(ST_Distance(m."location", ST_MakePoint(${f.lng}, ${f.lat})::geography))::int AS "distanceM"
      FROM "Match" m
      JOIN "User" u ON u."id" = m."organizerId"
      WHERE m."status" = 'OPEN'
        AND (m."startsAt" AT TIME ZONE 'UTC') > ${iso(f.now)}::timestamptz
        AND m."filledSlots" < m."totalSlots"
        AND (${f.sports}::text[] IS NULL OR m."sport"::text = ANY(${f.sports}::text[]))
        AND (${f.level}::text IS NULL OR m."level"::text = ${f.level}::text)
        AND (${iso(f.from)}::timestamptz IS NULL OR (m."startsAt" AT TIME ZONE 'UTC') >= ${iso(f.from)}::timestamptz)
        AND (${iso(f.to)}::timestamptz IS NULL OR (m."startsAt" AT TIME ZONE 'UTC') <= ${iso(f.to)}::timestamptz)
        AND ST_DWithin(m."location", ST_MakePoint(${f.lng}, ${f.lat})::geography, ${f.radiusM})
      ORDER BY "distanceM" ASC, m."startsAt" ASC
      LIMIT 100;
    `;
  },

  async findById(id: string): Promise<MatchRow | null> {
    const rows = await prisma.$queryRaw<MatchRow[]>`
      SELECT m."id", m."title", m."sport"::text AS "sport", m."level"::text AS "level",
             m."venueName", m."address",
             ST_Y(m."location"::geometry)::float8 AS "lat",
             ST_X(m."location"::geometry)::float8 AS "lng",
             m."startsAt", m."durationMin", m."totalSlots", m."filledSlots", m."totalCost",
             m."status"::text AS "status",
             u."id" AS "organizerId", u."name" AS "organizerName",
             u."honorScore"::float8 AS "organizerHonor"
      FROM "Match" m
      JOIN "User" u ON u."id" = m."organizerId"
      WHERE m."id" = ${id};
    `;
    return rows[0] ?? null;
  },

  /** Partidos que el usuario organiza o a los que postuló, con su estado en cada uno. */
  findByUser(userId: string): Promise<MyMatchRow[]> {
    return prisma.$queryRaw<MyMatchRow[]>`
      SELECT m."id", m."title", m."sport"::text AS "sport", m."level"::text AS "level",
             m."venueName", m."address",
             ST_Y(m."location"::geometry)::float8 AS "lat",
             ST_X(m."location"::geometry)::float8 AS "lng",
             m."startsAt", m."durationMin", m."totalSlots", m."filledSlots", m."totalCost",
             m."status"::text AS "status",
             u."id" AS "organizerId", u."name" AS "organizerName",
             u."honorScore"::float8 AS "organizerHonor",
             p."status"::text AS "myStatus",
             (SELECT COUNT(*)::int FROM "Participation" pp
               WHERE pp."matchId" = m."id" AND pp."status" = 'PENDING') AS "pendingCount"
      FROM "Match" m
      JOIN "User" u ON u."id" = m."organizerId"
      LEFT JOIN "Participation" p ON p."matchId" = m."id" AND p."userId" = ${userId}
      WHERE m."organizerId" = ${userId} OR p."id" IS NOT NULL
      ORDER BY m."startsAt" ASC
      LIMIT 100;
    `;
  },
};
