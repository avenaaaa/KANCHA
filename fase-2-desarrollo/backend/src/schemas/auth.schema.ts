import { z } from 'zod';
import { sportSchema } from './common.schema.js';

/** HU-01 — Registro de agente libre (KAN-7). */
export const registerSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('Ingresa un correo válido'),
    // bcrypt solo considera los primeros 72 bytes: por eso el máximo.
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .max(72, 'La contraseña no puede superar los 72 caracteres'),
    name: z
      .string()
      .trim()
      .min(2, 'Ingresa tu nombre')
      .max(60, 'El nombre no puede superar los 60 caracteres'),
    favoriteSport: sportSchema,
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('Ingresa un correo válido'),
    password: z.string().min(1, 'Ingresa tu contraseña'),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
