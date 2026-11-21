import { z } from 'zod';
import { sportSchema } from './common.schema.js';

const unique = <T>(list: T[]): T[] => [...new Set(list)];

/**
 * Preferencias de avisos (HU-10). Días 0 = domingo … 6 = sábado y horario [fromHour, toHour),
 * ambos en hora de Chile. La base repite los límites de horario y radio con CHECK.
 */
export const preferencesSchema = z
  .object({
    faltaUno: z.boolean(),
    nearby: z.boolean(),
    nudges: z.boolean(),
    sports: z.array(sportSchema).max(3).transform(unique),
    days: z.array(z.number().int().min(0).max(6)).max(7).transform(unique),
    fromHour: z.number().int().min(0).max(23),
    toHour: z.number().int().min(1).max(24),
    radiusKm: z.number().int().min(1).max(20),
    lat: z.number().min(-90).max(90).nullable(),
    lng: z.number().min(-180).max(180).nullable(),
  })
  .refine((v) => v.fromHour < v.toHour, { path: ['toHour'], message: 'El horario debe terminar después de empezar' })
  .refine((v) => (v.lat === null) === (v.lng === null), { path: ['lng'], message: 'Faltan la latitud o la longitud' })
  .refine((v) => !(v.faltaUno || v.nearby || v.nudges) || v.lat !== null, {
    path: ['lat'],
    message: 'Necesitamos tu ubicación para avisarte de partidos cerca',
  })
  .refine((v) => !(v.faltaUno || v.nearby || v.nudges) || v.sports.length > 0, {
    path: ['sports'],
    message: 'Elige al menos un deporte',
  })
  .refine((v) => !v.nearby || v.days.length > 0, { path: ['days'], message: 'Elige al menos un día' });

export type PreferencesInput = z.infer<typeof preferencesSchema>;
