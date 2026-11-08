import { z } from 'zod';

export const participationIdParamSchema = z.object({
  participationId: z.string().uuid('El identificador no es válido'),
});

/**
 * Lo que Transbank envía al volver (por GET o POST): token_ws en el flujo normal,
 * TBK_TOKEN si el jugador anuló y solo TBK_ORDEN_COMPRA si se agotó el tiempo.
 */
export const webpayReturnSchema = z
  .object({
    token_ws: z.string().min(1).max(64).optional(),
    TBK_TOKEN: z.string().min(1).max(64).optional(),
    TBK_ORDEN_COMPRA: z.string().min(1).max(26).optional(),
    TBK_ID_SESION: z.string().max(61).optional(),
  })
  .refine((v) => v.token_ws ?? v.TBK_TOKEN ?? v.TBK_ORDEN_COMPRA, {
    message: 'Falta el token de Webpay',
  });

export type WebpayReturn = z.infer<typeof webpayReturnSchema>;
