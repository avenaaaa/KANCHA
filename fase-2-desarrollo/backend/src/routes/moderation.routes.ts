import { Router } from 'express';
import { moderationController } from '../controllers/moderation.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema } from '../schemas/common.schema.js';
import { createReportSchema, reportsQuerySchema, resolveReportSchema } from '../schemas/moderation.schema.js';

/** HU-11 (KAN-17): reportes de conducta y su moderación. El rol de administrador lo exige el servicio. */
export const moderationRouter = Router();

moderationRouter.post(
  '/matches/:id/reports',
  authenticate,
  validate(idParamSchema, 'params'),
  validate(createReportSchema),
  moderationController.report,
);

moderationRouter.get('/admin/reports', authenticate, validate(reportsQuerySchema, 'query'), moderationController.list);
moderationRouter.get('/admin/reports/:id', authenticate, validate(idParamSchema, 'params'), moderationController.detail);
moderationRouter.patch(
  '/admin/reports/:id',
  authenticate,
  validate(idParamSchema, 'params'),
  validate(resolveReportSchema),
  moderationController.resolve,
);
