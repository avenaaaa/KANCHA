import { createRequire } from 'node:module';
import type * as Tbk from 'transbank-sdk';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

// transbank-sdk es CommonJS y Node no detecta sus exportaciones con nombre desde ESM.
const { Environment, IntegrationApiKeys, IntegrationCommerceCodes, WebpayPlus } = createRequire(import.meta.url)(
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

function transaction() {
  return isProduction
    ? WebpayPlus.Transaction.buildForProduction(env.TBK_COMMERCE_CODE ?? '', env.TBK_API_KEY ?? '')
    : WebpayPlus.Transaction.buildForIntegration(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY);
}

/** Un fallo de red o de Transbank no es culpa del jugador: 502, y el cupo no cambia. */
async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw new AppError(502, 'PAYMENT_GATEWAY_ERROR', 'Transbank no respondió. Intenta de nuevo en unos minutos.', {
      cause: err instanceof Error ? err.message : String(err),
    });
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
    return call(async () => {
      const r = (await transaction().commit(token)) as {
        status: string;
        response_code: number;
        amount: number;
        buy_order: string;
        authorization_code?: string;
        card_detail?: { card_number?: string };
      };
      return {
        status: r.status,
        responseCode: r.response_code,
        amount: r.amount,
        buyOrder: r.buy_order,
        authorizationCode: r.authorization_code ?? null,
        cardLast4: r.card_detail?.card_number ?? null,
      };
    });
  },
};
