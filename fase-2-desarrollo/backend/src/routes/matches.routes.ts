import { Router } from 'express';
import { matchesController } from '../controllers/matches.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { publishLimiter } from '../middlewares/rateLimit.js';
import { requireActiveAccount } from '../middlewares/suspension.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema } from '../schemas/common.schema.js';
import { createMatchSchema, nearbyQuerySchema } from '../schemas/match.schema.js';

/** HU-03 (KAN-9), HU-04 (KAN-10) y la postulación de HU-05 (KAN-11). */
export const matchesRouter = Router();

// HU-11: suspendido no publica, no postula ni destaca.
matchesRouter.post('/matches', authenticate, requireActiveAccount, publishLimiter, validate(createMatchSchema), matchesController.create);
// /nearby va antes de /:id para que Express no lo interprete como un id.
matchesRouter.get('/matches/nearby', authenticate, validate(nearbyQuerySchema, 'query'), matchesController.nearby);
matchesRouter.get('/matches/:id', authenticate, validate(idParamSchema, 'params'), matchesController.detail);
matchesRouter.post('/matches/:id/join', authenticate, requireActiveAccount, validate(idParamSchema, 'params'), matchesController.join);
matchesRouter.patch(
  '/matches/:id/priority',
  authenticate,
  requireActiveAccount,
  validate(idParamSchema, 'params'),
  matchesController.prioritize,
);
