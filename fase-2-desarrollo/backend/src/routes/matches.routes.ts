import { Router } from 'express';
import { matchesController } from '../controllers/matches.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema } from '../schemas/common.schema.js';
import { createMatchSchema, nearbyQuerySchema } from '../schemas/match.schema.js';

/** HU-03 (KAN-9), HU-04 (KAN-10) y la postulación de HU-05 (KAN-11). */
export const matchesRouter = Router();

matchesRouter.post('/matches', authenticate, validate(createMatchSchema), matchesController.create);
// /nearby va antes de /:id para que Express no lo interprete como un id.
matchesRouter.get('/matches/nearby', authenticate, validate(nearbyQuerySchema, 'query'), matchesController.nearby);
matchesRouter.get('/matches/:id', authenticate, validate(idParamSchema, 'params'), matchesController.detail);
matchesRouter.post('/matches/:id/join', authenticate, validate(idParamSchema, 'params'), matchesController.join);
