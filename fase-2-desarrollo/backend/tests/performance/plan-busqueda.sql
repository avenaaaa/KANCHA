-- R-03 (docs/04-plan-pruebas.md §7): plan de ejecución de la búsqueda por radio, con los 10.000 partidos
-- sintéticos cargados. Es la misma consulta de match.repository.ts (findNearby) con un origen dentro de
-- La Florida, radio de 5 km y sin filtros. Se espera el índice GIST idx_match_location, no un Seq Scan.
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT m."id",
       ROUND(ST_Distance(m."location", ST_MakePoint(-70.585, -33.5425)::geography))::int AS "distanceM"
FROM "Match" m
JOIN "User" u ON u."id" = m."organizerId"
WHERE m."status" = 'OPEN'
  AND (m."startsAt" AT TIME ZONE 'UTC') > now()
  AND m."filledSlots" < m."totalSlots"
  AND (NULL::text[] IS NULL OR m."sport"::text = ANY(NULL::text[]))
  AND (NULL::text IS NULL OR m."level"::text = NULL::text)
  AND (NULL::int IS NULL OR m."totalSlots" - m."filledSlots" = NULL::int)
  AND ST_DWithin(m."location", ST_MakePoint(-70.585, -33.5425)::geography, 5000)
ORDER BY "distanceM" ASC, m."startsAt" ASC
LIMIT 100;
