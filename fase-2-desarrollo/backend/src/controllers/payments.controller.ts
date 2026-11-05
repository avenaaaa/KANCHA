import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import * as paymentService from '../services/payment.service.js';
import { requireUserId } from '../middlewares/auth.js';
import { checkoutPage, resultPage } from '../views/payment.view.js';
import type { WebpayReturn } from '../schemas/payment.schema.js';

export const paymentsController = {
  /** POST /payments/:participationId/init (HU-08). */
  async init(req: Request, res: Response): Promise<void> {
    const { participationId } = req.params as { participationId: string };
    // Transbank devuelve al navegador del jugador: debe ser la misma dirección por la que llegó la app.
    const returnUrl = env.TBK_RETURN_URL ?? `${req.protocol}://${req.get('host') ?? ''}/api/v1/payments/return`;
    const started = await paymentService.startPayment(participationId, requireUserId(req), returnUrl);
    res.status(201).json({ ...started, checkoutPath: `/payments/${started.paymentId}/webpay` });
  },

  /** GET /payments/:id/webpay: la app abre esta página en el navegador y ella lleva a Webpay. */
  async checkout(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    const form = await paymentService.getCheckoutForm(id);
    const nonce = randomBytes(16).toString('base64');
    res
      .set(
        'Content-Security-Policy',
        `default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; form-action ${new URL(form.formUrl).origin}`,
      )
      .type('html')
      .send(checkoutPage(form.formUrl, form.token, form.amount, nonce));
  },

  /** GET|POST /payments/return: Transbank devuelve al jugador aquí. */
  async finish(req: Request, res: Response): Promise<void> {
    const input = (req.method === 'GET' ? req.query : req.body) as WebpayReturn;
    const result = await paymentService.finishPayment(input);
    res
      .set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'")
      .type('html')
      .send(resultPage(result));
  },
};
