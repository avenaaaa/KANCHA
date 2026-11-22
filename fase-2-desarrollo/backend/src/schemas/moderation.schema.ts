import { z } from 'zod';

/** HU-11 (KAN-17): moderación de reportes de conducta. */
export const REPORT_REASONS = ['AGRESION', 'LENGUAJE', 'JUEGO_SUCIO', 'OTRO'] as const;
export const REPORT_STATUSES = ['PENDING', 'SANCTIONED', 'DISMISSED'] as const;

const note = z.string().trim().max(280, 'El comentario no puede superar los 280 caracteres');

/** Un jugador reporta a un compañero del partido. La base también limita el comentario (CHECK). */
export const createReportSchema = z
  .object({
    reportedId: z.string().uuid('El jugador no es válido'),
    reason: z.enum(REPORT_REASONS),
    comment: note.optional(),
  })
  .strict();
export type CreateReportInput = z.infer<typeof createReportSchema>;

/** Panel del administrador: los pendientes por defecto. */
export const reportsQuerySchema = z.object({ status: z.enum(REPORT_STATUSES).default('PENDING') }).strict();
export type ReportsQuery = z.infer<typeof reportsQuerySchema>;

/** El administrador suspende 7 días o descarta, con una nota opcional que queda en el registro. */
export const resolveReportSchema = z
  .object({
    action: z.enum(['SANCTION', 'DISMISS']),
    note: note.optional(),
  })
  .strict();
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;
