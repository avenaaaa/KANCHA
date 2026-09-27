-- Índice espacial para la búsqueda por radio (ST_DWithin).
-- Prisma no genera índices sobre columnas Unsupported, se crea a mano.
CREATE INDEX IF NOT EXISTS idx_match_location ON "Match" USING GIST (location);
