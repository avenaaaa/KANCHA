import { createRequire } from 'node:module';
import type * as Tbk from 'transbank-sdk';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { AppError } from '../utils/errors.js';

// transbank-sdk es CommonJS y Node no detecta sus exportaciones con nombre desde ESM.
const { Environment, IntegrationApiKeys, IntegrationCommerceCodes, Options, WebpayPlus } = createRequire(import.meta.url)(
  'transbank-sdk',
) as typeof Tbk;

/**
 * Único punto de contacto con Transbank Webpay Plus (HU-08, HU-09).
 *
 * En el ambiente de Integración el SDK trae sus propias credenciales de prueba
 * (DESARROLLO.md §9). Las pruebas de integración reemplazan este módulo con
 * vi.mock: nunca llaman a Transbank.
 */

export interface WebpayCommit {
  /** AUTHORIZED cuando el banco aprobó; FAILED u otros cuando no. */
  status: string;
  /** 0 = aprobada. Cualquier otro valor es un rechazo. */
  responseCode: number;
  amount: number;
  buyOrder: string;
  authorizationCode: string | null;
  cardLast4: string | null;
}

const isProduction = env.TBK_ENV === 'production';

// 8 s por llamada. El SDK espera 10 minutos por defecto, más que la transacción de base
// (15 s) dentro de la que se reembolsa: Transbank podría responder con ella ya cerrada.
const TIMEOUT_MS = 8_000;

function transaction() {
  return new WebpayPlus.Transaction(
    isProduction
      ? new Options(env.TBK_COMMERCE_CODE ?? '', env.TBK_API_KEY ?? '', Environment.Production, TIMEOUT_MS)
      : new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration, TIMEOUT_MS),
  );
}

interface TbkTransaction {
  status: string;
  response_code?: number;
  amount: number;
  buy_order: string;
  authorization_code?: string;
  card_detail?: { card_number?: string };
}

const toCommit = (r: TbkTransaction): WebpayCommit => ({
  status: r.status,
  // Una transacción que el jugador aún no paga no trae código de respuesta: no está aprobada.
  responseCode: r.response_code ?? -1,
  amount: r.amount,
  buyOrder: r.buy_order,
  authorizationCode: r.authorization_code ?? null,
  cardLast4: r.card_detail?.card_number ?? null,
});

/** Un fallo de red o de Transbank no es culpa del jugador: 502, y el cupo no cambia. */
async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    logger.error({ err }, 'Fallo en la llamada a Transbank');
    throw new AppError(502, 'PAYMENT_GATEWAY_ERROR', 'Transbank no respondió. Intenta de nuevo en unos minutos.');
  }
}

export const webpayRepository = {
  /** Formulario de pago al que se envía el token (POST token_ws). */
  formUrl: `${isProduction ? Environment.Production : Environment.Integration}/webpayserver/initTransaction`,

  create(buyOrder: string, sessionId: string, amount: number, returnUrl: string): Promise<{ token: string }> {
    return call(async () => {
      const r = (await transaction().create(buyOrder, sessionId, amount, returnUrl)) as { token: string };
      return { token: r.token };
    });
  },

  commit(token: string): Promise<WebpayCommit> {
    return call(async () => toCommit((await transaction().commit(token)) as TbkTransaction));
  },

  /** Estado real de una transacción: para no dar por perdido un pago cuya respuesta no llegó. */
  status(token: string): Promise<WebpayCommit> {
    return call(async () => toCommit((await transaction().status(token)) as TbkTransaction));
  },

  /** Reembolso total o parcial (HU-09). El mismo día contable, Transbank lo anula. */
  refund(token: string, amount: number): Promise<{ type: string }> {
    return call(async () => {
      const r = (await transaction().refund(token, amount)) as { type: string };
      return { type: r.type };
    });
  },
};
