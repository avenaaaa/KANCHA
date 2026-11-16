-- KAN-32: el organizador puede rechazar una postulación pendiente.
-- Estado propio (no CANCELLED) para que el jugador sepa que fue un rechazo y no una cancelación suya.
ALTER TYPE "PartStatus" ADD VALUE 'REJECTED';
