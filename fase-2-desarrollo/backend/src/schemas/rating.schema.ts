import { z } from 'zod';

const nota = z.number().int('La nota debe ser un número entero').min(1, 'La nota mínima es 1').max(5, 'La nota máxima es 5');

/** HU-06: puntualidad y conducta de 1 a 5. La base también lo exige con CHECK (DEF-02). */
export const createRatingSchema = z
  .object({
    ratedId: z.string().uuid('El jugador no es válido'),
    punctuality: nota,
    conduct: nota,
  })
  .strict();

export type CreateRatingInput = z.infer<typeof createRatingSchema>;
