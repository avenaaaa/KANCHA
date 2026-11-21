-- KAN-41: "Falta uno" destacado. null = el organizador no lo ha destacado.
ALTER TABLE "Match" ADD COLUMN "prioritizedAt" TIMESTAMP(3);
