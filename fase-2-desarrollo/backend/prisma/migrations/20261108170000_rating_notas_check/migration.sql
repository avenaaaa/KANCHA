-- DEF-02: las notas van de 1 a 5 también en la base, no solo en la validación con Zod (HU-06).
-- Prisma no genera restricciones CHECK; se escriben a mano, como el índice GIST.
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_punctuality_check" CHECK ("punctuality" BETWEEN 1 AND 5);
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_conduct_check" CHECK ("conduct" BETWEEN 1 AND 5);
