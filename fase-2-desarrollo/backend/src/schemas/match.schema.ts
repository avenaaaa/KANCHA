import { z } from 'zod';
import { levelSchema, sportSchema } from './common.schema.js';

/**
 * HU-03 — Publicar partido con cupos incompletos (KAN-9).
 *
 * filledSlots son los jugadores que el organizador ya tiene, contándose a sí mismo.
 * La regla "la fecha no puede estar en el pasado" vive en match.service, no aquí,
 * porque depende del reloj y así se prueba sin HTTP.
 */
export const createMatchSchema = z
  .object({
    title: z.string().trim().min(3, 'El título es muy corto').max(80),
    sport: sportSchema,
    level: levelSchema.default('MEDIO'),
    venueName: z.string().trim().min(2, 'Indica el nombre de la cancha').max(80),
    address: z.string().trim().min(3, 'Indica la dirección').max(160),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    startsAt: z.coerce.date({ invalid_type_error: 'La fecha no es válida' }),
    durationMin: z.number().int().min(30).max(240).default(60),
    totalSlots: z.number().int().min(2, 'Un partido necesita al menos 2 jugadores').max(30),
    filledSlots: z.number().int().min(1, 'Cuéntate a ti mismo: al menos 1 jugador').max(29),
    // CLP como entero. 0 = partido gratuito (por ejemplo, una multicancha municipal).
    totalCost: z.number().int().min(0).max(1_000_000).default(0),
  })
  .strict()
  .refine((m) => m.filledSlots < m.totalSlots, {
    path: ['filledSlots'],
    message: 'Debe quedar al menos un cupo libre para publicar el partido',
  });

export type CreateMatchInput = z.infer<typeof createMatchSchema>;

/** "FUTBOL,PADEL" → ['FUTBOL', 'PADEL']. Vacío o ausente = los tres deportes. */
const sportList = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() !== '' ? v.split(',').map((s) => s.trim()) : undefined),
  z.array(sportSchema).min(1).optional(),
);

/** HU-04 — Buscar partidos cercanos en el mapa (KAN-10). */
export const nearbyQuerySchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    radius: z.coerce.number().int().min(500).max(20_000).default(5_000),
    sport: sportList,
    level: levelSchema.optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    path: ['to'],
    message: 'El rango de horario no es válido',
  });

export type NearbyQuery = z.infer<typeof nearbyQuerySchema>;
