import { Router } from 'express';
import { participationsController } from '../controllers/participations.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema } from '../schemas/common.schema.js';

/** HU-05 (KAN-11): el organizador aprueba una postulación. */
export const participationsRouter = Router();

participationsRouter.patch(
  '/participations/:id/approve',
  authenticate,
  validate(idParamSchema, 'params'),
  participationsController.approve,
);
