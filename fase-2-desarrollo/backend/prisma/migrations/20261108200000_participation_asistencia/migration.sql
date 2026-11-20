-- KAN-30: el organizador cierra la asistencia de cada confirmado al terminar el partido.
-- null = sin cerrar · true = asistió · false = no se presentó. Se cierra una sola vez.
ALTER TABLE "Participation" ADD COLUMN "attended" BOOLEAN;
