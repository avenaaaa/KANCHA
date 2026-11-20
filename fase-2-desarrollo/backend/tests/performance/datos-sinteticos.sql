-- R-02 y R-03 (docs/04-plan-pruebas.md §7): 10.000 partidos sintéticos abiertos y futuros, repartidos en
-- unos 55 x 55 km alrededor de La Florida. Una búsqueda de 5 km encuentra unos pocos cientos.
-- Solo para la base local de Docker: el siguiente arranque de la demo los borra al recargar el seed.
INSERT INTO "Match" (
  "id", "organizerId", "title", "sport", "level", "venueName", "address", "location",
  "startsAt", "durationMin", "totalSlots", "filledSlots", "totalCost", "status", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  (SELECT "id" FROM "User" ORDER BY "createdAt" LIMIT 1),
  'Partido sintético ' || g,
  (ARRAY['FUTBOL', 'PADEL', 'BASQUETBOL'])[1 + g % 3]::"Sport",
  (ARRAY['PRINCIPIANTE', 'MEDIO', 'AVANZADO'])[1 + (g / 3) % 3]::"SkillLevel",
  'Cancha sintética',
  'Dirección sintética',
  ST_SetSRID(ST_MakePoint(-70.585 + (random() - 0.5) * 0.6, -33.5425 + (random() - 0.5) * 0.5), 4326)::geography,
  (now() AT TIME ZONE 'UTC') + (1 + random() * 14) * interval '1 day',
  60,
  10,
  floor(random() * 9)::int,
  30000,
  'OPEN',
  now()
FROM generate_series(1, 10000) AS g;

-- Estadísticas al día, para que el planificador decida con la tabla real.
ANALYZE "Match";
