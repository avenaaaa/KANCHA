import { Router } from 'express';
import { ratingsController } from '../controllers/ratings.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema } from '../schemas/common.schema.js';
import { createRatingSchema } from '../schemas/rating.schema.js';

/** HU-06 (KAN-12) y HU-07 (KAN-13): calificar compañeros y recalcular el honor. */
export const ratingsRouter = Router();

ratingsRouter.post(
  '/matches/:id/ratings',
  authenticate,
  validate(idParamSchema, 'params'),
  validate(createRatingSchema),
  ratingsController.create,
);

ratingsRouter.get(
  '/matches/:id/ratings/pending',
  authenticate,
  validate(idParamSchema, 'params'),
  ratingsController.pending,
);
