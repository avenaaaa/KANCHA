import { z } from 'zod';

/** Orden fijo: Fútbol → Pádel → Básquetbol (DESIGN.md §5). Ninguno es el valor por defecto. */
export const SPORTS = ['FUTBOL', 'PADEL', 'BASQUETBOL'] as const;
export const LEVELS = ['PRINCIPIANTE', 'MEDIO', 'AVANZADO'] as const;

export const sportSchema = z.enum(SPORTS);
export const levelSchema = z.enum(LEVELS);

export type SportValue = z.infer<typeof sportSchema>;
export type LevelValue = z.infer<typeof levelSchema>;

export const idParamSchema = z.object({
  id: z.string().uuid('El identificador no es válido'),
});
