import express, { Router } from 'express';
import { paymentsController } from '../controllers/payments.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema } from '../schemas/common.schema.js';
import { participationIdParamSchema, webpayReturnSchema } from '../schemas/payment.schema.js';

/**
 * HU-08 (KAN-14): pago fraccionado con Transbank Webpay Plus.
 * La página de Webpay y la vuelta no llevan JWT: las abre el navegador, no la app.
 * El pago se identifica por su id (uuid) o por el token que entregó Transbank.
 */
export const paymentsRouter = Router();

paymentsRouter.post(
  '/payments/:participationId/init',
  authenticate,
  validate(participationIdParamSchema, 'params'),
  paymentsController.init,
);

paymentsRouter.get('/payments/:id/webpay', validate(idParamSchema, 'params'), paymentsController.checkout);

paymentsRouter.get('/payments/return', validate(webpayReturnSchema, 'query'), paymentsController.finish);
paymentsRouter.post(
  '/payments/return',
  express.urlencoded({ extended: false }),
  validate(webpayReturnSchema),
  paymentsController.finish,
);
